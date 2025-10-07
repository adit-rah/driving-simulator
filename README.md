# Driving Simulator - MVP

A browser-based driving simulator with procedurally generated infinite city, realistic vehicle physics, and streaming world chunks.

## Features

✅ **Procedurally Generated City**: Deterministic, seeded generation creates an infinite city with roads and buildings  
✅ **Realistic Vehicle Physics**: Improved bicycle model with smooth acceleration, responsive turning, and lateral grip  
✅ **Dual Camera Modes**: Toggle between third-person chase cam and immersive first-person view (press C)  
✅ **Animated Steering Wheel**: Realistic steering wheel rotation visible in first-person mode  
✅ **Chunk Streaming**: Seamless loading/unloading of city chunks as you drive  
✅ **Mini-Map**: Real-time 2D map showing roads, buildings, and your position  
✅ **HUD**: Speed, gear indicator, and customizable world seed  
✅ **Input Support**: Keyboard and gamepad controls  
✅ **Performance**: 60 FPS physics with optimized rendering

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to the URL shown (typically `http://localhost:5173`)

### Build for Production

```bash
npm run build
npm run preview
```

## Controls

### Keyboard
- **W / ↑**: Throttle
- **S / ↓**: Brake (hold when stopped to Reverse)
- **A / ←**: Steer Left
- **D / →**: Steer Right
- **Space**: Handbrake
- **C**: Toggle Camera (Third-Person ↔ First-Person)

### Gamepad
- **Left Stick**: Steering
- **Right Trigger (RT)**: Throttle
- **Left Trigger (LT)**: Brake
- **A Button**: Handbrake

## Architecture

### Core Systems

**Renderer** (`src/core/renderer.ts`)
- Three.js-based WebGL rendering
- Dynamic lighting with shadows
- Fog for distant objects
- Responsive camera system

**Physics** (`src/core/physics.ts`)
- Rapier physics engine (WASM)
- Rigid body dynamics
- Collision detection
- Fixed timestep (60 Hz)

**Input** (`src/core/input.ts`)
- Unified keyboard + gamepad handling
- Smooth analog input
- Dead zone handling for gamepads

### Vehicle System

**Vehicle Controller** (`src/vehicle/vehicle-controller.ts`)
- Simplified bicycle model for lateral dynamics
- Power-based acceleration with speed limiting
- Drag and rolling resistance
- Automatic transmission (5 gears)
- Weight: 1200 kg
- Max Speed: 200 km/h
- Engine Power: 150 kW

**Camera Controller** (`src/core/camera-controller.ts`)
- Third-person follow camera
- Smooth interpolation
- Rotation-aware positioning

### Procedural Generation

**Chunk Generator** (`src/generator/chunk-generator.worker.ts`)
- Runs in Web Worker for non-blocking generation
- Deterministic seeded RNG (Mulberry32)
- Grid-based road network
- Building placement by archetype (residential, office, industrial)
- Collision primitive generation

**Chunk Manager** (`src/generator/chunk-manager.ts`)
- Streaming system with configurable load radius (default: 3 chunks)
- Automatic chunk loading/unloading based on player position
- Mesh and physics body lifecycle management
- Memory-efficient disposal

**Chunk Specifications**
- Size: 256m × 256m
- Roads: Grid-based with primary/secondary classification
- Buildings: Varied heights by archetype
- Deterministic: Same seed always generates identical chunks

### UI

**HUD** (`src/ui/hud.ts`)
- Speedometer (km/h)
- Gear indicator (1-5, AUTO)
- World seed input

**Mini-Map** (`src/ui/minimap.ts`)
- 2D canvas rendering
- Rotates with vehicle
- Shows roads, buildings, and player position
- 150m radius view

## Technical Details

### Tech Stack
- **Language**: TypeScript
- **Build Tool**: Vite
- **Renderer**: Three.js (WebGL)
- **Physics**: Rapier3D (WASM)
- **Threading**: Web Workers for chunk generation

### Performance Optimizations
- Fixed timestep physics (decoupled from rendering)
- Frustum culling (automatic via Three.js)
- Chunk-based streaming (only nearby chunks loaded)
- Efficient material reuse
- Shadow map optimization
- Geometry instancing for buildings

### File Structure

```
src/
├── core/
│   ├── renderer.ts          # Three.js scene & rendering
│   ├── input.ts             # Keyboard + gamepad input
│   ├── physics.ts           # Rapier physics integration
│   └── camera-controller.ts # Follow camera
├── generator/
│   ├── chunk-generator.worker.ts  # Worker for procedural generation
│   └── chunk-manager.ts           # Streaming & lifecycle
├── vehicle/
│   └── vehicle-controller.ts      # Vehicle physics & model
├── ui/
│   ├── hud.ts               # Speed/gear display
│   └── minimap.ts           # 2D map rendering
├── utils/
│   ├── rng.ts               # Seeded random number generator
│   └── math.ts              # Vector math & utilities
├── types.ts                 # TypeScript type definitions
├── styles.css               # UI styling
└── main.ts                  # Entry point & game loop
```

## Customization

### Change World Seed
Enter a new number in the seed input (top-left) and it will regenerate the world.

### Adjust Vehicle Parameters
Edit `src/vehicle/vehicle-controller.ts`:
```typescript
private readonly mass = 1200;        // kg
private readonly maxSteerAngle = 0.6; // radians
private readonly enginePower = 150000; // watts
private readonly maxSpeed = 200;     // km/h
```

### Modify Chunk Generation
Edit `src/generator/chunk-generator.worker.ts`:
```typescript
const CHUNK_SIZE = 256;    // meters
const BLOCK_SIZE = 64;     // building block size
const ROAD_WIDTH = 8;      // meters
```

### Camera Settings
Edit `src/core/camera-controller.ts`:
```typescript
private offset: Vec3 = { x: 0, y: 6, z: -12 };  // Camera position
private smoothness: number = 0.1;               // Follow smoothness
```

## Testing Checklist

- [x] Deterministic generation (same seed → same chunks)
- [x] Chunk streaming (loads ahead, unloads behind)
- [x] Vehicle responds to input smoothly
- [x] Physics stability at high speeds
- [x] Mini-map alignment with world
- [x] No memory leaks during extended play
- [x] 60 FPS on desktop browsers
- [x] Gamepad support

## Future Enhancements (Post-MVP)

- Traffic & AI vehicles
- Day/night cycle
- Weather effects
- Points of interest (gas stations, landmarks)
- Missions/objectives
- Mobile touch controls
- Better building variety & detail
- LOD system for distant geometry
- IndexedDB caching for chunks
- Multiplayer support

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS may have performance limitations)

Requires WebGL 2.0 and WebAssembly support.

## License

MIT

## Credits

Built with:
- [Three.js](https://threejs.org/) - 3D rendering
- [Rapier](https://rapier.rs/) - Physics engine
- [Vite](https://vitejs.dev/) - Build tool
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

**Have fun driving! 🚗💨**
