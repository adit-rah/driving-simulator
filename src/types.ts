// Core type definitions

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ChunkId {
  x: number;
  y: number;
}

export interface RoadSegment {
  segments: Vec2[];
  type: 'primary' | 'secondary' | 'residential';
}

export interface Intersection {
  pos: Vec2;
  id: string;
}

export interface Building {
  footprint: Vec2[];
  height: number;
  archetype: 'residential' | 'office' | 'industrial';
}

export interface CollisionPrimitive {
  type: 'box' | 'capsule';
  position: Vec3;
  size: Vec3;
  rotation?: number;
}

export interface ChunkData {
  chunkId: ChunkId;
  roads: RoadSegment[];
  intersections: Intersection[];
  buildings: Building[];
  collisionPrimitives: CollisionPrimitive[];
}

export interface InputState {
  steer: number;      // -1 to 1
  throttle: number;   // 0 to 1
  brake: number;      // 0 to 1
  handbrake: boolean;
}

export interface VehicleState {
  position: Vec3;
  velocity: Vec3;
  rotation: number;
  speed: number;      // km/h
  gear: number;
  rpm: number;
}

