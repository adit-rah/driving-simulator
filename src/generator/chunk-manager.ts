// Chunk streaming and management

import * as THREE from 'three';
import type { ChunkData, ChunkId, Vec3 } from '../types';
import { worldToChunk, chunkKey, CHUNK_SIZE } from '../utils/math';
import type { PhysicsWorld } from '../core/physics';
import type RAPIER from '@dimforge/rapier3d-compat';

interface LoadedChunk {
  data: ChunkData;
  meshes: THREE.Object3D[];
  physicsBodies: RAPIER.RigidBody[];
}

export class ChunkManager {
  private loadedChunks: Map<string, LoadedChunk>;
  private worker: Worker;
  private worldSeed: number;
  private scene: THREE.Scene;
  private physics: PhysicsWorld;
  private loadRadius: number = 3; // Load chunks within this radius

  constructor(scene: THREE.Scene, physics: PhysicsWorld, worldSeed: number) {
    this.loadedChunks = new Map();
    this.scene = scene;
    this.physics = physics;
    this.worldSeed = worldSeed;
    
    // Create worker
    this.worker = new Worker(
      new URL('./chunk-generator.worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    this.worker.onmessage = (e) => this.onWorkerMessage(e);
  }

  private onWorkerMessage(e: MessageEvent): void {
    if (e.data.type === 'chunk') {
      const chunkData: ChunkData = e.data.data;
      this.loadChunkMeshes(chunkData);
    }
  }

  public update(playerPos: Vec3): void {
    const playerChunk = worldToChunk(playerPos);
    
    // Request chunks within radius
    for (let x = playerChunk.x - this.loadRadius; x <= playerChunk.x + this.loadRadius; x++) {
      for (let y = playerChunk.y - this.loadRadius; y <= playerChunk.y + this.loadRadius; y++) {
        const chunk: ChunkId = { x, y };
        const key = chunkKey(chunk);
        
        if (!this.loadedChunks.has(key)) {
          this.requestChunk(chunk);
        }
      }
    }

    // Unload chunks outside radius
    const toUnload: string[] = [];
    this.loadedChunks.forEach((_, key) => {
      const [x, y] = key.split(',').map(Number);
      const dx = x - playerChunk.x;
      const dy = y - playerChunk.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > this.loadRadius + 1) {
        toUnload.push(key);
      }
    });

    toUnload.forEach(key => this.unloadChunk(key));
  }

  private requestChunk(chunkId: ChunkId): void {
    this.worker.postMessage({
      type: 'generate',
      chunkId,
      worldSeed: this.worldSeed,
    });
  }

  private loadChunkMeshes(data: ChunkData): void {
    const key = chunkKey(data.chunkId);
    
    if (this.loadedChunks.has(key)) {
      return; // Already loaded
    }

    const meshes: THREE.Object3D[] = [];
    const physicsBodies: RAPIER.RigidBody[] = [];

    // Create ground mesh for chunk
    const groundGeometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x228B22,
      roughness: 0.8,
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    const originX = data.chunkId.x * CHUNK_SIZE + CHUNK_SIZE / 2;
    const originZ = data.chunkId.y * CHUNK_SIZE + CHUNK_SIZE / 2;
    groundMesh.position.set(originX, 0, originZ);
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);
    meshes.push(groundMesh);

    // Create road meshes
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x404040,
      roughness: 0.9,
    });

    data.roads.forEach(road => {
      for (let i = 0; i < road.segments.length - 1; i++) {
        const start = road.segments[i];
        const end = road.segments[i + 1];
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        const width = road.type === 'primary' ? 12 : 8;
        
        const roadGeometry = new THREE.PlaneGeometry(length, width);
        const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
        roadMesh.rotation.x = -Math.PI / 2;
        roadMesh.rotation.z = angle;
        roadMesh.position.set(
          (start.x + end.x) / 2,
          0.05,
          (start.y + end.y) / 2
        );
        roadMesh.receiveShadow = true;
        this.scene.add(roadMesh);
        meshes.push(roadMesh);
      }
    });

    // Create building meshes
    data.buildings.forEach(building => {
      const footprint = building.footprint;
      if (footprint.length < 3) return;

      // Calculate building dimensions
      const minX = Math.min(...footprint.map(p => p.x));
      const maxX = Math.max(...footprint.map(p => p.x));
      const minY = Math.min(...footprint.map(p => p.y));
      const maxY = Math.max(...footprint.map(p => p.y));
      const width = maxX - minX;
      const depth = maxY - minY;
      const centerX = (minX + maxX) / 2;
      const centerZ = (minY + maxY) / 2;

      const geometry = new THREE.BoxGeometry(width, building.height, depth);
      
      let color: number;
      if (building.archetype === 'residential') {
        color = 0xd4a574;
      } else if (building.archetype === 'office') {
        color = 0x8b9dc3;
      } else {
        color = 0x9b9b9b;
      }

      const material = new THREE.MeshStandardMaterial({ 
        color,
        roughness: 0.7,
        metalness: 0.1,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(centerX, building.height / 2, centerZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      meshes.push(mesh);
    });

    // Create physics bodies for buildings
    data.collisionPrimitives.forEach(primitive => {
      if (primitive.type === 'box') {
        const body = this.physics.createStaticBox(
          primitive.position,
          primitive.size,
          primitive.rotation || 0
        );
        physicsBodies.push(body);
      }
    });

    this.loadedChunks.set(key, { data, meshes, physicsBodies });
  }

  private unloadChunk(key: string): void {
    const chunk = this.loadedChunks.get(key);
    if (!chunk) return;

    // Remove meshes
    chunk.meshes.forEach(mesh => {
      this.scene.remove(mesh);
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    // Remove physics bodies
    chunk.physicsBodies.forEach(body => {
      this.physics.removeBody(body);
    });

    this.loadedChunks.delete(key);
  }

  public getLoadedChunks(): Map<string, LoadedChunk> {
    return this.loadedChunks;
  }

  public dispose(): void {
    this.worker.terminate();
    this.loadedChunks.forEach((_, key) => this.unloadChunk(key));
  }
}

