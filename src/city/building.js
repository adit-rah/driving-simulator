import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { world } from '../physics.js';
import { RoadRegistry } from './road.js';

// Building materials (using the same ones from building_generator.js)
const buildingMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7 }), // Gray
  new THREE.MeshStandardMaterial({ color: 0x775544, roughness: 0.8 }), // Brown
  new THREE.MeshStandardMaterial({ color: 0x8888aa, roughness: 0.5, metalness: 0.5 }), // Blue-gray
  new THREE.MeshStandardMaterial({ color: 0xeeccaa, roughness: 0.85 }), // Beige
  new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 })  // Dark gray
];

export class Building {
  constructor(position, width, height, depth, faceDirection) {
    this.position = position.clone();
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.faceDirection = faceDirection.clone();
    this.mesh = null;
    this.physicsBody = null;
    this.id = THREE.MathUtils.generateUUID();
    this.distanceFromCenter = position.length();
    
    this.create();
  }
  
  create() {
    // Determine building style based on distance from center
    const distanceFromCenter = this.position.length();
    const materialIndex = distanceFromCenter < 200 ? 
                         Math.floor(Math.random() * 5) : // Downtown uses modern materials
                         Math.floor(Math.random() * buildingMaterials.length); // Suburbs use all materials
    
    const buildingMat = buildingMaterials[materialIndex];
    
    // Determine if we should create a building with a roof
    const hasRoof = Math.random() > 0.5 && distanceFromCenter > 200;
    
    let buildingMesh;
    
    if (hasRoof) {
      // Building with roof
      const group = new THREE.Group();
      
      // Main building structure (slightly shorter to accommodate roof)
      const actualHeight = this.height * 0.85;
      const buildingGeo = new THREE.BoxGeometry(this.width, actualHeight, this.depth);
      const building = new THREE.Mesh(buildingGeo, buildingMat);
      building.position.y = actualHeight / 2;
      group.add(building);
      
      // Simple roof
      const roofHeight = this.height * 0.15;
      const roofGeo = new THREE.ConeGeometry(Math.min(this.width, this.depth) * 0.7, roofHeight, 4);
      const roofMaterial = buildingMaterials[4]; // Dark color for roof
      const roof = new THREE.Mesh(roofGeo, roofMaterial);
      roof.position.y = actualHeight + roofHeight / 2;
      roof.rotation.y = Math.PI / 4; // Rotate to align corners with building
      group.add(roof);
      
      buildingMesh = group;
    } else {
      // Simple block building - just a single box
      const buildingGeo = new THREE.BoxGeometry(this.width, this.height, this.depth);
      buildingMesh = new THREE.Mesh(buildingGeo, buildingMat);
      buildingMesh.position.y = this.height / 2;
    }
    
    // Set mesh position and rotation
    buildingMesh.position.copy(this.position);
    const buildingRotation = Math.atan2(this.faceDirection.x, this.faceDirection.z);
    buildingMesh.rotation.y = buildingRotation;
    
    // Create physics body
    const halfExtents = new CANNON.Vec3(this.width / 2, this.height / 2, this.depth / 2);
    const shape = new CANNON.Box(halfExtents);
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(shape);
    body.position.set(this.position.x, this.height / 2, this.position.z);
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), buildingRotation);
    
    this.mesh = buildingMesh;
    this.physicsBody = body;
  }
  
  // Get bounding box in world space
  getBoundingBox() {
    const halfWidth = this.width / 2;
    const halfDepth = this.depth / 2;
    
    // Calculate corners - simplified (not accounting for rotation)
    return {
      minX: this.position.x - halfWidth,
      maxX: this.position.x + halfWidth,
      minZ: this.position.z - halfDepth,
      maxZ: this.position.z + halfDepth
    };
  }
  
  // Check for overlap with roads
  isOverlappingRoad(buffer = 10) {
    return RoadRegistry.isPositionOnAnyRoad(this.position, buffer);
  }
  
  // Check overlap with other buildings
  isOverlappingBuilding(otherBuilding, buffer = 5) {
    const myBox = this.getBoundingBox();
    const otherBox = otherBuilding.getBoundingBox();
    
    return !(
      myBox.maxX + buffer < otherBox.minX ||
      myBox.minX - buffer > otherBox.maxX ||
      myBox.maxZ + buffer < otherBox.minZ ||
      myBox.minZ - buffer > otherBox.maxZ
    );
  }
  
  // Add to scene and physics world
  addToWorld() {
    world.addBody(this.physicsBody);
  }
  
  // Remove from physics world
  remove() {
    if (this.physicsBody) {
      world.removeBody(this.physicsBody);
      this.physicsBody = null;
    }
  }
}

// Static building registry for collision detection
export const BuildingRegistry = {
  buildings: new Map(),
  
  add(building) {
    this.buildings.set(building.id, building);
  },
  
  remove(buildingId) {
    this.buildings.delete(buildingId);
  },
  
  isPositionOverlappingBuildings(position, buffer = 10) {
    const testBox = {
      minX: position.x - buffer,
      maxX: position.x + buffer,
      minZ: position.z - buffer,
      maxZ: position.z + buffer
    };
    
    for (const building of this.buildings.values()) {
      const buildingBox = building.getBoundingBox();
      
      // Check if boxes overlap
      if (!(
        testBox.maxX < buildingBox.minX ||
        testBox.minX > buildingBox.maxX ||
        testBox.maxZ < buildingBox.minZ ||
        testBox.minZ > buildingBox.maxZ
      )) {
        return true;
      }
    }
    
    return false;
  },
  
  getNearbyBuildings(position, maxDistance) {
    const nearbyBuildings = [];
    for (const building of this.buildings.values()) {
      const distance = position.distanceTo(building.position);
      if (distance < maxDistance) {
        nearbyBuildings.push(building);
      }
    }
    return nearbyBuildings;
  },
  
  getBuildingCount() {
    return this.buildings.size;
  },
  
  clear() {
    this.buildings.clear();
  }
}; 