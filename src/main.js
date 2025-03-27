// main.js
import { scene, renderer } from './scene.js';
import { updateCarPosition } from './car.js';
import { groundBody, groundMesh } from './ground.js';
import { world, clock } from './physics.js';
import { handleControls } from './controls.js';
import { updateRendererSize } from './renderer.js';
import { camera, updateCameraPosition } from './camera.js'; // Import the camera update function

// Initialize the renderer size to fit the screen
updateRendererSize();

// Handle window resizing
window.addEventListener('resize', updateRendererSize);

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Handle controls (car movement)
  handleControls();

  // Progress the physics of the world
  world.step(1 / 60, delta, 3);

  // Sync mesh with physics
  updateCarPosition();

  // Update camera position
  updateCameraPosition();

  // Render the scene from the camera's perspective
  renderer.render(scene, camera);
}

animate();
