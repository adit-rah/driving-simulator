import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene } from './scene.js';
import { world } from './physics.js';
import { modelLoader } from './scene.js';

// INITIALIZATION ============================================================
// Car Chassis (Physics & Visual) ============================================
const carWidth = 2.5;
const carLength = 4; 
const chassisThickness = 0.1; 
const chassisGeo = new THREE.BoxGeometry(carWidth, chassisThickness, carLength);
const chassisMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);

const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
const chassisBody = new CANNON.Body({
  mass: 150,
  position: new CANNON.Vec3(0, 1, 0), // start above the ground so suspension works
});
chassisBody.addShape(chassisShape);
world.addBody(chassisBody);

// Steering Wheel (Vanity)
let steeringWheel;
const steeringPivot = new THREE.Object3D();

modelLoader.load('/assets/steering_wheel_l505.glb', (gltf) => {
  steeringWheel = gltf.scene;
  steeringWheel.scale.set(7, 7, 7);
  
  steeringWheel.position.set(0, -1.66, 0); // Center the wheel

  steeringPivot.add(steeringWheel);
  steeringPivot.position.set(0.5, 1, 1.5); // Position relative to the car
  
  steeringPivot.rotation.x = Math.PI * 1/6;
  chassisMesh.add(steeringPivot); // Attach to car
});

scene.add(chassisMesh);

// Wheels (Physics & Visual) =================================================
const vehicle = new CANNON.RaycastVehicle({ // create a vehicle
  chassisBody: chassisBody,
  indexRightAxis: 0,            // X-axis is right
  indexUpAxis: 1,               // Y-axis is up
  indexForwardAxis: 2,          // Z-axis is forward
});

const wheelOptions = {  // wheel properties
  radius: 0.5,
  directionLocal: new CANNON.Vec3(0, -1, 0),   // Suspension goes downward
  suspensionStiffness: 30,
  suspensionRestLength: 0.4,
  frictionSlip: 5,
  dampingRelaxation: 2.3,
  dampingCompression: 4.4,
  maxSuspensionForce: 100000,
  rollInfluence: 0.01,
  axleLocal: new CANNON.Vec3(1, 0, 0),         // Axle points to the right
  chassisConnectionPointLocal: new CANNON.Vec3(), // To be set per wheel
  maxSuspensionTravel: 0.3,
};

const wheelOffset = 1;          // distance from the corner
const wheelPositions = [
  new CANNON.Vec3(-carWidth/2, 0, (carLength-wheelOffset)/2),  // Front left
  new CANNON.Vec3(carWidth/2, 0, (carLength-wheelOffset)/2),   // Front right
  new CANNON.Vec3(-carWidth/2, 0, -(carLength-wheelOffset)/2), // Rear left
  new CANNON.Vec3(carWidth/2, 0, -(carLength-wheelOffset)/2),  // Rear right
];

// Add wheels to the vehicle
wheelPositions.forEach((position) => {
  wheelOptions.chassisConnectionPointLocal.copy(position);
  vehicle.addWheel(wheelOptions);
});

let wheelModel;
const wheelScale = 0.0045;
const wheelMeshes = [];
modelLoader.load('/assets/wheel.glb', (gltf) => {
  wheelModel = gltf.scene;
  wheelModel.scale.set(wheelScale, wheelScale, wheelScale); 
  
  vehicle.wheelInfos.forEach((wheelInfo, index) => {
    const wheelMesh = wheelModel.clone();
    scene.add(wheelMesh);
    wheelMeshes.push(wheelMesh);
  });
});
vehicle.addToWorld(world);

// PHYSICS SYNCHRONIZER ======================================================
function updateCarPosition() {
  // Sync chassis
  chassisMesh.position.copy(chassisBody.position);
  chassisMesh.quaternion.copy(chassisBody.quaternion);

  // Sync wheels:
  for (let i = 0; i < vehicle.wheelInfos.length; i++) {
    vehicle.updateWheelTransform(i);
    const t = vehicle.wheelInfos[i].worldTransform;
    
    if (wheelMeshes[i]) {
      const correctionQuat = new THREE.Quaternion();
      if (i === 1 || i === 3) {
        correctionQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI/2);
      } else {
        correctionQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI/2);
      }
      
      wheelMeshes[i].position.copy(t.position);
      wheelMeshes[i].quaternion.copy(t.quaternion);
      wheelMeshes[i].quaternion.multiply(correctionQuat);
    }
  }

  // Sync Steering Wheel Rotation
  if (steeringPivot) {
    const frontLeftSteer = vehicle.wheelInfos[0].steering;
    const rotationAmount = -frontLeftSteer * Math.PI * 3;
    steeringPivot.rotation.z = rotationAmount; 
  }
}

// MOVEMENT HANDLING ========================================================
const engineForceValue = 500;

let currentSteering = 0;
const maxSteeringAngle = 0.6;  // Maximum steering angle (in radians)
const steeringIncrement = 0.02;  // How much to change per frame
const steeringDecay = 0.05;  // How quickly the steering returns to 0

function handleCarDrive(flag, keys) {
  if (!flag) return; 

  vehicle.applyEngineForce(0, 2);
  vehicle.applyEngineForce(0, 3);

  const steeringAngle = 0.5;

  // Accelerate forward
  if (keys['w']) {
    vehicle.applyEngineForce(-engineForceValue, 2); // Rear left wheel
    vehicle.applyEngineForce(-engineForceValue, 3); // Rear right wheel
  }
  // Reverse / brake
  if (keys['s']) {
    vehicle.applyEngineForce(engineForceValue, 2);
    vehicle.applyEngineForce(engineForceValue, 3);
  }
  
  // Gradually adjust steering based on keys
  if (keys['a']) {
    currentSteering += steeringIncrement;
    if (currentSteering > maxSteeringAngle) currentSteering = maxSteeringAngle;
  } else if (keys['d']) {
    currentSteering -= steeringIncrement;
    if (currentSteering < -maxSteeringAngle) currentSteering = -maxSteeringAngle;
  } else {
    // No steering key is pressed, gradually return steering angle to zero
    if (currentSteering > steeringDecay) {
      currentSteering -= steeringDecay;
    } else if (currentSteering < -steeringDecay) {
      currentSteering += steeringDecay;
    } else {
      currentSteering = 0;
    }
  }

  vehicle.setSteeringValue(currentSteering, 0);
  vehicle.setSteeringValue(currentSteering, 1);
}

export { vehicle, chassisBody, updateCarPosition, handleCarDrive };
