import { handleCameraFreeFly } from './camera.js';
import { handleCarDrive } from './car.js';
import { toggleDriverSeatLock } from './camera.js';
import * as debug from './debugging/debugData.js';

// This file looks purely at body movement controls, not camera movement. 
// If you want to look at camera movement logic, look at:    camera.js
// If you want to look at car movement logic, look at:       car.js

// CONSTANTS =================================================================
const keys = {};
// Flags 
let cameraFreeMovement = true; 
let cameraPhysicsMode = false;

// Now this isn't the best code, but this is purely for the debug menu, so it
// ultimately won't impact the system too much.
let flags = {
  'Camera Free Movement':  cameraFreeMovement, 
  'Camera Physics Mode':   cameraPhysicsMode,  
};
debug.updateFlags(flags); 

// FLAG TOGGLES ==============================================================
function togglePhysicsCamera() {
  cameraPhysicsMode = !cameraPhysicsMode;

  if (debug.ISDEBUGMODE) {
    flags['Camera Physics Mode'] = cameraPhysicsMode; 
    debug.updateFlags(flags); 
  }
}

function toggleFreeMovement() {
  cameraFreeMovement = !cameraFreeMovement;
  
  if (debug.ISDEBUGMODE) {
    flags['Camera Free Movement'] = cameraFreeMovement; 
    debug.updateFlags(flags); 
  }
}

// EVENT LISTENERS ===========================================================
window.addEventListener('keydown', (e) => {
  if (e.key === 'p') togglePhysicsCamera();
  if (e.key === 'h') toggleFreeMovement();
  if (e.key === 'l') toggleDriverSeatLock();
  keys[e.key.toLowerCase()] = true
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false
});

// MOVEMENT LOGIC ============================================================
export function handleControls() {
  if (cameraFreeMovement) {
    handleCameraFreeFly(cameraFreeMovement, cameraPhysicsMode, keys);
  } else {
    handleCarDrive(!cameraFreeMovement, keys); 
  }
}
