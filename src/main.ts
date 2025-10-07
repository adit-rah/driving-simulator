// Main entry point

import { Renderer } from './core/renderer';
import { InputManagerV2 } from './core/input-v2';
import { PhysicsWorld } from './core/physics';
import { ChunkManager } from './generator/chunk-manager';
import { VehicleControllerV2 } from './vehicle/vehicle-controller-v2';
import { HUD } from './ui/hud';
import { MiniMap } from './ui/minimap';
import { CameraControllerV2 } from './core/camera-controller-v2';
import './styles.css';

class Game {
  private renderer!: Renderer;
  private inputManager!: InputManagerV2;
  private physics!: PhysicsWorld;
  private chunkManager!: ChunkManager;
  private vehicle!: VehicleControllerV2;
  private hud!: HUD;
  private minimap!: MiniMap;
  private cameraController!: CameraControllerV2;

  private worldSeed: number = 12345;
  private lastTime: number = 0;
  private fixedTimeStep: number = 1 / 60; // 60 Hz physics
  private accumulator: number = 0;

  private isRunning: boolean = false;

  async init() {
    // Get seed from input
    const seedInput = document.getElementById('seed-input') as HTMLInputElement;
    if (seedInput) {
      this.worldSeed = parseInt(seedInput.value) || 12345;
      seedInput.addEventListener('change', () => {
        const newSeed = parseInt(seedInput.value) || 12345;
        if (newSeed !== this.worldSeed) {
          this.worldSeed = newSeed;
          this.restart();
        }
      });
    }

    // Initialize renderer
    const appElement = document.getElementById('app')!;
    this.renderer = new Renderer(appElement);

    // Initialize input (V2)
    this.inputManager = new InputManagerV2();

    // Initialize physics
    this.physics = await PhysicsWorld.create();
    this.physics.createGround();

    // Create vehicle (V2)
    const vehicleBody = this.physics.createDynamicBox(
      { x: 0, y: 2, z: 0 },
      { x: 2, y: 1, z: 4.5 },
      1200
    );
    this.vehicle = new VehicleControllerV2(vehicleBody, this.renderer.scene);

    // Initialize chunk manager
    this.chunkManager = new ChunkManager(
      this.renderer.scene,
      this.physics,
      this.worldSeed
    );

    // Initialize UI
    this.hud = new HUD();
    const minimapCanvas = document.getElementById('minimap') as HTMLCanvasElement;
    this.minimap = new MiniMap(minimapCanvas);

    // Initialize camera controller (V2)
    this.cameraController = new CameraControllerV2(this.renderer.camera);

    // Setup camera toggle
    this.inputManager.onCameraToggle = () => {
      this.cameraController.cycleMode();
    };

    console.log('Game initialized. Seed:', this.worldSeed);
    console.log('Controls:');
    console.log('  WASD/Arrow Keys - Drive');
    console.log('  S (hold when stopped) - Reverse');
    console.log('  Space - Handbrake');
    console.log('  C - Cycle Camera (Third-Person → Birds-Eye → First-Person → Free)');
    console.log('  Gamepad supported if connected');

    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  private restart() {
    // Reload chunks with new seed
    this.chunkManager.dispose();
    this.chunkManager = new ChunkManager(
      this.renderer.scene,
      this.physics,
      this.worldSeed
    );
    console.log('World regenerated with seed:', this.worldSeed);
  }

  private gameLoop = (currentTime: number) => {
    if (!this.isRunning) return;

    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.accumulator += deltaTime;

    // Update input (V2)
    const input = this.inputManager.update(deltaTime);

    // Fixed timestep physics loop
    while (this.accumulator >= this.fixedTimeStep) {
      this.physics.step(this.fixedTimeStep);
      this.vehicle.update(input, this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
    }

    // Update camera (V2)
    const vehicleState = this.vehicle.getState();
    this.cameraController.update(vehicleState.position, vehicleState.rotation, deltaTime);

    // Update chunk streaming
    this.chunkManager.update(vehicleState.position);

    // Update UI
    this.hud.update(vehicleState);
    this.minimap.update(vehicleState, this.chunkManager.getLoadedChunks());

    // Render
    this.renderer.render();

    requestAnimationFrame(this.gameLoop);
  };

  public dispose() {
    this.isRunning = false;
    this.renderer.dispose();
    this.inputManager.dispose();
    this.physics.dispose();
    this.chunkManager.dispose();
    this.vehicle.dispose();
  }
}

// Start the game
const game = new Game();
game.init().catch(console.error);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  game.dispose();
});

