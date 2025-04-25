import * as THREE from 'three'
import { scene } from '../scene.js';
import { world } from '../physics.js';
import { createRoadBlock, ROAD_TYPES, DIRECTIONS, SEGMENT_LENGTH, ROAD_WIDTH } from './road_generator.js';
import { Building, BuildingRegistry } from './building.js';
import { RoadRegistry } from './road.js';

// Constants for city generation
const CITY_SIZE = 2000;
const BLOCK_SIZE = SEGMENT_LENGTH;
const MAX_ROAD_SEGMENTS = 800; // Increased limit for more roads
const BUILDING_DENSITY = 0.7; // 0-1, higher = more buildings
const MIN_BUILDING_DISTANCE = 15; // Minimum distance from road center for buildings
const MIN_BUILDING_SPACING = 8; // Minimum distance between buildings
const CHUNK_SIZE = SEGMENT_LENGTH * 3; // Size of city chunks for cleanup

// City generation rules
const RULES = {
  // Probability of road types at intersections
  PROBABILITIES: {
    STRAIGHT: 0.5,
    TURN_LEFT: 0.1,
    TURN_RIGHT: 0.1,
    SLIGHT_LEFT: 0.15,
    SLIGHT_RIGHT: 0.15,
    T_JUNCTION: 0.15,
    INTERSECTION: 0.1,
    // At what distance do we increase/decrease certain road types
    DOWNTOWN_RADIUS: 300,
    SUBURB_RADIUS: 800,
    RURAL_RADIUS: 1500
  },
  
  // Min distance between parallel roads
  MIN_PARALLEL_DISTANCE: SEGMENT_LENGTH * 1.5,
  
  // Probability of starting a new road branch
  BRANCH_PROBABILITY: 0.15,
  
  // Maximum length of a road before forcing an intersection
  MAX_ROAD_LENGTH: 10
};

// Road network generation
let roadNetworkRoot = null;
let roadSegmentCount = 0;

// Chunk-based tracking for optimization
const cityChunks = new Map();
const activeChunks = new Set();
const playerLastPosition = new THREE.Vector3();
let lastGenerationTime = 0;

// Initialize city generation
function initCity() {
  // Start with an intersection at the origin
  const startPos = new THREE.Vector3(0, 0, 0);
  roadNetworkRoot = createIntersectionNode(startPos);
  
  // Create initial road branches in all four directions
  createInitialRoads(roadNetworkRoot);
}

// Create initial roads from the center
function createInitialRoads(intersectionNode) {
  // Four directions from the center intersection
  const directions = [
    DIRECTIONS.NORTH,
    DIRECTIONS.EAST,
    DIRECTIONS.SOUTH,
    DIRECTIONS.WEST
  ];
  
  // Create roads in all four directions
  directions.forEach(direction => {
    const roadType = ROAD_TYPES.STRAIGHT;
    const road = createRoadSegment(intersectionNode.position, direction, roadType);
    
    // Continue building from this road
    extendRoad(road);
  });
}

// Create a new road segment
function createRoadSegment(position, direction, roadType) {
  // Create the actual road block
  const road = createRoadBlock(position, roadType, direction);
  
  // Add to scene
  scene.add(road.mesh);
  
  // Track in chunks for optimization
  addToChunk(road);
  
  // Generate buildings along this road segment
  generateBuildingsAlongRoad(road);
  
  roadSegmentCount++;
  
  return road;
}

// Recursive function to extend roads from end points
function extendRoad(road, currentLength = 1) {
  // Stop if we've reached the maximum number of segments
  if (roadSegmentCount >= MAX_ROAD_SEGMENTS) return;
  
  // Determine next road type based on rules
  const nextType = determineNextRoadType(road, currentLength);
  
  // Create the next road segment
  const nextRoad = createRoadSegment(road.nextPosition, road.direction, nextType);
  
  // Random chance to create branches from straight roads
  if (road.type === ROAD_TYPES.STRAIGHT && Math.random() < RULES.BRANCH_PROBABILITY) {
    createBranches(road);
  }
  
  // Continue road building based on the road type
  if (nextType === ROAD_TYPES.STRAIGHT && currentLength < RULES.MAX_ROAD_LENGTH) {
    // Higher chance to continue straight for shorter roads and downtown areas
    const continueProb = Math.max(0.5, 0.9 - (currentLength / RULES.MAX_ROAD_LENGTH) * 0.4 - 
                              (road.distanceFromCenter / RULES.PROBABILITIES.DOWNTOWN_RADIUS) * 0.3);
    
    if (Math.random() < continueProb) {
      extendRoad(nextRoad, currentLength + 1);
    }
  } 
  // For turns and intersections, start a new road segment with reset length
  else if (nextType === ROAD_TYPES.TURN_LEFT || nextType === ROAD_TYPES.TURN_RIGHT || 
           nextType === ROAD_TYPES.SLIGHT_LEFT || nextType === ROAD_TYPES.SLIGHT_RIGHT) {
    // Continue from the turn with a new direction
    extendRoad(nextRoad, 1);
  }
  // For intersections and T-junctions, create branches in different directions
  else if (nextType === ROAD_TYPES.INTERSECTION || nextType === ROAD_TYPES.T_JUNCTION) {
    createIntersectionBranches(nextRoad);
  }
}

// Determine the next road type based on position and rules
function determineNextRoadType(road, currentLength) {
  const distanceFromCenter = road.position.length();
  
  // Adjust probabilities based on distance from center
  let probs = {...RULES.PROBABILITIES};
  
  // Downtown has more grid-like pattern
  if (distanceFromCenter < RULES.PROBABILITIES.DOWNTOWN_RADIUS) {
    probs.STRAIGHT = 0.6;
    probs.TURN_LEFT = 0.1;
    probs.TURN_RIGHT = 0.1;
    probs.SLIGHT_LEFT = 0.05;
    probs.SLIGHT_RIGHT = 0.05;
    probs.INTERSECTION = 0.2;
    probs.T_JUNCTION = 0.1;
  } 
  // Suburbs have more curves
  else if (distanceFromCenter < RULES.PROBABILITIES.SUBURB_RADIUS) {
    probs.STRAIGHT = 0.5;
    probs.TURN_LEFT = 0.1;
    probs.TURN_RIGHT = 0.1;
    probs.SLIGHT_LEFT = 0.15;
    probs.SLIGHT_RIGHT = 0.15;
    probs.INTERSECTION = 0.1;
    probs.T_JUNCTION = 0.15;
  }
  // Rural areas have winding roads
  else {
    probs.STRAIGHT = 0.4;
    probs.TURN_LEFT = 0.15;
    probs.TURN_RIGHT = 0.15;
    probs.SLIGHT_LEFT = 0.2;
    probs.SLIGHT_RIGHT = 0.2;
    probs.INTERSECTION = 0.05;
    probs.T_JUNCTION = 0.05;
  }
  
  // Force a turn or intersection after max length
  if (currentLength >= RULES.MAX_ROAD_LENGTH) {
    return pickFromProbabilities({
      [ROAD_TYPES.TURN_LEFT]: 0.25,
      [ROAD_TYPES.TURN_RIGHT]: 0.25,
      [ROAD_TYPES.INTERSECTION]: 0.25,
      [ROAD_TYPES.T_JUNCTION]: 0.25
    });
  }
  
  // Check for nearby roads to prevent overlap
  const nearbyRoads = RoadRegistry.getNearbyRoads(road.nextPosition, RULES.MIN_PARALLEL_DISTANCE);
  
  // If we're close to another road, create an intersection
  if (nearbyRoads.length > 0) {
    // Prefer T-junctions or intersections to connect to existing roads
    return Math.random() < 0.7 ? ROAD_TYPES.T_JUNCTION : ROAD_TYPES.INTERSECTION;
  }
  
  // Pick a road type based on probability
  return pickFromProbabilities({
    [ROAD_TYPES.STRAIGHT]: probs.STRAIGHT,
    [ROAD_TYPES.TURN_LEFT]: probs.TURN_LEFT,
    [ROAD_TYPES.TURN_RIGHT]: probs.TURN_RIGHT,
    [ROAD_TYPES.SLIGHT_LEFT]: probs.SLIGHT_LEFT,
    [ROAD_TYPES.SLIGHT_RIGHT]: probs.SLIGHT_RIGHT,
    [ROAD_TYPES.T_JUNCTION]: probs.T_JUNCTION,
    [ROAD_TYPES.INTERSECTION]: probs.INTERSECTION
  });
}

// Pick a value based on probabilities
function pickFromProbabilities(probMap) {
  const totalProb = Object.values(probMap).reduce((sum, p) => sum + p, 0);
  let rand = Math.random() * totalProb;
  
  for (const [value, prob] of Object.entries(probMap)) {
    rand -= prob;
    if (rand <= 0) return value;
  }
  
  // Default to first key if probabilities don't add up to 1
  return Object.keys(probMap)[0];
}

// Create an intersection node
function createIntersectionNode(position) {
  return {
    position: position.clone(),
    roads: [] // Roads connected to this intersection
  };
}

// Create branches from intersections
function createIntersectionBranches(road) {
  // Get road direction and perpendicular directions
  const direction = road.direction.clone();
  const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
  
  // Only create branches if we haven't reached the limit
  if (roadSegmentCount < MAX_ROAD_SEGMENTS) {
    // For T-junction, create two branches (perpendicular and continue straight)
    if (road.type === ROAD_TYPES.T_JUNCTION) {
      // Straight continuation
      if (Math.random() < 0.8) {
        const straightPos = road.nextPosition.clone();
        const straightRoad = createRoadSegment(straightPos, direction, ROAD_TYPES.STRAIGHT);
        extendRoad(straightRoad);
      }
      
      // Determine branch direction - randomly choose left or right
      const branchDir = Math.random() < 0.5 ? perpendicular : perpendicular.negate();
      const branchPos = road.position.clone();
      const branchRoad = createRoadSegment(branchPos, branchDir, ROAD_TYPES.STRAIGHT);
      extendRoad(branchRoad);
    }
    // For intersection, create up to 3 branches (including continuation)
    else if (road.type === ROAD_TYPES.INTERSECTION) {
      // Straight continuation with high probability
      if (Math.random() < 0.9) {
        const straightPos = road.nextPosition.clone();
        const straightRoad = createRoadSegment(straightPos, direction, ROAD_TYPES.STRAIGHT);
        extendRoad(straightRoad);
      }
      
      // Left branch with high probability
      if (Math.random() < 0.8) {
        const leftBranchPos = road.position.clone();
        const leftRoad = createRoadSegment(leftBranchPos, perpendicular, ROAD_TYPES.STRAIGHT);
        extendRoad(leftRoad);
      }
      
      // Right branch with high probability
      if (Math.random() < 0.8) {
        const rightBranchPos = road.position.clone();
        const rightDirection = perpendicular.clone().negate();
        const rightRoad = createRoadSegment(rightBranchPos, rightDirection, ROAD_TYPES.STRAIGHT);
        extendRoad(rightRoad);
      }
    }
  }
}

// Create random branches off straight roads
function createBranches(road) {
  // Only branch from straight roads
  if (road.type !== ROAD_TYPES.STRAIGHT) return;
  
  // Only create branches if we haven't reached the limit
  if (roadSegmentCount >= MAX_ROAD_SEGMENTS) return;
  
  // Make branching less likely far from center to avoid crowded suburbs
  const distanceFromCenter = road.distanceFromCenter;
  const branchProb = Math.max(0.1, RULES.BRANCH_PROBABILITY - (distanceFromCenter / RULES.PROBABILITIES.SUBURB_RADIUS) * 0.1);
  
  if (Math.random() > branchProb) return;
  
  // Get perpendicular direction
  const direction = road.direction.clone();
  const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
  
  // 50/50 chance of branching left or right
  const branchDirection = Math.random() < 0.5 ? perpendicular : perpendicular.clone().negate();
  
  // Determine branch type - mostly T-junctions, occasionally turns
  const branchType = Math.random() < 0.7 ? ROAD_TYPES.T_JUNCTION : 
                    (Math.random() < 0.5 ? ROAD_TYPES.TURN_LEFT : ROAD_TYPES.TURN_RIGHT);
  
  // Create branch at current road position
  const branchPos = road.position.clone();
  const branchRoad = createRoadSegment(branchPos, branchDirection, branchType);
  
  // Continue the branch
  extendRoad(branchRoad, 1);
}

// Generate buildings along a road
function generateBuildingsAlongRoad(road) {
  // Skip building generation for intersections and T-junctions
  if (road.type === ROAD_TYPES.INTERSECTION || road.type === ROAD_TYPES.T_JUNCTION) return;
  
  // If this road already has buildings, skip
  if (road.hasBuildings) return;
  road.hasBuildings = true;
  
  // Distance-based building generation (fewer buildings farther from center)
  const distanceFromCenter = road.position.length();
  const maxDistance = CITY_SIZE;
  const densityFactor = Math.max(0, 1 - (distanceFromCenter / maxDistance));
  const actualDensity = BUILDING_DENSITY * densityFactor;
  
  // Skip if density is too low
  if (actualDensity < 0.1) return;
  
  // Direction perpendicular to the road for building placement
  const perpendicular = new THREE.Vector3(-road.direction.z, 0, road.direction.x);
  
  // Number of buildings to generate
  const buildingCount = Math.floor(2 + Math.random() * 2);
  
  // Left side buildings
  for (let i = 0; i < buildingCount; i++) {
    if (Math.random() > actualDensity) continue;
    
    // Determine building dimensions based on distance from center
    let maxHeight = 80;
    let minHeight = 15;
    
    if (distanceFromCenter > 500) {
      maxHeight = 40;
      minHeight = 5;
    } else if (distanceFromCenter > 200) {
      maxHeight = 60;
      minHeight = 10;
    }
    
    const width = Math.random() * 15 + 8;
    const depth = Math.random() * 15 + 8;
    const height = Math.random() * (maxHeight - minHeight) + minHeight;
    
    // Building position
    const offset = MIN_BUILDING_DISTANCE + Math.random() * 15;
    const alongRoad = (Math.random() - 0.5) * SEGMENT_LENGTH * 0.8;
    
    const buildingPos = road.position.clone()
      .add(perpendicular.clone().multiplyScalar(ROAD_WIDTH/2 + offset))
      .add(road.direction.clone().multiplyScalar(alongRoad));
    
    // Create and check building
    tryCreateBuilding(buildingPos, width, height, depth, road.direction);
  }
  
  // Right side buildings
  for (let i = 0; i < buildingCount; i++) {
    if (Math.random() > actualDensity) continue;
    
    // Determine building dimensions based on distance from center
    let maxHeight = 80;
    let minHeight = 15;
    
    if (distanceFromCenter > 500) {
      maxHeight = 40;
      minHeight = 5;
    } else if (distanceFromCenter > 200) {
      maxHeight = 60;
      minHeight = 10;
    }
    
    const width = Math.random() * 15 + 8;
    const depth = Math.random() * 15 + 8;
    const height = Math.random() * (maxHeight - minHeight) + minHeight;
    
    // Building position
    const offset = MIN_BUILDING_DISTANCE + Math.random() * 15;
    const alongRoad = (Math.random() - 0.5) * SEGMENT_LENGTH * 0.8;
    
    const buildingPos = road.position.clone()
      .add(perpendicular.clone().multiplyScalar(-(ROAD_WIDTH/2 + offset)))
      .add(road.direction.clone().multiplyScalar(alongRoad));
    
    // Create and check building
    tryCreateBuilding(buildingPos, width, height, depth, road.direction);
  }
}

// Try to create a building, checking for collision with roads and other buildings
function tryCreateBuilding(position, width, height, depth, faceDirection) {
  // Check building footprint against all roads with a buffer
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  
  // Rotate building corners based on facing direction
  const buildingRotation = Math.atan2(faceDirection.x, faceDirection.z);
  
  // Check all 4 corners plus center of the building
  const corners = [
    position.clone(), // Center
    new THREE.Vector3(position.x + halfWidth, 0, position.z + halfDepth),
    new THREE.Vector3(position.x - halfWidth, 0, position.z + halfDepth),
    new THREE.Vector3(position.x + halfWidth, 0, position.z - halfDepth),
    new THREE.Vector3(position.x - halfWidth, 0, position.z - halfDepth)
  ];
  
  // Rotate corners around center point
  for (let i = 1; i < corners.length; i++) {
    const corner = corners[i];
    // Translate to origin
    corner.sub(position);
    // Rotate
    const x = corner.x * Math.cos(buildingRotation) - corner.z * Math.sin(buildingRotation);
    const z = corner.x * Math.sin(buildingRotation) + corner.z * Math.cos(buildingRotation);
    corner.x = x;
    corner.z = z;
    // Translate back
    corner.add(position);
  }
  
  // Check if any corner is on a road
  for (const corner of corners) {
    if (RoadRegistry.isPositionOnAnyRoad(corner, 5)) {
      return null;
    }
  }
  
  // Check if building would be too close to other buildings
  if (BuildingRegistry.isPositionOverlappingBuildings(position, MIN_BUILDING_SPACING)) {
    return null;
  }
  
  // Create the building
  const building = new Building(position, width, height, depth, faceDirection);
  
  // Add to scene and physics world
  scene.add(building.mesh);
  building.addToWorld();
  
  // Register the building
  BuildingRegistry.add(building);
  
  // Add to chunk management
  addBuildingToChunk(building);
  
  return building;
}

// Add road to chunk system for management
function addToChunk(road) {
  const chunkX = Math.floor(road.position.x / CHUNK_SIZE);
  const chunkZ = Math.floor(road.position.z / CHUNK_SIZE);
  const chunkKey = `${chunkX},${chunkZ}`;
  
  if (!cityChunks.has(chunkKey)) {
    cityChunks.set(chunkKey, { roads: new Set(), buildings: new Set() });
  }
  
  cityChunks.get(chunkKey).roads.add(road.id);
}

// Add building to chunk system
function addBuildingToChunk(building) {
  const position = building.position;
  const chunkX = Math.floor(position.x / CHUNK_SIZE);
  const chunkZ = Math.floor(position.z / CHUNK_SIZE);
  const chunkKey = `${chunkX},${chunkZ}`;
  
  if (!cityChunks.has(chunkKey)) {
    cityChunks.set(chunkKey, { roads: new Set(), buildings: new Set() });
  }
  
  cityChunks.get(chunkKey).buildings.add(building.id);
}

// Update active chunks based on player position
function updateChunks(playerPos) {
  const currentChunkX = Math.floor(playerPos.x / CHUNK_SIZE);
  const currentChunkZ = Math.floor(playerPos.z / CHUNK_SIZE);
  
  // Clear previous active chunks
  activeChunks.clear();
  
  // Render range (how many chunks in each direction)
  const range = 3;
  
  // Mark chunks as active
  for (let dx = -range; dx <= range; dx++) {
    for (let dz = -range; dz <= range; dz++) {
      const chunkKey = `${currentChunkX + dx},${currentChunkZ + dz}`;
      activeChunks.add(chunkKey);
    }
  }
  
  // Deactivate far away chunks
  for (const [chunkKey, chunk] of cityChunks.entries()) {
    if (!activeChunks.has(chunkKey)) {
      // Hide roads in this chunk
      for (const roadId of chunk.roads) {
        const road = RoadRegistry.roads.get(roadId);
        if (road && road.mesh) {
          scene.remove(road.mesh);
        }
      }
      
      // Hide buildings in this chunk
      for (const buildingId of chunk.buildings) {
        const building = BuildingRegistry.buildings.get(buildingId);
        if (building && building.mesh) {
          scene.remove(building.mesh);
          if (building.physicsBody) {
            world.removeBody(building.physicsBody);
          }
        }
      }
    } else {
      // Show roads in this chunk
      for (const roadId of chunk.roads) {
        const road = RoadRegistry.roads.get(roadId);
        if (road && road.mesh && !scene.children.includes(road.mesh)) {
          scene.add(road.mesh);
        }
      }
      
      // Show buildings in this chunk
      for (const buildingId of chunk.buildings) {
        const building = BuildingRegistry.buildings.get(buildingId);
        if (building && building.mesh && !scene.children.includes(building.mesh)) {
          scene.add(building.mesh);
          if (building.physicsBody) {
            building.addToWorld();
          }
        }
      }
    }
  }
}

// Main function to update the city based on player position
function updateCity(playerPos) {
  // Initialize city if not already done
  if (!roadNetworkRoot) {
    initCity();
  }
  
  // Only update if player has moved a significant distance or enough time has passed
  const lastPos = playerLastPosition;
  const distanceMoved = playerPos.distanceTo(lastPos);
  const timeSinceLastGeneration = Date.now() - lastGenerationTime;
  
  if (distanceMoved < 10 && timeSinceLastGeneration < 2000) {
    // Just update chunks (visibility of existing roads/buildings)
    updateChunks(playerPos);
    return;
  }
  
  // Update tracking variables
  playerLastPosition.copy(playerPos);
  lastGenerationTime = Date.now();
  
  // Update which chunks are active around the player
  updateChunks(playerPos);
  
  // Generate more roads if needed and player is moving to new areas
  if (roadSegmentCount < MAX_ROAD_SEGMENTS) {
    // Find the nearest road endpoint to extend from
    let nearestRoad = null;
    let nearestDistance = Infinity;
    let nearestEndpoint = new THREE.Vector3();
    
    // Only search through active chunks to find nearby roads
    for (const chunkKey of activeChunks) {
      const chunk = cityChunks.get(chunkKey);
      if (!chunk) continue;
      
      for (const roadId of chunk.roads) {
        const road = RoadRegistry.roads.get(roadId);
        if (!road) continue;
        
        // Check both the road position and its next position
        const distToRoadStart = playerPos.distanceTo(road.position);
        const distToRoadEnd = road.nextPosition ? playerPos.distanceTo(road.nextPosition) : Infinity;
        
        // Prefer road endpoints (nextPosition) for extension
        if (distToRoadEnd < nearestDistance && distToRoadEnd > 30) {
          nearestDistance = distToRoadEnd;
          nearestRoad = road;
          nearestEndpoint.copy(road.nextPosition);
        }
        // Also consider road start points if no better endpoint is found
        else if (distToRoadStart < nearestDistance && distToRoadStart > 30 && distToRoadStart < 200) {
          nearestDistance = distToRoadStart;
          nearestRoad = road;
          nearestEndpoint.copy(road.position);
        }
      }
    }
    
    // Create up to 3 new road segments per update when player moves
    const numRoadsToGenerate = Math.min(3, MAX_ROAD_SEGMENTS - roadSegmentCount);
    
    // If there's a road endpoint near the player, extend from it
    if (nearestRoad && nearestDistance < 200) {
      for (let i = 0; i < numRoadsToGenerate; i++) {
        // 70% chance to extend the nearest road or create a new branch
        if (Math.random() < 0.7) {
          if (nearestEndpoint.equals(nearestRoad.nextPosition)) {
            // Extend from the end of the road
            extendRoad(nearestRoad);
          } else {
            // Create a branch from this road
            createBranches(nearestRoad);
          }
        }
      }
    }
    // If player is far from any road but not too far from origin, create a new independent road
    else if (playerPos.length() < CITY_SIZE * 0.8) {
      // Create a new road near the player's position
      const newRoadPos = new THREE.Vector3(
        playerPos.x + (Math.random() - 0.5) * 100,
        0,
        playerPos.z + (Math.random() - 0.5) * 100
      );
      
      // Determine a random direction
      const angle = Math.random() * Math.PI * 2;
      const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      
      // Create a new intersection or T-junction as starting point
      const roadType = Math.random() < 0.5 ? ROAD_TYPES.INTERSECTION : ROAD_TYPES.T_JUNCTION;
      const newRoad = createRoadSegment(newRoadPos, direction, roadType);
      
      // Extend from this new road
      createIntersectionBranches(newRoad);
    }
  }
}

// Export functions
export { updateCity };