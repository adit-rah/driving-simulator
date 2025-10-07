// HUD display for speed, gear, etc.

import type { VehicleState } from '../types';

export class HUD {
  private speedElement: HTMLElement;
  private gearElement: HTMLElement;
  
  constructor() {
    this.speedElement = document.getElementById('speed')!;
    this.gearElement = document.getElementById('gear')!;
  }

  public update(vehicleState: VehicleState): void {
    // Update speed
    const speed = Math.abs(Math.round(vehicleState.speed));
    this.speedElement.textContent = `${speed} km/h`;

    // Update gear
    if (vehicleState.gear === -1) {
      this.gearElement.textContent = `REVERSE`;
    } else {
      this.gearElement.textContent = `GEAR ${vehicleState.gear} (AUTO)`;
    }
  }
}

