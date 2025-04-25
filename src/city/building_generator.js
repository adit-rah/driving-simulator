import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Building textures and materials - keep more variety for visual interest
const buildingMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.7 }),
  new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 }),
  new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 }),
  new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0x995533, roughness: 0.9 }), // Brick
  new THREE.MeshStandardMaterial({ color: 0x887744, roughness: 0.8 }), // Tan
  new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.6 }), // Blue-gray
  new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.7 })  // Brown
];

function generateBuildingsForBlock(blockPos, blockWidth, blockDepth, options = {}) {
  const buildings = [];
  const buildingCount = options.buildingCount || 10;
  const roadCorridorWidth = options.roadCorridorWidth || 20;
  const faceDirection = options.faceDirection || new THREE.Vector3(0, 0, -1);

  // Get the rotation for buildings to face the road
  const buildingRotation = Math.atan2(faceDirection.x, faceDirection.z);
  
  // Start at a random position within the block, avoiding the road corridor
  let prevPos = new THREE.Vector3(
    blockPos.x + (Math.random() - 0.5) * (blockWidth - roadCorridorWidth),
    0,
    blockPos.z + (Math.random() - 0.5) * blockDepth
  );

  for (let i = 0; i < buildingCount; i++) {
    // Random dimensions with variation based on position
    const distanceFromCenter = blockPos.length();
    
    // Downtown has taller buildings
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
    
    // Generate the building using simplified function
    let building = createSimpleBuilding(width, height, depth, distanceFromCenter);
    
    // Determine new position relative to the previous building
    const offset = new THREE.Vector3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20);
    let pos = prevPos.clone().add(offset);
    
    // Clamp x and z so the building remains within the block boundaries
    pos.x = THREE.MathUtils.clamp(pos.x, blockPos.x - blockWidth / 2, blockPos.x + blockWidth / 2);
    pos.z = THREE.MathUtils.clamp(pos.z, blockPos.z - blockDepth / 2, blockPos.z + blockDepth / 2);
    
    // If the building falls within the road corridor, shift it outside
    if (Math.abs(pos.x - blockPos.x) < roadCorridorWidth / 2) {
      pos.x = blockPos.x + (pos.x < blockPos.x ? -roadCorridorWidth / 2 : roadCorridorWidth / 2);
    }
    
    building.position.copy(pos);
    building.rotation.y = buildingRotation;
    buildings.push(building);
    
    // Create a corresponding physics body (static)
    const halfExtents = new CANNON.Vec3(width / 2, height / 2, depth / 2);
    const shape = new CANNON.Box(halfExtents);
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(shape);
    body.position.set(pos.x, height / 2, pos.z);
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), buildingRotation);
    
    // Store physics body on the building for later syncing
    building.userData.physicsBody = body;
    
    // Update prevPos to current building's position for the next iteration
    prevPos.copy(pos);
  }
  
  return buildings;
}

// Create a simple building without windows for better performance
function createSimpleBuilding(width, height, depth, distanceFromCenter) {
  // Pick appropriate building style and material based on distance from center
  const materialIndex = distanceFromCenter < 200 ? 
                        Math.floor(Math.random() * 5) : // Downtown uses modern materials
                        Math.floor(Math.random() * buildingMaterials.length); // Suburbs use all materials
  
  const buildingMat = buildingMaterials[materialIndex];
  
  // Determine if we should create a building with a roof
  const hasRoof = Math.random() > 0.5 && distanceFromCenter > 200;
  
  if (hasRoof) {
    // Building with roof
    const group = new THREE.Group();
    
    // Main building structure (slightly shorter to accommodate roof)
    const actualHeight = height * 0.85;
    const buildingGeo = new THREE.BoxGeometry(width, actualHeight, depth);
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = actualHeight / 2;
    group.add(building);
    
    // Simple roof
    const roofHeight = height * 0.15;
    const roofGeo = new THREE.ConeGeometry(Math.min(width, depth) * 0.7, roofHeight, 4);
    const roofMaterial = buildingMaterials[4]; // Dark color for roof
    const roof = new THREE.Mesh(roofGeo, roofMaterial);
    roof.position.y = actualHeight + roofHeight / 2;
    roof.rotation.y = Math.PI / 4; // Rotate to align corners with building
    group.add(roof);
    
    return group;
  } else {
    // Simple block building - just a single box
    const buildingGeo = new THREE.BoxGeometry(width, height, depth);
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = height / 2;
    
    return building;
  }
}

export { generateBuildingsForBlock };