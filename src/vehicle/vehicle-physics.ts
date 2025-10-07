// Clean vehicle physics implementation

import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { InputState, VehicleState } from '../types';

export class VehiclePhysics {
  private rigidBody: RAPIER.RigidBody;
  
  // Vehicle parameters
  private readonly maxSpeed = 55; // m/s (~200 km/h)
  private readonly maxReverseSpeed = 15; // m/s (~54 km/h)
  private readonly acceleration = 20; // m/s²
  private readonly brakeForce = 35; // m/s²
  private readonly reverseAcceleration = 8; // m/s² (slower reverse)
  
  // Steering
  private readonly maxSteerAngle = 0.5; // radians
  private readonly steerSpeed = 0.15; // How fast steering responds
  private currentSteerAngle = 0;
  
  // Physics
  private readonly wheelBase = 2.5; // meters
  private readonly dragCoefficient = 0.35;
  private readonly lateralGrip = 0.95;
  
  // State
  private vehicleState: VehicleState;

  constructor(rigidBody: RAPIER.RigidBody) {
    this.rigidBody = rigidBody;
    
    // Lock X and Z rotation (prevent flipping)
    this.rigidBody.setEnabledRotations(false, true, false, true);
    
    this.vehicleState = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: 0,
      speed: 0,
      gear: 1,
      rpm: 800,
    };
  }

  public update(input: InputState, deltaTime: number): void {
    // Get current physics state
    const velocity = this.rigidBody.linvel();
    const position = this.rigidBody.translation();
    const rotation = this.rigidBody.rotation();

    // Calculate heading and direction vectors
    const quat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const euler = new THREE.Euler().setFromQuaternion(quat);
    const heading = euler.y;

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    
    // Calculate signed forward speed
    const velocityVec = new THREE.Vector3(velocity.x, 0, velocity.z);
    const forwardSpeed = velocityVec.dot(forward); // Positive = forward, negative = reverse
    
    // Update steering with smooth interpolation
    const targetSteer = input.steer * this.maxSteerAngle;
    this.currentSteerAngle += (targetSteer - this.currentSteerAngle) * this.steerSpeed;

    // Calculate target speed based on input
    let targetSpeed = forwardSpeed;
    
    // Acceleration logic
    if (input.throttle > 0 && input.brake === 0) {
      // Forward acceleration
      const speedRatio = Math.abs(forwardSpeed) / this.maxSpeed;
      const accelFactor = Math.max(0, 1 - speedRatio);
      targetSpeed += this.acceleration * input.throttle * accelFactor * deltaTime;
      targetSpeed = Math.min(targetSpeed, this.maxSpeed);
    } else if (input.brake > 0 && input.throttle === 0) {
      // Braking or reverse
      if (forwardSpeed > 0.5) {
        // Braking while moving forward
        targetSpeed -= this.brakeForce * input.brake * deltaTime;
        targetSpeed = Math.max(0, targetSpeed);
      } else if (forwardSpeed < -0.5) {
        // Braking while moving backward
        targetSpeed += this.brakeForce * input.brake * deltaTime;
        targetSpeed = Math.min(0, targetSpeed);
      } else {
        // Reversing (stopped or slow)
        targetSpeed -= this.reverseAcceleration * input.brake * deltaTime;
        targetSpeed = Math.max(-this.maxReverseSpeed, targetSpeed);
      }
    } else {
      // Coasting - apply drag
      if (Math.abs(targetSpeed) > 0.05) {
        const dragForce = this.dragCoefficient * targetSpeed * Math.abs(targetSpeed) * deltaTime;
        if (targetSpeed > 0) {
          targetSpeed = Math.max(0, targetSpeed - dragForce);
        } else {
          targetSpeed = Math.min(0, targetSpeed - dragForce);
        }
      } else {
        targetSpeed = 0;
      }
    }

    // Handbrake
    if (input.handbrake) {
      targetSpeed *= 0.85;
    }

    // Calculate turning
    let angularVelocity = 0;
    if (Math.abs(this.currentSteerAngle) > 0.01 && Math.abs(targetSpeed) > 0.1) {
      const turnRadius = this.wheelBase / Math.tan(Math.abs(this.currentSteerAngle));
      angularVelocity = (Math.abs(targetSpeed) / turnRadius) * Math.sign(this.currentSteerAngle);
      
      // Reverse steering when going backwards
      if (targetSpeed < 0) {
        angularVelocity = -angularVelocity;
      }
      
      // Limit for stability
      angularVelocity = Math.max(-2.5, Math.min(2.5, angularVelocity));
    }

    // Apply angular velocity
    this.rigidBody.setAngvel({ x: 0, y: angularVelocity, z: 0 }, true);

    // Calculate new velocity with lateral grip
    const newHeading = heading + angularVelocity * deltaTime;
    const newForward = new THREE.Vector3(Math.sin(newHeading), 0, Math.cos(newHeading));
    
    const lateralSpeed = velocityVec.dot(right);
    const desiredVelocity = new THREE.Vector3();
    desiredVelocity.addScaledVector(newForward, targetSpeed);
    desiredVelocity.addScaledVector(right, lateralSpeed * (1 - this.lateralGrip));

    // Apply velocity
    this.rigidBody.setLinvel({
      x: desiredVelocity.x,
      y: velocity.y,
      z: desiredVelocity.z
    }, true);

    // Update state
    const speedKmh = targetSpeed * 3.6;
    this.vehicleState = {
      position: { x: position.x, y: position.y, z: position.z },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      rotation: heading,
      speed: speedKmh,
      gear: this.calculateGear(speedKmh),
      rpm: this.calculateRPM(speedKmh),
    };
  }

  private calculateGear(speedKmh: number): number {
    const absSpeed = Math.abs(speedKmh);
    
    if (speedKmh < -2) return -1; // Reverse
    if (absSpeed < 20) return 1;
    if (absSpeed < 45) return 2;
    if (absSpeed < 75) return 3;
    if (absSpeed < 110) return 4;
    if (absSpeed < 150) return 5;
    return 6;
  }

  private calculateRPM(speedKmh: number): number {
    const gear = this.calculateGear(speedKmh);
    const absSpeed = Math.abs(speedKmh);
    
    if (gear === -1) {
      return 800 + absSpeed * 50;
    }
    
    const gearRatios = [0, 4.5, 3.0, 2.0, 1.5, 1.2, 1.0];
    const ratio = gearRatios[gear] || 1.0;
    const rpm = 800 + (absSpeed * ratio * 25);
    
    return Math.max(800, Math.min(6500, rpm));
  }

  public getState(): VehicleState {
    return { ...this.vehicleState };
  }

  public getSteerAngle(): number {
    return this.currentSteerAngle;
  }
}

