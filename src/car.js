import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene } from './scene.js';
import { world } from './physics.js';

// INITIALIZATION ============================================================
// Constants for Movement
const engineForce = 2000;     // Force for movement
const steeringValue = 0.5;    // Steering sensitivity

// Chassis (visual)
const carGeo = new THREE.BoxGeometry(2, 1, 4); // Adjusted dimensions for a chassis
const carMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const chassisMesh = new THREE.Mesh(carGeo, carMat);
scene.add(chassisMesh);

// Chassis (physics)
const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
const chassisBody = new CANNON.Body({
  mass: 150,
  position: new CANNON.Vec3(0, 1, 0), // Start above the ground for suspension
});
chassisBody.addShape(chassisShape);
world.addBody(chassisBody);

// Create the vehicle using RaycastVehicle
const vehicle = new CANNON.RaycastVehicle({
  chassisBody: chassisBody,
  indexRightAxis: 0,   // X-axis
  indexUpAxis: 1,      // Y-axis
  indexForwardAxis: 2, // Z-axis
});

// Wheel options
const options = {
  radius: 0.5,
  directionLocal: new CANNON.Vec3(0, -1, 0),
  suspensionStiffness: 30,
  suspensionRestLength: 0.3,
  frictionSlip: 5,
  dampingRelaxation: 2.3,
  dampingCompression: 4.4,
  maxSuspensionForce: 100000,
  rollInfluence: 0.01,
  axleLocal: new CANNON.Vec3(-1, 0, 0), // left/right
  chassisConnectionPointLocal: new CANNON.Vec3(), // to be set per wheel
  maxSuspensionTravel: 0.3,
};

// Set up wheel positions relative to the chassis
const wheelPositions = [
  new CANNON.Vec3(-1, 0, 1.5),  // Front left
  new CANNON.Vec3(1, 0, 1.5),   // Front right
  new CANNON.Vec3(-1, 0, -1.5), // Rear left
  new CANNON.Vec3(1, 0, -1.5),  // Rear right
];

// Add wheels
wheelPositions.forEach((position, i) => {
  options.chassisConnectionPointLocal.copy(position);
  vehicle.addWheel(options);
});

// create wheel meshes
const wheelMeshes = [];
vehicle.wheelInfos.forEach((wheel) => {
  const wheelGeo = new THREE.CylinderGeometry(wheel.radius, wheel.radius, 0.4, 32);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
  
  // Rotate the wheel mesh so it's aligned properly
  wheelMesh.rotation.x = Math.PI / 2;
  
  scene.add(wheelMesh);
  wheelMeshes.push(wheelMesh);
});

// Now add the vehicle to the physics world
vehicle.addToWorld(world);

// Sync visual car with physical car
function updateCarPosition() {
  // Update the chassis mesh
  chassisMesh.position.copy(chassisBody.position);
  chassisMesh.quaternion.copy(chassisBody.quaternion);

  // Update the wheels
  for (let i = 0; i < vehicle.wheelInfos.length; i++) {
    vehicle.updateWheelTransform(i);
    const t = vehicle.wheelInfos[i].worldTransform;
    wheelMeshes[i].position.copy(t.position);
    wheelMeshes[i].quaternion.copy(t.quaternion);
  }
}

// MOVEMENT LOGIc ============================================================
function handleCarDrive(keys) {
  // Reset forces
  vehicle.setSteeringValue(0, 0);
  vehicle.setSteeringValue(0, 1);
  vehicle.applyEngineForce(0, 2);
  vehicle.applyEngineForce(0, 3);

  if (keys['w']) {
    vehicle.applyEngineForce(-engineForce, 2);
    vehicle.applyEngineForce(-engineForce, 3);
  }
  if (keys['s']) {
    vehicle.applyEngineForce(engineForce, 2);
    vehicle.applyEngineForce(engineForce, 3);
  }
  if (keys['a']) {
    vehicle.setSteeringValue(steeringValue, 0);
    vehicle.setSteeringValue(steeringValue, 1);
  }
  if (keys['d']) {
    vehicle.setSteeringValue(-steeringValue, 0);
    vehicle.setSteeringValue(-steeringValue, 1);
  }
}


export { vehicle, updateCarPosition, handleCarDrive };