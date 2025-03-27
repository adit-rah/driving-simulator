import * as THREE from 'three';

// Initializes the scene. There isn't much, if any, logic in this file.

const skyColor = 0x87ceeb;                          // Sky blue
const lightColor = 0xffffff;                        // Soft white light

const scene = new THREE.Scene();
scene.background = new THREE.Color(skyColor);

// Add some light :D. you can't see color without it!
const ambientLight = new THREE.AmbientLight(lightColor, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(lightColor, 1);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Built in Light Direction Visualizer. Uncomment, if you want to see
// const helper = new THREE.DirectionalLightHelper(directionalLight, 5);
// scene.add(helper);

// Create renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);

export { scene, renderer };
