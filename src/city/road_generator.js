import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { world } from '../physics.js';
import { Road, RoadRegistry } from './road.js';

// Road types
export const ROAD_TYPES = {
  STRAIGHT: 'straight',
  INTERSECTION: 'intersection',
  TURN_LEFT: 'turn_left',
  TURN_RIGHT: 'turn_right',
  SLIGHT_LEFT: 'slight_left',
  SLIGHT_RIGHT: 'slight_right',
  T_JUNCTION: 't_junction'
};

// Directions
export const DIRECTIONS = {
  NORTH: new THREE.Vector3(0, 0, -1),
  EAST: new THREE.Vector3(1, 0, 0),
  SOUTH: new THREE.Vector3(0, 0, 1),
  WEST: new THREE.Vector3(-1, 0, 0)
};

// Road segment properties
export const ROAD_WIDTH = 20;
export const SEGMENT_LENGTH = 50;
export const ROAD_HEIGHT = 0.1;
export const SIDEWALK_WIDTH = 5;
export const SIDEWALK_HEIGHT = 0.3;

// Material cache
const materials = {
  road: new THREE.MeshStandardMaterial({ 
    color: 0x333333, 
    roughness: 0.7, 
    metalness: 0.1 
  }),
  sidewalk: new THREE.MeshStandardMaterial({ 
    color: 0x999999, 
    roughness: 0.9, 
    metalness: 0 
  }),
  line: new THREE.MeshBasicMaterial({ 
    color: 0xFFFFFF 
  })
};

// Geometry cache
const geometries = {};

// Create a road block - factory function now returns a Road object
export function createRoadBlock(position, roadType, direction) {
  // Create the road object
  const id = RoadRegistry.roads.size + 1;
  const road = new Road(position, roadType, direction, id);
  
  // Override base method to handle mesh creation
  road.create = function() {
    // Create the actual mesh
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    
    // Default rotation based on direction
    let rotation = 0;
    if (this.direction.equals(DIRECTIONS.EAST)) rotation = -Math.PI / 2;
    if (this.direction.equals(DIRECTIONS.SOUTH)) rotation = Math.PI;
    if (this.direction.equals(DIRECTIONS.WEST)) rotation = Math.PI / 2;
    
    // Create road geometry based on type
    switch(this.type) {
      case ROAD_TYPES.STRAIGHT:
        createStraightRoad(this.mesh, rotation, this);
        break;
      case ROAD_TYPES.INTERSECTION:
        createIntersection(this.mesh, rotation, this);
        break;
      case ROAD_TYPES.TURN_LEFT:
        createTurn(this.mesh, rotation, 'left', this);
        break;
      case ROAD_TYPES.TURN_RIGHT:
        createTurn(this.mesh, rotation, 'right', this);
        break;
      case ROAD_TYPES.SLIGHT_LEFT:
        createSlightTurn(this.mesh, rotation, 'left', this);
        break;
      case ROAD_TYPES.SLIGHT_RIGHT:
        createSlightTurn(this.mesh, rotation, 'right', this);
        break;
      case ROAD_TYPES.T_JUNCTION:
        createTJunction(this.mesh, rotation, this);
        break;
      default:
        createStraightRoad(this.mesh, rotation, this);
    }
    
    // Calculate next position
    this.nextPosition = calculateNextPosition(this.position, this.direction, this.type);
  };
  
  // Execute create to build the road components
  road.create();
  
  // Register the road
  RoadRegistry.add(road);
  
  return road;
}

// Calculate next position after this road segment
function calculateNextPosition(position, direction, type) {
  let outDirection = direction.clone();
  
  switch(type) {
    case ROAD_TYPES.TURN_LEFT:
      // Rotate 90 degrees counter-clockwise
      outDirection = new THREE.Vector3(-direction.z, 0, direction.x);
      break;
    case ROAD_TYPES.TURN_RIGHT:
      // Rotate 90 degrees clockwise
      outDirection = new THREE.Vector3(direction.z, 0, -direction.x);
      break;
    case ROAD_TYPES.SLIGHT_LEFT:
      // Rotate 30 degrees counter-clockwise
      const angleLeft = Math.PI/6;
      outDirection = new THREE.Vector3(
        direction.x * Math.cos(angleLeft) - direction.z * Math.sin(angleLeft),
        0,
        direction.x * Math.sin(angleLeft) + direction.z * Math.cos(angleLeft)
      );
      break;
    case ROAD_TYPES.SLIGHT_RIGHT:
      // Rotate 30 degrees clockwise
      const angleRight = -Math.PI/6;
      outDirection = new THREE.Vector3(
        direction.x * Math.cos(angleRight) - direction.z * Math.sin(angleRight),
        0,
        direction.x * Math.sin(angleRight) + direction.z * Math.cos(angleRight)
      );
      break;
    // For intersections and T-junctions, continue in the same direction
    case ROAD_TYPES.INTERSECTION:
    case ROAD_TYPES.T_JUNCTION:
      outDirection = direction.clone();
      break;
  }
  
  // Normalize to ensure consistent length
  outDirection.normalize();
  
  // Calculate next position based on direction and segment length
  return position.clone().add(outDirection.multiplyScalar(SEGMENT_LENGTH));
}

// Get or create a cached geometry
function getGeometry(key, creator) {
  if (!geometries[key]) {
    geometries[key] = creator();
  }
  return geometries[key];
}

// Create a straight road segment
function createStraightRoad(group, rotation, road) {
  // Road surface
  const roadGeometry = getGeometry('road', () => new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH));
  const roadMesh = new THREE.Mesh(roadGeometry, materials.road);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.rotation.z = rotation;
  roadMesh.position.y = 0.01;
  group.add(roadMesh);
  
  // Center line
  const lineGeometry = getGeometry('centerLine', () => new THREE.PlaneGeometry(0.5, SEGMENT_LENGTH - 2));
  const line = new THREE.Mesh(lineGeometry, materials.line);
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = rotation;
  line.position.y = 0.02;
  group.add(line);
  
  // Simplified sidewalks - just two flat planes instead of boxes
  const sidewalkGeometry = getGeometry('sidewalkPlane', () => new THREE.PlaneGeometry(SIDEWALK_WIDTH, SEGMENT_LENGTH));
  
  // Left sidewalk
  const leftSidewalk = new THREE.Mesh(sidewalkGeometry, materials.sidewalk);
  leftSidewalk.rotation.x = -Math.PI / 2;
  leftSidewalk.position.set(-ROAD_WIDTH/2 - SIDEWALK_WIDTH/2, 0.005, 0);
  leftSidewalk.rotation.z = rotation;
  group.add(leftSidewalk);
  
  // Right sidewalk
  const rightSidewalk = new THREE.Mesh(sidewalkGeometry, materials.sidewalk);
  rightSidewalk.rotation.x = -Math.PI / 2;
  rightSidewalk.position.set(ROAD_WIDTH/2 + SIDEWALK_WIDTH/2, 0.005, 0);
  rightSidewalk.rotation.z = rotation;
  group.add(rightSidewalk);
  
  // Road physics (includes sidewalks for simplicity)
  const roadShape = new CANNON.Box(new CANNON.Vec3((ROAD_WIDTH + SIDEWALK_WIDTH)/2, ROAD_HEIGHT/2, SEGMENT_LENGTH/2));
  const roadBody = new CANNON.Body({ mass: 0 });
  roadBody.addShape(roadShape);
  roadBody.position.set(group.position.x, ROAD_HEIGHT/2, group.position.z);
  roadBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
  world.addBody(roadBody);
  
  // Store physics body on the road object
  road.physicsBody = roadBody;
  group.userData = { physicsBody: roadBody };
}

// Create an intersection
function createIntersection(group, rotation, road) {
  // Larger square for the intersection
  const size = ROAD_WIDTH;
  const intersectionGeometry = getGeometry('intersection', () => new THREE.PlaneGeometry(size, size));
  const intersection = new THREE.Mesh(intersectionGeometry, materials.road);
  intersection.rotation.x = -Math.PI / 2;
  intersection.position.y = 0.01;
  group.add(intersection);
  
  // Add physics for intersection
  const intersectionShape = new CANNON.Box(new CANNON.Vec3(size/2, ROAD_HEIGHT/2, size/2));
  const intersectionBody = new CANNON.Body({ mass: 0 });
  intersectionBody.addShape(intersectionShape);
  intersectionBody.position.set(group.position.x, ROAD_HEIGHT/2, group.position.z);
  world.addBody(intersectionBody);
  
  // Simplified sidewalks - just four corner patches
  const cornerSize = SIDEWALK_WIDTH;
  const cornerGeometry = getGeometry('cornerPlane', () => new THREE.PlaneGeometry(cornerSize, cornerSize));
  
  // Four corners - using planes instead of boxes
  const positions = [
    [size/2 + cornerSize/2, 0.005, size/2 + cornerSize/2],   // NE
    [-size/2 - cornerSize/2, 0.005, size/2 + cornerSize/2],  // NW
    [-size/2 - cornerSize/2, 0.005, -size/2 - cornerSize/2], // SW
    [size/2 + cornerSize/2, 0.005, -size/2 - cornerSize/2]   // SE
  ];
  
  positions.forEach(pos => {
    const corner = new THREE.Mesh(cornerGeometry, materials.sidewalk);
    corner.rotation.x = -Math.PI / 2;
    corner.position.set(...pos);
    group.add(corner);
  });
  
  // Store physics body on the road object
  road.physicsBody = intersectionBody;
  group.userData = { physicsBody: intersectionBody };
}

// Create a turn (left or right)
function createTurn(group, rotation, direction, road) {
  const isLeft = direction === 'left';
  const turnRadius = ROAD_WIDTH * 1.5;
  
  // Create a curved road using segments
  const segments = 8;
  const angleIncrement = Math.PI / 2 / segments;
  
  // Calculate center of the turn circle - position depends on the turn direction
  const circleCenter = new THREE.Vector3();
  if (isLeft) {
    circleCenter.set(turnRadius, 0, 0);
    circleCenter.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
  } else {
    circleCenter.set(-turnRadius, 0, 0);
    circleCenter.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
  }
  circleCenter.add(group.position);
  
  // Create segments of the curve
  for (let i = 0; i < segments; i++) {
    const angle1 = isLeft ? Math.PI - i * angleIncrement : -i * angleIncrement;
    const angle2 = isLeft ? Math.PI - (i + 1) * angleIncrement : -(i + 1) * angleIncrement;
    
    // Calculate positions relative to circle center
    const x1 = turnRadius * Math.cos(angle1);
    const z1 = turnRadius * Math.sin(angle1);
    const x2 = turnRadius * Math.cos(angle2);
    const z2 = turnRadius * Math.sin(angle2);
    
    // Create a custom geometry for this segment
    const arcLength = turnRadius * angleIncrement;
    const segmentGeo = new THREE.PlaneGeometry(ROAD_WIDTH, arcLength);
    const segment = new THREE.Mesh(segmentGeo, materials.road);
    segment.rotation.x = -Math.PI / 2;
    
    // Position and rotate the segment to follow the curve
    const segmentPos = new THREE.Vector3(
      circleCenter.x + (x1 + x2) / 2,
      0.01,
      circleCenter.z + (z1 + z2) / 2
    );
    segment.position.copy(segmentPos).sub(group.position); // Make position relative to group
    
    // Calculate segment rotation
    const segmentAngle = Math.atan2(z2 - z1, x2 - x1) + Math.PI / 2;
    segment.rotation.z = segmentAngle;
    
    group.add(segment);
  }
  
  // Add physics body for the entire turn (simplified as a box)
  const physicsShape = new CANNON.Box(new CANNON.Vec3(ROAD_WIDTH, ROAD_HEIGHT/2, ROAD_WIDTH));
  const physicsBody = new CANNON.Body({ mass: 0 });
  physicsBody.addShape(physicsShape);
  physicsBody.position.set(group.position.x, ROAD_HEIGHT/2, group.position.z);
  world.addBody(physicsBody);
  
  // Store physics body on the road object
  road.physicsBody = physicsBody;
  group.userData = { physicsBody };
}

// Create a slight turn
function createSlightTurn(group, rotation, direction, road) {
  const isLeft = direction === 'left';
  const turnRadius = ROAD_WIDTH * 3; // Larger radius for a slight turn
  
  // Create a curved road using segments
  const segments = 6;
  const angleIncrement = Math.PI / 6 / segments; // 30 degrees total (PI/6)
  
  // Calculate center of the turn circle - position depends on the turn direction
  const circleCenter = new THREE.Vector3();
  if (isLeft) {
    circleCenter.set(0, 0, turnRadius);
    circleCenter.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation + Math.PI/2);
  } else {
    circleCenter.set(0, 0, -turnRadius);
    circleCenter.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation + Math.PI/2);
  }
  circleCenter.add(group.position);
  
  // Create segments of the curve
  for (let i = 0; i < segments; i++) {
    const angle1 = isLeft ? Math.PI/2 - i * angleIncrement : Math.PI/2 + i * angleIncrement;
    const angle2 = isLeft ? Math.PI/2 - (i + 1) * angleIncrement : Math.PI/2 + (i + 1) * angleIncrement;
    
    // Calculate positions relative to circle center
    const x1 = turnRadius * Math.cos(angle1);
    const z1 = turnRadius * Math.sin(angle1);
    const x2 = turnRadius * Math.cos(angle2);
    const z2 = turnRadius * Math.sin(angle2);
    
    // Create a custom geometry for this segment
    const arcLength = turnRadius * angleIncrement;
    const segmentGeo = new THREE.PlaneGeometry(ROAD_WIDTH, arcLength);
    const segment = new THREE.Mesh(segmentGeo, materials.road);
    segment.rotation.x = -Math.PI / 2;
    
    // Position and rotate the segment to follow the curve
    const segmentPos = new THREE.Vector3(
      circleCenter.x + (x1 + x2) / 2,
      0.01,
      circleCenter.z + (z1 + z2) / 2
    );
    segment.position.copy(segmentPos).sub(group.position); // Make position relative to group
    
    // Calculate segment rotation
    const segmentAngle = Math.atan2(z2 - z1, x2 - x1) + Math.PI / 2;
    segment.rotation.z = segmentAngle;
    
    group.add(segment);
  }
  
  // Add physics body for the entire slight turn (simplified as a box)
  const physicsShape = new CANNON.Box(new CANNON.Vec3(ROAD_WIDTH/2, ROAD_HEIGHT/2, SEGMENT_LENGTH/2));
  const physicsBody = new CANNON.Body({ mass: 0 });
  physicsBody.addShape(physicsShape);
  physicsBody.position.set(group.position.x, ROAD_HEIGHT/2, group.position.z);
  physicsBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
  world.addBody(physicsBody);
  
  // Store physics body on the road object
  road.physicsBody = physicsBody;
  group.userData = { physicsBody };
}

// Create a T-junction
function createTJunction(group, rotation, road) {
  // Base intersection (slightly smaller)
  const size = ROAD_WIDTH * 0.9;
  const intersectionGeometry = getGeometry('tjunction', () => new THREE.PlaneGeometry(size, size));
  const intersection = new THREE.Mesh(intersectionGeometry, materials.road);
  intersection.rotation.x = -Math.PI / 2;
  intersection.position.y = 0.01;
  group.add(intersection);
  
  // Three road segments from the center
  const segmentLength = ROAD_WIDTH / 2;
  const segmentGeo = getGeometry('tjroad', () => new THREE.PlaneGeometry(ROAD_WIDTH, segmentLength));
  
  // North segment (in the direction of travel)
  const forwardSegment = new THREE.Mesh(segmentGeo, materials.road);
  forwardSegment.rotation.x = -Math.PI / 2;
  forwardSegment.position.set(0, 0.01, -segmentLength - size/2);
  forwardSegment.rotation.z = rotation;
  group.add(forwardSegment);
  
  // Left segment
  const leftSegment = new THREE.Mesh(segmentGeo, materials.road);
  leftSegment.rotation.x = -Math.PI / 2;
  leftSegment.position.set(-segmentLength - size/2, 0.01, 0);
  leftSegment.rotation.z = rotation - Math.PI/2;
  group.add(leftSegment);
  
  // Right segment
  const rightSegment = new THREE.Mesh(segmentGeo, materials.road);
  rightSegment.rotation.x = -Math.PI / 2;
  rightSegment.position.set(segmentLength + size/2, 0.01, 0);
  rightSegment.rotation.z = rotation + Math.PI/2;
  group.add(rightSegment);
  
  // Add physics for the T-junction
  const junctionShape = new CANNON.Box(new CANNON.Vec3(ROAD_WIDTH, ROAD_HEIGHT/2, ROAD_WIDTH));
  const junctionBody = new CANNON.Body({ mass: 0 });
  junctionBody.addShape(junctionShape);
  junctionBody.position.set(group.position.x, ROAD_HEIGHT/2, group.position.z);
  junctionBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
  world.addBody(junctionBody);
  
  // Store physics body on the road object
  road.physicsBody = junctionBody;
  group.userData = { physicsBody: junctionBody };
}