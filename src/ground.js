import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene } from './scene.js';
import { world } from './physics.js';

// Define ground dimensions
const groundWidth = 200;
const groundDepth = 200;
const groundThickness = 1;  // Thickness of the ground

// Ground (Visual)
// Create a large plane geometry for the ground
const groundGeo = new THREE.PlaneGeometry(groundWidth, groundDepth);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x909bad });
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.rotation.x = -Math.PI / 2;  // Rotate so it's horizontal
scene.add(groundMesh);

// Ground (Physics)
// Instead of an infinite plane, use a box shape for the ground.
// We want the top of the box (half-thickness) to be at y = 0.
const halfExtents = new CANNON.Vec3(groundWidth / 2, groundThickness / 2, groundDepth / 2);
const groundShape = new CANNON.Box(halfExtents);
const groundBody = new CANNON.Body({
  mass: 0,  // Static ground
});
groundBody.addShape(groundShape);
// Position the ground body so that its top surface is at y=0.
groundBody.position.set(0, -groundThickness / 2, 0);
world.addBody(groundBody);

export { groundBody, groundMesh };
