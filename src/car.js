import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene } from './scene.js';
import { world } from './physics.js';

// INITIALIZATION ============================================================
// Constants for Movement
const force = 100;          // Force for movement
const turnSpeed = 2;        // Steering sensitivity

// Car (visual)
const carGeo = new THREE.BoxGeometry(1, 0.5, 2);
const carMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const carMesh = new THREE.Mesh(carGeo, carMat);
scene.add(carMesh);

// Car (physics)
const carBody = new CANNON.Body({
  mass: 150,
  shape: new CANNON.Box(new CANNON.Vec3(1, 0.5, 2)),
  position: new CANNON.Vec3(0, 0, 0), // Starting position
});
world.addBody(carBody);

// Sync visual car with physical car
function updateCarPosition() {
  carMesh.position.copy(carBody.position);
  carMesh.quaternion.copy(carBody.quaternion);
}

// MOVEMENT LOGIc ============================================================
function handleCarDrive(carControlFlag, keys) {
  if (!carControlFlag) return; // I don't know how this will occur but just in case. 

  if (keys['w']) carBody.applyForce(new CANNON.Vec3(0, 0, -force), carBody.position);
  if (keys['s']) carBody.applyForce(new CANNON.Vec3(0, 0, force), carBody.position);
  if (keys['a']) carBody.applyTorque(new CANNON.Vec3(0, turnSpeed, 0));
  if (keys['d']) carBody.applyTorque(new CANNON.Vec3(0, -turnSpeed, 0));
}

export { carBody, carMesh, updateCarPosition, handleCarDrive };
