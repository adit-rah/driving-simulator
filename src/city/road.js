import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { world } from '../physics.js';

export class Road {
  constructor(position, roadType, direction, id) {
    this.id = id;
    this.position = position.clone();
    this.type = roadType;
    this.direction = direction.clone();
    this.mesh = null;
    this.physicsBody = null;
    this.nextPosition = null;
    this.width = 20;
    this.length = 50;
    this.distanceFromCenter = position.length();
    this.hasBuildings = false;
    
    // Create the mesh and physics body
    this.create();
  }
  
  create() {
    // This will be implemented in the road_generator.js file
  }
  
  // Calculate the bounding box for collision detection
  getBoundingBox() {
    const halfWidth = this.width / 2;
    const halfLength = this.length / 2;
    
    // Default bounds for a straight road
    let minX = this.position.x - halfWidth;
    let maxX = this.position.x + halfWidth;
    let minZ = this.position.z - halfLength;
    let maxZ = this.position.z + halfLength;
    
    // Adjust based on direction
    if (Math.abs(this.direction.x) > Math.abs(this.direction.z)) {
      // Road runs east-west
      minX = this.position.x - halfLength;
      maxX = this.position.x + halfLength;
      minZ = this.position.z - halfWidth;
      maxZ = this.position.z + halfWidth;
    }
    
    // Special case for intersection
    if (this.type === 'intersection') {
      minX = this.position.x - halfWidth;
      maxX = this.position.x + halfWidth;
      minZ = this.position.z - halfWidth;
      maxZ = this.position.z + halfWidth;
    }
    
    return {
      minX, maxX, minZ, maxZ
    };
  }
  
  // Check if a position is on this road
  isPositionOnRoad(position, buffer = 5) {
    const box = this.getBoundingBox();
    return (
      position.x >= box.minX - buffer &&
      position.x <= box.maxX + buffer &&
      position.z >= box.minZ - buffer &&
      position.z <= box.maxZ + buffer
    );
  }
  
  // Remove this road
  remove() {
    if (this.physicsBody) {
      world.removeBody(this.physicsBody);
      this.physicsBody = null;
    }
  }
}

// Static road registry to help with collision detection
export const RoadRegistry = {
  roads: new Map(),
  
  add(road) {
    this.roads.set(road.id, road);
  },
  
  remove(roadId) {
    this.roads.delete(roadId);
  },
  
  isPositionOnAnyRoad(position, buffer = 5) {
    for (const road of this.roads.values()) {
      if (road.isPositionOnRoad(position, buffer)) {
        return true;
      }
    }
    return false;
  },
  
  getNearbyRoads(position, maxDistance) {
    const nearbyRoads = [];
    for (const road of this.roads.values()) {
      const distance = position.distanceTo(road.position);
      if (distance < maxDistance) {
        nearbyRoads.push(road);
      }
    }
    return nearbyRoads;
  },
  
  getRoadCount() {
    return this.roads.size;
  },
  
  clear() {
    this.roads.clear();
  }
} 