// Math utilities

import type { Vec2, Vec3, ChunkId } from '../types';

export const CHUNK_SIZE = 256; // meters

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function worldToChunk(worldPos: Vec3): ChunkId {
  return {
    x: Math.floor(worldPos.x / CHUNK_SIZE),
    y: Math.floor(worldPos.z / CHUNK_SIZE),
  };
}

export function chunkToWorld(chunk: ChunkId): Vec3 {
  return vec3(chunk.x * CHUNK_SIZE, 0, chunk.y * CHUNK_SIZE);
}

export function chunkKey(chunk: ChunkId): string {
  return `${chunk.x},${chunk.y}`;
}

export function distance2D(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distance3D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Simple 2D perlin-like noise using sine waves
export function noise2D(x: number, y: number, seed: number = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

