// Vehicle physics controller using simplified bicycle model

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { InputState, VehicleState, Vec3 } from '../types';
import { clamp, lerp } from '../utils/math';

export class VehicleController {
  private rigidBody: RAPIER.RigidBody;
  private mesh: THREE.Group;
  private vehicleState: VehicleState;
  private steeringWheel: THREE.Object3D | null = null;
  private wheels: THREE.Object3D[] = [];
  
  // Vehicle parameters
  private readonly mass = 1200; // kg
  private readonly wheelBase = 2.5; // meters
  private readonly maxSteerAngle = 0.5; // radians (~28 degrees)
  private readonly maxSpeed = 200; // km/h
  private readonly acceleration = 25; // m/s^2
  private readonly brakeForce = 40; // m/s^2 deceleration
  private readonly dragCoefficient = 0.4;
  private readonly lateralGrip = 0.95; // 0-1, how much lateral sliding
  private currentSteerAngle = 0;

  constructor(rigidBody: RAPIER.RigidBody, scene: THREE.Scene) {
    this.rigidBody = rigidBody;
    this.vehicleState = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: 0,
      speed: 0,
      gear: 1,
      rpm: 800,
    };

    // Lock rotation on X and Z axes (prevent flipping)
    this.rigidBody.setEnabledRotations(false, true, false, true);

    // Create vehicle mesh
    this.mesh = this.createVehicleMesh();
    scene.add(this.mesh);
    
    // Load steering wheel and tire assets
    this.loadAssets();
  }

  private createVehicleMesh(): THREE.Group {
    const group = new THREE.Group();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff4444,
      metalness: 0.6,
      roughness: 0.4,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    // Car roof
    const roofGeometry = new THREE.BoxGeometry(1.8, 0.8, 2.5);
    const roof = new THREE.Mesh(roofGeometry, bodyMaterial);
    roof.position.set(0, 1.4, -0.3);
    roof.castShadow = true;
    group.add(roof);

    // Windshield
    const windshieldGeometry = new THREE.BoxGeometry(1.7, 0.6, 0.1);
    const windshieldMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3,
      metalness: 0.9,
      roughness: 0.1,
    });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0, 1.5, 0.9);
    windshield.rotation.x = -0.3;
    group.add(windshield);

    // Placeholder wheels (will be replaced by GLB models)
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      roughness: 0.9,
    });

    const wheelPositions = [
      { x: -1, z: 1.3 },  // front left
      { x: 1, z: 1.3 },   // front right
      { x: -1, z: -1.3 }, // rear left
      { x: 1, z: -1.3 },  // rear right
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, 0.4, pos.z);
      wheel.castShadow = true;
      wheel.userData.isFrontWheel = pos.z > 0;
      this.wheels.push(wheel);
      group.add(wheel);
    });

    return group;
  }

  private async loadAssets(): Promise<void> {
    const loader = new GLTFLoader();
    
    // Load steering wheel
    try {
      const gltf = await loader.loadAsync('/assets/steering_wheel_l505.glb');
      
      // Create a container for the steering wheel to fix pivot point
      const steeringWheelContainer = new THREE.Group();
      
      const wheelModel = gltf.scene;
      wheelModel.scale.setScalar(1.9);
      wheelModel.rotation.x = -0.3;
      
      // Add the model to the container (this centers the pivot)
      steeringWheelContainer.add(wheelModel);
      
      // Position the container (driver's side, left)
      steeringWheelContainer.position.set(-0.5, 1, 1);
      
      this.steeringWheel = steeringWheelContainer;
      this.mesh.add(this.steeringWheel);
    } catch (error) {
      console.warn('Could not load steering wheel asset:', error);
    }

    // Load wheel models
    try {
      const wheelGltf = await loader.loadAsync('/assets/wheel.glb');
      
      // Replace placeholder wheels with loaded models
      this.wheels.forEach((placeholderWheel, index) => {
        // Create a container for the wheel to handle rotation properly
        const wheelContainer = new THREE.Group();
        
        const wheelModel = wheelGltf.scene.clone();
        wheelModel.scale.setScalar(0.004); // Even smaller scale for realistic size
        
        // Try different orientations - the wheel model might be oriented differently
        // Rotate 90 degrees on X to make it face sideways (typical for car wheels)
        wheelModel.rotation.x = 0;
        wheelModel.rotation.y = Math.PI/2;
        
        // If wheel is on the right side, flip it 180 degrees
        if (placeholderWheel.position.x > 0) {
          wheelModel.rotation.y = Math.PI * 3/2;
        }
        
        wheelContainer.add(wheelModel);
        wheelContainer.position.copy(placeholderWheel.position);
        wheelContainer.userData.isFrontWheel = placeholderWheel.userData.isFrontWheel;
        wheelContainer.userData.wheelModel = wheelModel; // Store reference to actual model
        wheelContainer.castShadow = true;
        
        this.mesh.remove(placeholderWheel);
        this.mesh.add(wheelContainer);
        this.wheels[index] = wheelContainer;
      });
    } catch (error) {
      console.warn('Could not load wheel assets:', error);
    }
  }

  public update(input: InputState, deltaTime: number): void {
    // Get current state
    const velocity = this.rigidBody.linvel();
    const position = this.rigidBody.translation();
    const rotation = this.rigidBody.rotation();

    // Calculate heading
    const quat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const euler = new THREE.Euler().setFromQuaternion(quat);
    const heading = euler.y;

    // Forward and right vectors
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);

    // Current velocity vector and speed (with direction)
    const velocityVec = new THREE.Vector3(velocity.x, 0, velocity.z);
    
    // Calculate signed speed (positive = forward, negative = backward)
    const forwardSpeed = velocityVec.dot(forward);
    const speedMs = Math.abs(forwardSpeed);
    const speedKmh = speedMs * 3.6;

    // Smooth steering
    const targetSteerAngle = input.steer * this.maxSteerAngle;
    this.currentSteerAngle = lerp(this.currentSteerAngle, targetSteerAngle, 0.15);

    // Calculate desired speed based on input (can be negative for reverse)
    let targetSpeed = forwardSpeed;

    if (input.throttle > 0 && input.brake === 0) {
      // Accelerate forward
      const absSpeedKmh = Math.abs(targetSpeed) * 3.6;
      const speedLimitFactor = Math.max(0, 1 - absSpeedKmh / this.maxSpeed);
      targetSpeed += this.acceleration * input.throttle * speedLimitFactor * deltaTime;
    } else if (input.brake > 0 && input.throttle === 0) {
      // Brake or reverse
      if (targetSpeed > 0.5) {
        // Braking while moving forward
        targetSpeed -= this.brakeForce * input.brake * deltaTime;
        targetSpeed = Math.max(0, targetSpeed);
      } else if (targetSpeed < -0.5) {
        // Braking while moving backward
        targetSpeed += this.brakeForce * input.brake * deltaTime;
        targetSpeed = Math.min(0, targetSpeed);
      } else {
        // Stopped or very slow - go into reverse
        targetSpeed -= this.acceleration * 0.4 * input.brake * deltaTime;
        targetSpeed = Math.max(-15, targetSpeed); // Max reverse speed
      }
    } else if (input.throttle === 0 && input.brake === 0) {
      // Coasting - slow down naturally
      if (Math.abs(targetSpeed) > 0.1) {
        const dragDecel = this.dragCoefficient * targetSpeed * Math.abs(targetSpeed) * deltaTime;
        if (targetSpeed > 0) {
          targetSpeed = Math.max(0, targetSpeed - dragDecel);
        } else {
          targetSpeed = Math.min(0, targetSpeed - dragDecel);
        }
      } else {
        targetSpeed = 0;
      }
    }

    // Handbrake
    if (input.handbrake) {
      targetSpeed *= 0.9;
    }

    // Calculate turning (works in both forward and reverse)
    let angularVelocity = 0;
    if (Math.abs(this.currentSteerAngle) > 0.01 && Math.abs(targetSpeed) > 0.1) {
      // Use bicycle model for turning
      const effectiveWheelbase = this.wheelBase;
      const turnRadius = effectiveWheelbase / Math.tan(Math.abs(this.currentSteerAngle));
      
      // Angular velocity based on speed and turn radius
      angularVelocity = (Math.abs(targetSpeed) / turnRadius) * Math.sign(this.currentSteerAngle);
      
      // Reverse the steering when going backwards
      if (targetSpeed < 0) {
        angularVelocity = -angularVelocity;
      }
      
      // Limit angular velocity for stability
      angularVelocity = clamp(angularVelocity, -2, 2);
    }

    // Set angular velocity directly for more responsive turning
    this.rigidBody.setAngvel({ x: 0, y: angularVelocity, z: 0 }, true);

    // Calculate new velocity direction
    const newHeading = heading + angularVelocity * deltaTime;
    const newForward = new THREE.Vector3(
      Math.sin(newHeading),
      0,
      Math.cos(newHeading)
    );

    // Apply lateral grip (reduce sliding)
    const forwardVel = velocityVec.dot(forward);
    const lateralVel = velocityVec.dot(right);
    
    // New velocity with grip
    const desiredVelocity = new THREE.Vector3();
    desiredVelocity.addScaledVector(newForward, targetSpeed);
    desiredVelocity.addScaledVector(right, lateralVel * (1 - this.lateralGrip));

    // Set velocity
    this.rigidBody.setLinvel({
      x: desiredVelocity.x,
      y: velocity.y,
      z: desiredVelocity.z
    }, true);

    // Update visual mesh
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

    // Animate wheels (pass signed speed for proper rotation direction)
    this.animateWheels(targetSpeed, deltaTime);

    // Update vehicle state (use signed speed for gear calculation)
    const signedSpeedKmh = targetSpeed * 3.6;
    this.vehicleState = {
      position: { x: position.x, y: position.y, z: position.z },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      rotation: heading,
      speed: signedSpeedKmh,
      gear: this.calculateGear(signedSpeedKmh),
      rpm: this.calculateRPM(Math.abs(signedSpeedKmh)),
    };
  }

  private animateWheels(speed: number, deltaTime: number): void {
    const wheelRadius = 0.4;
    const rotationSpeed = speed / wheelRadius;

    this.wheels.forEach((wheelContainer) => {
      // Front wheels: apply steering by rotating the container
      if (wheelContainer.userData.isFrontWheel) {
        wheelContainer.rotation.y = this.currentSteerAngle;
      }
      
      // Roll rotation - rotate the container around Z-axis
      // Negative because wheels roll opposite to direction of travel
      wheelContainer.rotation.x += rotationSpeed * deltaTime;
    });

    // Animate steering wheel (rotate the container around Z-axis)
    if (this.steeringWheel) {
      const maxSteeringWheelRotation = Math.PI * 2.5; // 2.5 full rotations lock-to-lock
      // Rotate the container, not the model inside (this uses the container's centered pivot)
      this.steeringWheel.rotation.z = this.currentSteerAngle * (maxSteeringWheelRotation / this.maxSteerAngle);
    }
  }

  private calculateGear(speedKmh: number): number {
    if (speedKmh < 0) return -1; // Reverse
    if (speedKmh < 20) return 1;
    if (speedKmh < 40) return 2;
    if (speedKmh < 60) return 3;
    if (speedKmh < 80) return 4;
    return 5;
  }

  private calculateRPM(speedKmh: number): number {
    const gear = this.calculateGear(speedKmh);
    const gearRatios = [0, 3.5, 2.0, 1.4, 1.0, 0.8];
    const ratio = gearRatios[gear];
    const rpm = 800 + (speedKmh * ratio * 30);
    return clamp(rpm, 800, 6500);
  }

  public getState(): VehicleState {
    return { ...this.vehicleState };
  }

  public getPosition(): Vec3 {
    return this.vehicleState.position;
  }

  public getMesh(): THREE.Group {
    return this.mesh;
  }

  public dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

