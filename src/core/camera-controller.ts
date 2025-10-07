// Camera controller that follows the vehicle

import * as THREE from 'three';
import type { Vec3 } from '../types';
import { lerp } from '../utils/math';

export type CameraMode = 'third-person' | 'first-person';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private mode: CameraMode = 'third-person';
  
  // Third-person settings
  private thirdPersonOffset: Vec3 = { x: 0, y: 6, z: -12 };
  private lookAtOffset: Vec3 = { x: 0, y: 1, z: 3 };
  private smoothness: number = 0.1;
  
  // First-person settings (driver's seat is on the left side)
  private firstPersonOffset: Vec3 = { x: -0.5, y: 1.5, z: 0.3 }; // Driver's eye position (left side)
  private firstPersonSmoothness: number = 0.8; // Much more responsive (was 0.2)

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public update(targetPosition: Vec3, targetRotation: number): void {
    if (this.mode === 'first-person') {
      this.updateFirstPerson(targetPosition, targetRotation);
    } else {
      this.updateThirdPerson(targetPosition, targetRotation);
    }
  }

  private updateThirdPerson(targetPosition: Vec3, targetRotation: number): void {
    // Calculate desired camera position based on vehicle rotation
    const cos = Math.cos(targetRotation);
    const sin = Math.sin(targetRotation);

    // Rotate offset by vehicle rotation
    const rotatedOffsetX = this.thirdPersonOffset.x * cos - this.thirdPersonOffset.z * sin;
    const rotatedOffsetZ = this.thirdPersonOffset.x * sin + this.thirdPersonOffset.z * cos;

    const desiredX = targetPosition.x + rotatedOffsetX;
    const desiredY = targetPosition.y + this.thirdPersonOffset.y;
    const desiredZ = targetPosition.z + rotatedOffsetZ;

    // Smoothly move camera
    this.camera.position.x = lerp(this.camera.position.x, desiredX, this.smoothness);
    this.camera.position.y = lerp(this.camera.position.y, desiredY, this.smoothness);
    this.camera.position.z = lerp(this.camera.position.z, desiredZ, this.smoothness);

    // Calculate look-at position
    const lookAtX = targetPosition.x + this.lookAtOffset.x * sin;
    const lookAtY = targetPosition.y + this.lookAtOffset.y;
    const lookAtZ = targetPosition.z + this.lookAtOffset.z * cos;

    this.camera.lookAt(lookAtX, lookAtY, lookAtZ);
  }

  private updateFirstPerson(targetPosition: Vec3, targetRotation: number): void {
    // Calculate camera position at driver's seat
    const cos = Math.cos(targetRotation);
    const sin = Math.sin(targetRotation);

    // Rotate first-person offset by vehicle rotation
    const rotatedOffsetX = this.firstPersonOffset.x * cos - this.firstPersonOffset.z * sin;
    const rotatedOffsetZ = this.firstPersonOffset.x * sin + this.firstPersonOffset.z * cos;

    const desiredX = targetPosition.x + rotatedOffsetX;
    const desiredY = targetPosition.y + this.firstPersonOffset.y;
    const desiredZ = targetPosition.z + rotatedOffsetZ;

    // Smooth camera movement (less smooth for more responsive FP view)
    this.camera.position.x = lerp(this.camera.position.x, desiredX, this.firstPersonSmoothness);
    this.camera.position.y = lerp(this.camera.position.y, desiredY, this.firstPersonSmoothness);
    this.camera.position.z = lerp(this.camera.position.z, desiredZ, this.firstPersonSmoothness);

    // Look forward from vehicle
    const lookDistance = 50;
    const lookAtX = targetPosition.x + lookDistance * sin;
    const lookAtY = targetPosition.y + this.firstPersonOffset.y;
    const lookAtZ = targetPosition.z + lookDistance * cos;

    this.camera.lookAt(lookAtX, lookAtY, lookAtZ);
  }

  public toggleMode(): CameraMode {
    this.mode = this.mode === 'third-person' ? 'first-person' : 'third-person';
    console.log(`Camera mode: ${this.mode}`);
    return this.mode;
  }

  public getMode(): CameraMode {
    return this.mode;
  }

  public setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  public setThirdPersonOffset(offset: Vec3): void {
    this.thirdPersonOffset = offset;
  }

  public setSmoothness(smoothness: number): void {
    this.smoothness = smoothness;
  }
}

