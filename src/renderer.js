import { renderer } from './scene.js';
import { camera } from './camera.js';

// Dynamically adjust the renderer size
export function updateRendererSize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height; // Update the camera's aspect ratio
  camera.updateProjectionMatrix();
}

// Calls this function on page load as well
updateRendererSize();
