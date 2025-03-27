import * as THREE from 'three';
import { cameraBody } from './debugging/cameraPhysics.js';
import * as debug from './debugging/debugData.js';

// INITIALIZATION ============================================================
// Variables for rotation control
const rotationSpeed = 0.002;  // Sensitivity of the camera rotation
let yaw = 0;                  // Horizontal rotation (yaw)
let pitch = 0;                // Vertical rotation (pitch)
let isMouseLocked = false;    // Track if the mouse is locked

let flags = {
  'Camera Lock':  isMouseLocked,  
};
debug.updateFlags(flags); 

// Maximum and minimum pitch (to avoid flipping)
const MAX_PITCH = Math.PI / 2 - 0.1;    // Can't look directly up
const MIN_PITCH = -Math.PI / 2 + 0.1;   // Can't look directly down

// Debug Constant(s)
const moveSpeed = 0.1;        // Camera Free Fly speed

// Camera Initialization
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraOffset = new THREE.Vector3(0, 1.5, 0);      // Offset for the camera position

// Function to lock and unlock the cursor
function toggleCursorLock() {
  if (isMouseLocked) {
    document.exitPointerLock();
    document.body.style.cursor = "auto";
  } else {
    document.body.requestPointerLock();
    document.body.style.cursor = "none";
  }
  isMouseLocked = !isMouseLocked;
  
  if (debug.ISDEBUGMODE) {
    flags['Camera Lock'] = isMouseLocked; 
    debug.updateFlags(flags); 
  }
}

// temporary event listeners 

// Mouse events to track mouse movement
window.addEventListener('mousemove', (event) => {
  if (isMouseLocked) {
    const deltaX = event.movementX;   // Movement in X (horizontal)
    const deltaY = event.movementY;   // Movement in Y (vertical)

    yaw -= deltaX * rotationSpeed;    // Yaw rotates around Y axis (left/right)
    pitch -= deltaY * rotationSpeed;  // Pitch rotates around X axis (up/down)

    // Clamp the pitch to prevent unnatural camera flipping
    pitch = Math.max(Math.min(pitch, MAX_PITCH), MIN_PITCH);
  }
});

// Listen for the key press to toggle cursor lock (for example, the 'C' key)
window.addEventListener('keydown', (event) => {
  if (event.key === 'c' || event.key === 'C') {
    toggleCursorLock();
  }
});

// MOVEMENT LOGIc ============================================================
export function updateCameraPosition() {
  // Look at the car's position, ensuring the camera maintains focus

  // const carPosition = new THREE.Vector3(carBody.position.x, carBody.position.y, carBody.position.z);
  // camera.position.copy(carPosition).add(cameraOffset);
  // camera.lookAt(carPosition);
  // gone for now. 

  // Apply the yaw (rotation around the Y axis) and pitch (rotation around the X axis)
  const rotationQuaternion = new THREE.Quaternion();
  rotationQuaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  camera.rotation.setFromQuaternion(rotationQuaternion);
}

function handleCameraFreeFly(freeMovementFlag, physicsModeFlag, keys) {
  if (!freeMovementFlag) return; // guard clause

  const direction = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  camera.getWorldDirection(forward);  // Calculate camera direction vectors
  forward.y = 0;                      // Prevent looking up/down from affecting vertical movement
  forward.normalize();

  right.crossVectors(forward, camera.up).normalize();

  // Accumulate movement
  if (keys['w']) direction.add(forward);
  if (keys['s']) direction.sub(forward);
  if (keys['a']) direction.sub(right);
  if (keys['d']) direction.add(right);
  if (keys[' ']) direction.y += 1;
  if (keys['shift']) direction.y -= 1;
  direction.normalize().multiplyScalar(moveSpeed);

  if (physicsModeFlag) {
    cameraBody.velocity.set(direction.x, direction.y, direction.z);
    camera.position.copy(cameraBody.position);
  } else {
    camera.position.add(direction);           
  }
}

export { camera, handleCameraFreeFly };
