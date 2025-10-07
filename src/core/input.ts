// Input system for keyboard and gamepad

import type { InputState } from '../types';
import { clamp } from '../utils/math';

export class InputManager {
  private inputState: InputState;
  private keys: Set<string>;
  private keysPressed: Set<string>; // For one-time key presses
  private gamepad: Gamepad | null;
  public onCameraToggle?: () => void;

  constructor() {
    this.inputState = {
      steer: 0,
      throttle: 0,
      brake: 0,
      handbrake: false,
    };
    this.keys = new Set();
    this.keysPressed = new Set();
    this.gamepad = null;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e));
    window.addEventListener('gamepaddisconnected', (e) => this.onGamepadDisconnected(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Check for one-time key presses
    if (!this.keys.has(e.code)) {
      this.keysPressed.add(e.code);
      
      // Camera toggle
      if (e.code === 'KeyC' && this.onCameraToggle) {
        this.onCameraToggle();
      }
    }
    
    this.keys.add(e.code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
    this.keysPressed.delete(e.code);
  }

  private onGamepadConnected(e: GamepadEvent): void {
    console.log('Gamepad connected:', e.gamepad.id);
    this.gamepad = e.gamepad;
  }

  private onGamepadDisconnected(e: GamepadEvent): void {
    console.log('Gamepad disconnected:', e.gamepad.id);
    this.gamepad = null;
  }

  public update(): InputState {
    // Check for gamepad
    const gamepads = navigator.getGamepads();
    if (gamepads[0]) {
      this.gamepad = gamepads[0];
    }

    // Reset state
    let steer = 0;
    let throttle = 0;
    let brake = 0;
    let handbrake = false;

    // Keyboard input
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      steer = -1;
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      steer = 1;
    }
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      throttle = 1;
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      brake = 1;
    }
    if (this.keys.has('Space')) {
      handbrake = true;
    }

    // Gamepad input (overrides keyboard)
    if (this.gamepad) {
      const axes = this.gamepad.axes;
      const buttons = this.gamepad.buttons;

      // Left stick horizontal for steering
      if (Math.abs(axes[0]) > 0.1) {
        steer = clamp(axes[0], -1, 1);
      }

      // Right trigger for throttle (or button 7)
      if (buttons[7] && buttons[7].value > 0.1) {
        throttle = buttons[7].value;
      }

      // Left trigger for brake (or button 6)
      if (buttons[6] && buttons[6].value > 0.1) {
        brake = buttons[6].value;
      }

      // A button for handbrake
      if (buttons[0] && buttons[0].pressed) {
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

