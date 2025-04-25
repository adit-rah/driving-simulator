import { scene, renderer } from './scene.js';
import { chassisBody, updateCarPosition } from './car.js';
import { updateGroundTiles } from './ground.js';                                       // These files run only once :D
// import './buildings.js';
import { world, clock } from './physics.js';
import { handleControls } from './controls.js';
import { updateRendererSize } from './renderer.js';
import { camera, updateCameraPosition } from './camera.js'; // Import the camera update function
// import { updateRoad } from './terrain_generation/highways.js';
// import './test.js';
import { updateCity } from './city/city_generator.js';

// Initialize the renderer size to fit the screen
updateRendererSize();

// Reset player position
chassisBody.position.set(0, 1, 0);
chassisBody.velocity.set(0, 0, 0);
chassisBody.angularVelocity.set(0, 0, 0);

// Handle window resizing
window.addEventListener('resize', updateRendererSize);

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Handle controls (car movement)
  handleControls();

  // Progress the physics of the world
  world.step(1 / 60, delta, 3);

  // Update procedural world
  updateGroundTiles(chassisBody.position);
  updateCity(chassisBody.position);
  
  // Sync mesh with physics
  updateCarPosition();

  // Update camera position
  updateCameraPosition();

  // Render the scene from the camera's perspective
  renderer.render(scene, camera);
}

animate();
