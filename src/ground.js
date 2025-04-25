import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene } from './scene.js';
import { world } from './physics.js';

// Ground settings
const tileSize = 50;  // Size of each tile
const tileGridSize = 3; // 3x3 grid around the car
const groundTiles = new Map(); // Store tiles with "x,z" as keys

// Function to create a new ground tile
function createGroundTile(x, z) {
  const key = `${x},${z}`;
  if (groundTiles.has(key)) return;

  // THREE.js visual tile
  const groundGeo = new THREE.PlaneGeometry(tileSize, tileSize);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x9cad43 });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.set(x, -0.01, z);
  scene.add(groundMesh);

  // CANNON.js physics tile
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({ mass: 0 });
  groundBody.addShape(groundShape);
  groundBody.position.set(x, 0, z);
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  groundTiles.set(key, { groundMesh, groundBody });
}

// Function to update tiles around the car
function updateGroundTiles(carPos) {
  const carX = Math.round(carPos.x / tileSize) * tileSize;
  const carZ = Math.round(carPos.z / tileSize) * tileSize;

  const newTiles = new Set();
  for (let dx = -tileSize * tileGridSize; dx <= tileSize * tileGridSize; dx += tileSize) {
    for (let dz = -tileSize * tileGridSize; dz <= tileSize * tileGridSize; dz += tileSize) {
      const tileX = carX + dx;
      const tileZ = carZ + dz;
      createGroundTile(tileX, tileZ);
      newTiles.add(`${tileX},${tileZ}`);
    }
  }

  // Remove old tiles that are too far away
  for (const key of groundTiles.keys()) {
    if (!newTiles.has(key)) {
      const { groundMesh, groundBody } = groundTiles.get(key);
      scene.remove(groundMesh);
      world.removeBody(groundBody);
      groundTiles.delete(key);
    }
  }
}

export { updateGroundTiles };
