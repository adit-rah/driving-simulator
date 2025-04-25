import { scene } from './scene.js';
import { world } from './physics.js';
import { createStraightSegment, createIntersectionSegment, createLeftTurnSegment, createRightTurnSegment, createSShapedSegment } from './terrain_generation/roads.js';

// Create and position a straight segment
const straight = createStraightSegment(50, 20);
scene.add(straight.mesh);
world.addBody(straight.body);

// Create and position an intersection segment
const intersection = createIntersectionSegment(40);
intersection.mesh.position.set(0, 0, -60);
scene.add(intersection.mesh);
world.addBody(intersection.body);

// Create and position a left turn segment
const leftTurn = createLeftTurnSegment(50, 20, Math.PI / 6);
leftTurn.mesh.position.set(-20, 0, -120);
scene.add(leftTurn.mesh);
world.addBody(leftTurn.body);

// Create and position a right turn segment
const rightTurn = createRightTurnSegment(50, 20, Math.PI / 6);
rightTurn.mesh.position.set(20, 0, -120);
scene.add(rightTurn.mesh);
world.addBody(rightTurn.body);

// Create an S-shaped segment
const sSegment = createSShapedSegment(50, 20, Math.PI / 6, Math.PI / 6);
sSegment.mesh.position.set(0, 0, -180);
scene.add(sSegment.mesh);
// sSegment.body is null in this example
