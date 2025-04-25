import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene } from '../scene.js';
import { world } from '../physics.js';

let roadSegments = [];
let roadBodies = [];
let controlPoints = []; // Not used explicitly here
let currentEndPos = new THREE.Vector3(0, 0, 0);
let currentDir = new THREE.Vector3(0, 0, -1);

const roadWidth = 40;
const mainSegmentLength = 20;
const fillerSegmentLength = 5;

function initRoad() {
  currentEndPos.set(0, 0, 0);
  currentDir.set(0, 0, -1);
  // Pre-generate a few segments
  for (let i = 0; i < 10; i++) {
    addSegment(mainSegmentLength);
    addSegment(fillerSegmentLength);
  }
}

function createSegmentMesh(length) {
  const geometry = new THREE.PlaneGeometry(roadWidth, length);
  const material = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function createSegmentPhysics(length) {
  const halfWidth = roadWidth / 2;
  const halfLength = length / 2;
  const halfHeight = 0.1;
  const shape = new CANNON.Box(new CANNON.Vec3(halfWidth, halfHeight, halfLength));
  const body = new CANNON.Body({ mass: 0 });
  body.addShape(shape);
  return body;
}

function addSegment(length) {
  const newPos = currentEndPos.clone().add(currentDir.clone().multiplyScalar(length));
  const midPoint = new THREE.Vector3().addVectors(currentEndPos, newPos).multiplyScalar(0.5);
  const angle = Math.atan2(currentDir.x, currentDir.z);
  const mesh = createSegmentMesh(length);
  mesh.position.copy(midPoint);
  mesh.rotation.z = angle;
  scene.add(mesh);
  roadSegments.push(mesh);
  
  const body = createSegmentPhysics(length);
  body.position.set(midPoint.x, midPoint.y, midPoint.z);
  body.quaternion.setFromEuler(0, angle, 0);
  world.addBody(body);
  roadBodies.push(body);
  
  currentEndPos.copy(newPos);
  if (length === mainSegmentLength) {
    const maxTurn = Math.PI / 36;
    const turnAngle = (Math.random() - 0.5) * 2 * maxTurn;
    currentDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), turnAngle).normalize();
  }
}

function updateRoad(carPos) {
  while (currentEndPos.distanceTo(carPos) < mainSegmentLength * 20) {
    addSegment(mainSegmentLength);
    addSegment(fillerSegmentLength);
  }
  while (roadSegments.length > 0 && roadSegments[0].position.distanceTo(carPos) > mainSegmentLength * 30) {
    const oldMesh = roadSegments.shift();
    scene.remove(oldMesh);
    const oldBody = roadBodies.shift();
    world.removeBody(oldBody);
  }
}

initRoad();
export { updateRoad };
