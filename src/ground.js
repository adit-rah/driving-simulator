import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { scene } from './scene.js';
import { world } from './physics.js';

// Ground (physics)
const groundBody = new CANNON.Body({
  shape: new CANNON.Plane(),
  mass: 0,
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// Ground (visual)
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x909bad }); // Changed to brown for a dirt-like ground color
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.copy(groundBody.position); 
scene.add(groundMesh);

export { groundBody, groundMesh };
