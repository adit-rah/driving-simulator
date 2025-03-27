import * as CANNON from 'cannon-es';
import * as THREE from 'three';

// Physics world
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// Clock for time-based animations
const clock = new THREE.Clock();

export { world, clock };
