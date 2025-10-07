// Clean vehicle controller with proper asset management

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { InputState } from '../types';
import { VehiclePhysics } from './vehicle-physics';

export class VehicleControllerV2 {
  private physics: VehiclePhysics;
  private mesh: THREE.Group;
  
  // Visual elements
  private steeringWheelContainer: THREE.Group | null = null;
  private wheels: THREE.Group[] = [];

  constructor(rigidBody: RAPIER.RigidBody, scene: THREE.Scene) {
    this.physics = new VehiclePhysics(rigidBody);
    this.mesh = this.createVehicleMesh();
    scene.add(this.mesh);
    
    // Load assets asynchronously
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

    // Placeholder wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      roughness: 0.9,
    });

    const wheelPositions = [
      { x: -1, z: 1.3, isFront: true },  // front left
      { x: 1, z: 1.3, isFront: true },   // front right
      { x: -1, z: -1.3, isFront: false }, // rear left
      { x: 1, z: -1.3, isFront: false },  // rear right
    ];

    wheelPositions.forEach(pos => {
      const wheelContainer = new THREE.Group();
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      
      wheelContainer.add(wheel);
      wheelContainer.position.set(pos.x, 0.4, pos.z);
      wheelContainer.userData.isFrontWheel = pos.isFront;
      
      this.wheels.push(wheelContainer);
      group.add(wheelContainer);
    });

    return group;
  }

  private async loadAssets(): Promise<void> {
    const loader = new GLTFLoader();
    
    // Load steering wheel
    try {
      const gltf = await loader.loadAsync('/assets/steering_wheel_l505.glb');
      
      // Create container for proper pivot point
      this.steeringWheelContainer = new THREE.Group();
      const wheelModel = gltf.scene;
      
      wheelModel.scale.setScalar(1.9);
      wheelModel.rotation.x = -0.3;
      
      // Center the model in the container
      this.steeringWheelContainer.add(wheelModel);
      
      // Position container (right-hand drive)
      this.steeringWheelContainer.position.set(0.5, 1, 1);
      
      this.mesh.add(this.steeringWheelContainer);
      console.log('Steering wheel loaded');
    } catch (error) {
      console.warn('Could not load steering wheel:', error);
    }

    // Load wheel models
    try {
      const wheelGltf = await loader.loadAsync('/assets/wheel.glb');
      
      this.wheels.forEach((wheelContainer, index) => {
        // Get the placeholder
        const placeholder = wheelContainer.children[0];
        
        // Create new wheel model
        const wheelModel = wheelGltf.scene.clone();
        wheelModel.scale.setScalar(0.004);
        
        // Set wheel orientation based on experimentation
        wheelModel.rotation.set(0, Math.PI / 2, 0);
        
        // Flip right-side wheels
        if (wheelContainer.position.x > 0) {
          wheelModel.rotation.y = Math.PI * 3 / 2;
        }
        
        // Replace placeholder with model
        wheelContainer.remove(placeholder);
        wheelContainer.add(wheelModel);
      });
      
      console.log('Wheels loaded');
    } catch (error) {
      console.warn('Could not load wheels:', error);
    }
  }

  public update(input: InputState, deltaTime: number): void {
    // Update physics
    this.physics.update(input, deltaTime);
    
    // Get state
    const state = this.physics.getState();
    const steerAngle = this.physics.getSteerAngle();

    // Update visual mesh position
    this.mesh.position.set(state.position.x, state.position.y, state.position.z);
    this.mesh.rotation.y = state.rotation;

    // Animate wheels
    this.animateWheels(state.speed / 3.6, steerAngle, deltaTime);
  }

  private animateWheels(speedMs: number, steerAngle: number, deltaTime: number): void {
    const wheelRadius = 0.4;
    const rotationSpeed = speedMs / wheelRadius;

    this.wheels.forEach((wheelContainer) => {
      // Steering for front wheels
      if (wheelContainer.userData.isFrontWheel) {
        wheelContainer.rotation.y = steerAngle;
      }
      
      // Rolling
      wheelContainer.rotation.x += rotationSpeed * deltaTime;
    });

    // Animate steering wheel
    if (this.steeringWheelContainer) {
      const maxRotation = Math.PI * 2.5; // 2.5 full rotations lock-to-lock
      this.steeringWheelContainer.rotation.z = steerAngle * (maxRotation / 0.5);
    }
  }

  public getState() {
    return this.physics.getState();
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

