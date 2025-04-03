import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene } from './scene.js';
import { world } from './physics.js';

// Buildings (Temp*)
const buildingCount = 20; // Number of buildings to add

for (let i = 0; i < buildingCount; i++) {
  // Random dimensions for each building
  const width = Math.random() * 10 + 5;  // Between 5 and 15
  const depth = Math.random() * 10 + 5;  // Between 5 and 15
  const height = Math.random() * 50 + 10; // Between 10 and 60

  const buildingGeo = new THREE.BoxGeometry(width, height, depth);
  const buildingMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(Math.random(), Math.random(), Math.random()),
  });
  const buildingMesh = new THREE.Mesh(buildingGeo, buildingMat);

  // Position buildings randomly within a range, and set Y so the base touches the ground
  const posX = Math.random() * 200 - 100;
  const posZ = Math.random() * 200 - 100;
  const posY = height / 2; // so the bottom is at y = 0

  buildingMesh.position.set(posX, posY, posZ);
  scene.add(buildingMesh);

  const buildingShape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
  const buildingBody = new CANNON.Body({
    mass: 0, // Static body, does not move
    position: new CANNON.Vec3(posX, posY, posZ),
    shape: buildingShape,
  });

  // Add physics body to the world
  world.addBody(buildingBody);
}