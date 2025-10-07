// Web Worker for procedural chunk generation

import type { ChunkData, ChunkId, RoadSegment, Building, Vec2 } from '../types';
import { SeededRNG, hashChunk } from '../utils/rng';
import { noise2D, vec2 } from '../utils/math';

const CHUNK_SIZE = 256;
const ROAD_WIDTH = 8;
const BLOCK_SIZE = 64;

interface GenerateRequest {
  type: 'generate';
  chunkId: ChunkId;
  worldSeed: number;
}

// Listen for messages from main thread
self.onmessage = (e: MessageEvent<GenerateRequest>) => {
  if (e.data.type === 'generate') {
    const chunk = generateChunk(e.data.chunkId, e.data.worldSeed);
    self.postMessage({ type: 'chunk', data: chunk });
  }
};

function generateChunk(chunkId: ChunkId, worldSeed: number): ChunkData {
  const seed = hashChunk(worldSeed, chunkId.x, chunkId.y);
  const rng = new SeededRNG(seed);

  const roads: RoadSegment[] = [];
  const intersections: { pos: Vec2; id: string }[] = [];
  const buildings: Building[] = [];
  const collisionPrimitives: any[] = [];

  // World position of chunk origin
  const originX = chunkId.x * CHUNK_SIZE;
  const originY = chunkId.y * CHUNK_SIZE;

  // Generate grid-based road network
  const gridSpacing = BLOCK_SIZE;
  const numRoads = Math.floor(CHUNK_SIZE / gridSpacing);

  // Horizontal roads
  for (let i = 0; i <= numRoads; i++) {
    const y = i * gridSpacing;
    const segments: Vec2[] = [
      vec2(originX, originY + y),
      vec2(originX + CHUNK_SIZE, originY + y),
    ];
    
    const roadType = i % 2 === 0 ? 'primary' : 'secondary';
    roads.push({ segments, type: roadType as 'primary' | 'secondary' });
  }

  // Vertical roads
  for (let i = 0; i <= numRoads; i++) {
    const x = i * gridSpacing;
    const segments: Vec2[] = [
      vec2(originX + x, originY),
      vec2(originX + x, originY + CHUNK_SIZE),
    ];
    
    const roadType = i % 2 === 0 ? 'primary' : 'secondary';
    roads.push({ segments, type: roadType as 'primary' | 'secondary' });
  }

  // Generate buildings in blocks
  for (let bx = 0; bx < numRoads; bx++) {
    for (let by = 0; by < numRoads; by++) {
      const blockX = originX + bx * gridSpacing + ROAD_WIDTH;
      const blockY = originY + by * gridSpacing + ROAD_WIDTH;
      const blockWidth = gridSpacing - ROAD_WIDTH * 2;
      const blockDepth = gridSpacing - ROAD_WIDTH * 2;

      if (blockWidth <= 0 || blockDepth <= 0) continue;

      // Determine building archetype based on noise
      const noiseValue = noise2D(blockX, blockY, seed);
      let archetype: 'residential' | 'office' | 'industrial';
      if (noiseValue < 0.4) {
        archetype = 'residential';
      } else if (noiseValue < 0.7) {
        archetype = 'office';
      } else {
        archetype = 'industrial';
      }

      // Generate 1-4 buildings per block
      const numBuildings = rng.nextInt(1, 4);
      const buildingWidth = blockWidth / Math.ceil(Math.sqrt(numBuildings));
      const buildingDepth = blockDepth / Math.ceil(Math.sqrt(numBuildings));

      for (let i = 0; i < numBuildings; i++) {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const bldgX = blockX + col * buildingWidth + rng.nextFloat(0, 5);
        const bldgY = blockY + row * buildingDepth + rng.nextFloat(0, 5);
        const bldgW = buildingWidth * rng.nextFloat(0.7, 0.95);
        const bldgD = buildingDepth * rng.nextFloat(0.7, 0.95);

        const footprint: Vec2[] = [
          vec2(bldgX, bldgY),
          vec2(bldgX + bldgW, bldgY),
          vec2(bldgX + bldgW, bldgY + bldgD),
          vec2(bldgX, bldgY + bldgD),
        ];

        let height: number;
        if (archetype === 'residential') {
          height = rng.nextFloat(8, 20);
        } else if (archetype === 'office') {
          height = rng.nextFloat(20, 60);
        } else {
          height = rng.nextFloat(6, 15);
        }

        buildings.push({ footprint, height, archetype });

        // Add collision primitive
        collisionPrimitives.push({
          type: 'box' as const,
          position: { x: bldgX + bldgW / 2, y: height / 2, z: bldgY + bldgD / 2 },
          size: { x: bldgW, y: height, z: bldgD },
          rotation: 0,
        });
      }
    }
  }

  return {
    chunkId,
    roads,
    intersections,
    buildings,
    collisionPrimitives,
  };
}

