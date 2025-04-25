import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Helper: Creates a road segment as a rectangular plane and a thin box physics body.
function createRoadSegment(length, width) {
  // Create the visual mesh (a plane)
  const geometry = new THREE.PlaneGeometry(length, width);
  const material = new THREE.MeshStandardMaterial({ color: 0x222222, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2; // lay flat

  // Create a physics body as a thin box.
  // Box half extents: width/2 (x), thickness/2 (y), length/2 (z)
  const thickness = 0.2;
  const halfExtents = new CANNON.Vec3(width / 2, thickness / 2, length / 2);
  const shape = new CANNON.Box(halfExtents);
  const body = new CANNON.Body({ mass: 0 });
  body.addShape(shape);
  // By default, the visual mesh is centered at (0,0,0) and so is the physics body.
  return { mesh, body };
}

// 1. Straight Road Segment
export function createStraightSegment(length = 50, width = 20) {
  const { mesh, body } = createRoadSegment(length, width);
  // Position the segment so that its front edge is at z=0 (adjust as needed)
  mesh.position.set(0, 0, -length / 2);
  body.position.set(0, 0, -length / 2);
  return { mesh, body };
}

// 2. Intersection Segment (Square)
export function createIntersectionSegment(size = 40) {
  return createRoadSegment(size, size);
}

// 3. Left Turn Segment
// For a left turn, we create a straight segment then rotate it about the Y-axis.
// Here, we assume the left turn segment is simply a rotated segment.
export function createLeftTurnSegment(length = 50, width = 20, turnAngle = Math.PI / 6) {
  const { mesh, body } = createRoadSegment(length, width);
  // Rotate the segment to the left by turnAngle
  mesh.rotation.y = turnAngle;
  body.quaternion.setFromEuler(0, turnAngle, 0);
  return { mesh, body };
}

// 4. Right Turn Segment
export function createRightTurnSegment(length = 50, width = 20, turnAngle = Math.PI / 6) {
  const { mesh, body } = createRoadSegment(length, width);
  // Rotate to the right (negative angle)
  mesh.rotation.y = -turnAngle;
  body.quaternion.setFromEuler(0, -turnAngle, 0);
  return { mesh, body };
}

// 5. S-Shaped Segment (combined left and right turn)
// For simplicity, this function returns a Group containing two segments.
// We won't provide a physics body for the combined segment.
export function createSShapedSegment(length = 50, width = 20, leftTurnAngle = Math.PI / 6, rightTurnAngle = Math.PI / 6) {
  const group = new THREE.Group();
  const leftSegment = createLeftTurnSegment(length, width, leftTurnAngle);
  const straightSegment = createStraightSegment(length, width);
  const rightSegment = createRightTurnSegment(length, width, rightTurnAngle);
  
  // Position the segments so they connect seamlessly
  leftSegment.mesh.position.set(0, 0, 0);
  straightSegment.mesh.position.set(0, 0, -length);
  rightSegment.mesh.position.set(0, 0, -2 * length);
  
  // Parent them in a group
  group.add(leftSegment.mesh);
  group.add(straightSegment.mesh);
  group.add(rightSegment.mesh);
  
  // Note: For physics, you'd need to create a compound body.
  return { mesh: group, body: null };
}