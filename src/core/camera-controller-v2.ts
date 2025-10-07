// Improved camera controller with multiple view modes

import * as THREE from 'three';
import type { Vec3 } from '../types';

export type CameraMode = 'third-person' | 'birds-eye' | 'first-person' | 'free';

interface CameraSettings {
  offset: Vec3;
  lookAtOffset: Vec3;
  smoothness: number;
  fov?: number;
}

export class CameraControllerV2 {
  private camera: THREE.PerspectiveCamera;
  private mode: CameraMode = 'third-person';
  
  private settings: Record<CameraMode, CameraSettings> = {
    'third-person': {
      offset: { x: 0, y: 6, z: -12 },
      lookAtOffset: { x: 0, y: 1, z: 3 },
      smoothness: 0.12,
      fov: 75,
    },
    'birds-eye': {
      offset: { x: 0, y: 25, z: -5 },
      lookAtOffset: { x: 0, y: 0, z: 5 },
      smoothness: 0.08,
      fov: 60,
    },
    'first-person': {
      offset: { x: 0.5, y: 1.4, z: 0.3 }, // Right-hand drive
      lookAtOffset: { x: 0, y: 0, z: 50 },
      smoothness: 1.0, // Instant follow, no lag
      fov: 80,
    },
    'free': {
      offset: { x: 0, y: 8, z: -15 },
      lookAtOffset: { x: 0, y: 2, z: 0 },
      smoothness: 0.05,
      fov: 75,
    },
  };

  // Free camera controls
  private freeCameraRotation = { x: 0, y: 0 };
  private freeCameraDistance = 15;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public update(vehiclePosition: Vec3, vehicleRotation: number, deltaTime: number): void {
    const settings = this.settings[this.mode];
    
    // Update FOV if it changed
    if (settings.fov && this.camera.fov !== settings.fov) {
      this.camera.fov = settings.fov;
      this.camera.updateProjectionMatrix();
    }

    if (this.mode === 'free') {
      this.updateFreeCamera(vehiclePosition, vehicleRotation);
    } else {
      this.updateFixedCamera(vehiclePosition, vehicleRotation, settings);
    }
  }

  private updateFixedCamera(
    vehiclePosition: Vec3,
    vehicleRotation: number,
    settings: CameraSettings
  ): void {
    const cos = Math.cos(vehicleRotation);
    const sin = Math.sin(vehicleRotation);

    // Calculate rotated offset
    const rotatedOffsetX = settings.offset.x * cos - settings.offset.z * sin;
    const rotatedOffsetZ = settings.offset.x * sin + settings.offset.z * cos;

    // Desired camera position
    const targetX = vehiclePosition.x + rotatedOffsetX;
    const targetY = vehiclePosition.y + settings.offset.y;
    const targetZ = vehiclePosition.z + rotatedOffsetZ;

    // Smooth camera movement (or instant for first-person)
    if (settings.smoothness >= 1.0) {
      // Instant follow (no smoothing)
      this.camera.position.set(targetX, targetY, targetZ);
    } else {
      // Smooth interpolation
      this.camera.position.x += (targetX - this.camera.position.x) * settings.smoothness;
      this.camera.position.y += (targetY - this.camera.position.y) * settings.smoothness;
      this.camera.position.z += (targetZ - this.camera.position.z) * settings.smoothness;
    }

    // Calculate look-at position
    const lookAtOffsetX = settings.lookAtOffset.x * cos - settings.lookAtOffset.z * sin;
    const lookAtOffsetZ = settings.lookAtOffset.x * sin + settings.lookAtOffset.z * cos;

    const lookAtX = vehiclePosition.x + lookAtOffsetX;
    const lookAtY = vehiclePosition.y + settings.lookAtOffset.y;
    const lookAtZ = vehiclePosition.z + lookAtOffsetZ;

    this.camera.lookAt(lookAtX, lookAtY, lookAtZ);
  }

  private updateFreeCamera(vehiclePosition: Vec3, vehicleRotation: number): void {
    // Free camera orbits around the vehicle
    const cos = Math.cos(this.freeCameraRotation.y);
    const sin = Math.sin(this.freeCameraRotation.y);
    const height = this.freeCameraDistance * Math.sin(this.freeCameraRotation.x);
    const radius = this.freeCameraDistance * Math.cos(this.freeCameraRotation.x);

    const targetX = vehiclePosition.x + radius * sin;
    const targetY = vehiclePosition.y + height;
    const targetZ = vehiclePosition.z + radius * cos;

    // Smooth follow
    const settings = this.settings.free;
    this.camera.position.x += (targetX - this.camera.position.x) * settings.smoothness;
    this.camera.position.y += (targetY - this.camera.position.y) * settings.smoothness;
    this.camera.position.z += (targetZ - this.camera.position.z) * settings.smoothness;

    this.camera.lookAt(vehiclePosition.x, vehiclePosition.y + 1, vehiclePosition.z);
  }

  public cycleMode(): CameraMode {
    const modes: CameraMode[] = ['third-person', 'birds-eye', 'first-person', 'free'];
    const currentIndex = modes.indexOf(this.mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.mode = modes[nextIndex];
    console.log(`Camera mode: ${this.mode}`);
    return this.mode;
  }

  public setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  public getMode(): CameraMode {
    return this.mode;
  }

  public rotateFreeCamera(deltaX: number, deltaY: number): void {
    if (this.mode === 'free') {
      this.freeCameraRotation.y += deltaX;
      this.freeCameraRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.freeCameraRotation.x + deltaY));
    }
  }

  public zoomFreeCamera(delta: number): void {
    if (this.mode === 'free') {
      this.freeCameraDistance = Math.max(5, Math.min(50, this.freeCameraDistance + delta));
    }
  }
}

