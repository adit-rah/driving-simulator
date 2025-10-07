// Deterministic seeded random number generator (Mulberry32)

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  // Returns random number between 0 and 1
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns random integer between min (inclusive) and max (exclusive)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  // Returns random float between min and max
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  // Returns random boolean
  nextBool(): boolean {
    return this.next() < 0.5;
  }
}

// Hash function to generate chunk-specific seed from world seed and chunk coordinates
export function hashChunk(worldSeed: number, chunkX: number, chunkY: number): number {
  let hash = worldSeed;
  hash = Math.imul(hash ^ chunkX, 0x85ebca6b);
  hash = Math.imul(hash ^ chunkY, 0xc2b2ae35);
  hash = (hash ^ (hash >>> 13)) >>> 0;
  return hash;
}

