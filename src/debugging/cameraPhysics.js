import * as CANNON from 'cannon-es';
import { world } from '../physics.js';

// Creates a physical body for the camera, helps with collision with cars
// Not insanely useful, but nice to have for development.

const cameraDim = 0.5;
const cameraBody = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Box(new CANNON.Vec3(cameraDim, cameraDim * 2, cameraDim)),
  position: new CANNON.Vec3(0, 2, 0),       // start above ground
  fixedRotation: true,                      // prevent spinning
});
cameraBody.linearDamping = 0.9;             // for smoother stop
world.addBody(cameraBody);

export { cameraBody };