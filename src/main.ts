// Main entry point

import { Renderer } from './core/renderer';
import { InputManager } from './core/input';
import { PhysicsWorld } from './core/physics';
import { ChunkManager } from './generator/chunk-manager';
import { VehicleController } from './vehicle/vehicle-controller';
import { HUD } from './ui/hud';
import { MiniMap } from './ui/minimap';
import { CameraController } from './core/camera-controller';
import './styles.css';

class Game {
  private renderer!: Renderer;
  private inputManager!: InputManager;
  private physics!: PhysicsWorld;
  private chunkManager!: ChunkManager;
  private vehicle!: VehicleController;
  private hud!: HUD;
  private minimap!: MiniMap;
  private cameraController!: CameraController;

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

    // Initialize input
    this.inputManager = new InputManager();

    // Initialize physics
    this.physics = await PhysicsWorld.create();
    this.physics.createGround();

    // Create vehicle
    const vehicleBody = this.physics.createDynamicBox(
      { x: 0, y: 2, z: 0 },
      { x: 2, y: 1, z: 4.5 },
      1200
    );
    this.vehicle = new VehicleController(vehicleBody, this.renderer.scene);

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

    // Initialize camera controller
    this.cameraController = new CameraController(this.renderer.camera);

    // Setup camera toggle
    this.inputManager.onCameraToggle = () => {
      const newMode = this.cameraController.toggleMode();
      console.log(`Camera: ${newMode}`);
    };

    console.log('Game initialized. Seed:', this.worldSeed);
    console.log('Controls:');
    console.log('  WASD/Arrow Keys - Drive');
    console.log('  Space - Handbrake');
    console.log('  C - Toggle Camera (Third-Person/First-Person)');
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

    // Update input
    const input = this.inputManager.update();

    // Fixed timestep physics loop
    while (this.accumulator >= this.fixedTimeStep) {
      this.physics.step(this.fixedTimeStep);
      this.vehicle.update(input, this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
    }

    // Update camera
    const vehicleState = this.vehicle.getState();
    this.cameraController.update(vehicleState.position, vehicleState.rotation);

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

