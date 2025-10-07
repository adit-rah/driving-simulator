// Improved input system with better handling

import type { InputState } from '../types';

export class InputManagerV2 {
  // Raw input state
  private keys = new Set<string>();
  private gamepad: Gamepad | null = null;
  
  // Processed input state
  private inputState: InputState = {
    steer: 0,
    throttle: 0,
    brake: 0,
    handbrake: false,
  };

  // Callbacks
  public onCameraToggle?: () => void;
  
  // Smoothing for keyboard input
  private keyboardSteer = 0;
  private steerSmoothness = 0.15;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e));
    window.addEventListener('gamepaddisconnected', () => this.onGamepadDisconnected());
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.keys.has(e.code)) {
      // Handle one-time key presses
      if (e.code === 'KeyC' && this.onCameraToggle) {
        this.onCameraToggle();
      }
    }
    this.keys.add(e.code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private onGamepadConnected(e: GamepadEvent): void {
    console.log('Gamepad connected:', e.gamepad.id);
    this.gamepad = e.gamepad;
  }

  private onGamepadDisconnected(): void {
    console.log('Gamepad disconnected');
    this.gamepad = null;
  }

  public update(deltaTime: number): InputState {
    // Check for gamepad updates
    const gamepads = navigator.getGamepads();
    if (gamepads[0]) {
      this.gamepad = gamepads[0];
    }

    let steer = 0;
    let throttle = 0;
    let brake = 0;
    let handbrake = false;

    // Gamepad input (takes priority)
    if (this.gamepad) {
      const axes = this.gamepad.axes;
      const buttons = this.gamepad.buttons;

      // Left stick for steering
      if (Math.abs(axes[0]) > 0.1) {
        steer = Math.max(-1, Math.min(1, axes[0]));
      }

      // Triggers for throttle/brake
      if (buttons[7] && buttons[7].value > 0.05) {
        throttle = buttons[7].value;
      }
      if (buttons[6] && buttons[6].value > 0.05) {
        brake = buttons[6].value;
      }

      // A button for handbrake
      if (buttons[0] && buttons[0].pressed) {
        handbrake = true;
      }
    }

    // Keyboard input (if no gamepad input)
    if (!this.gamepad || (Math.abs(steer) < 0.1 && throttle === 0 && brake === 0)) {
      // Steering with smoothing
      let targetSteer = 0;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
        targetSteer = -1;
      }
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
        targetSteer = 1;
      }
      
      // Smooth keyboard steering
      this.keyboardSteer += (targetSteer - this.keyboardSteer) * this.steerSmoothness;
      if (Math.abs(this.keyboardSteer) < 0.01) {
        this.keyboardSteer = 0;
      }
      steer = this.keyboardSteer;

      // Throttle/Brake
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
        throttle = 1;
      }
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
        brake = 1;
      }
      if (this.keys.has('Space')) {
        handbrake = true;
      }
    }

    this.inputState = { steer, throttle, brake, handbrake };
    return this.inputState;
  }

  public getState(): InputState {
    return { ...this.inputState };
  }

  public dispose(): void {
    window.removeEventListener('keydown', (e) => this.onKeyDown(e));
    window.removeEventListener('keyup', (e) => this.onKeyUp(e));
  }
}

