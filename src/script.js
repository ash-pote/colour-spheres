import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import GUI from "lil-gui";
import wobbleVertexShader from "./shaders/wobble/vertex.glsl";
import wobbleFragmentShader from "./shaders/wobble/fragment.glsl";

import blinder from "color-blind";
// var colorBlind = blinder.protanopia("#42dead");

function hslToHex(h, s, l) {
  // Convert saturation and lightness percentages to decimals
  s /= 100;
  l /= 100;

  // Helper function to convert hue to RGB
  const hueToRgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    // Achromatic (gray)
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h / 360 + 1 / 3);
    g = hueToRgb(p, q, h / 360);
    b = hueToRgb(p, q, h / 360 - 1 / 3);
  }

  // Convert each color component to hex and pad with zeros if necessary
  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

let result;

function handleRadioClick() {
  const selected = document.querySelector('input[name="colour"]:checked');
  result = selected.value;
}
const radioButtons = document.querySelectorAll('input[name="colour"]');

// Add click event listener to each radio button
radioButtons.forEach((radio) => {
  radio.addEventListener("click", handleRadioClick);
});
handleRadioClick();

/**
 * Base
 */
// Debug
// const gui = new GUI({ width: 325 });
// const debugObject = {};

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Loaders
const rgbeLoader = new RGBELoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("./draco/");
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Environment map
 */

/**
 * Wobble
 */
// Material

const uniforms = {
  uTime: new THREE.Uniform(0),
  uPositionFrequency: new THREE.Uniform(0.5),
  uTimeFrequency: new THREE.Uniform(0.4),
  uStrength: new THREE.Uniform(0.3),
  uWarpPositionFrequency: new THREE.Uniform(0.38),
  uWarpTimeFrequency: new THREE.Uniform(0.12),
  uWarpStrength: new THREE.Uniform(1.7),
  // uColorA: new THREE.Uniform(new THREE.Color(`hsl(10, 100%, 50%)`)),
  uColorA: new THREE.Uniform(new THREE.Color(255, 0, 0)),
};

const uniforms2 = {
  ...uniforms,
  uColorA: new THREE.Uniform(new THREE.Color(0x0000ff)), // Set to a different color, e.g., blue
};

let currentColor = uniforms.uColorA.value;
let targetColor = new THREE.Color(0xff0000);
let transitionDuration = 2.0;
let transitionStartTime = 0;
let transitioning = false;

let currentColor2 = uniforms2.uColorA.value;
let targetColor2 = new THREE.Color(0xff0000);

let currentPositionFrequency = uniforms.uPositionFrequency.value;
let targetPositionFrequency = currentPositionFrequency;
let transitionPositionDuration = 2.0; // Duration for position frequency transition
let transitionPositionStartTime = 0;
let transitioningPosition = false;

function interpolateColor(color1, color2, factor) {
  return color1.clone().lerp(color2, factor);
}

function interpolateValues(start, end, factor) {
  return start + (end - start) * factor;
}

let observedData = 0;
let hue = 10;

const element = document.getElementById("output");

const material = new CustomShaderMaterial({
  // CSM
  baseMaterial: THREE.MeshPhysicalMaterial,
  vertexShader: wobbleVertexShader,
  fragmentShader: wobbleFragmentShader,
  uniforms: uniforms,
  silent: true,

  // MeshPhysicalMaterial
  metalness: 0,
  roughness: 0.5,
  color: "#ffffff",
  transmission: 0,
  ior: 1.5,
  thickness: 1.5,
  transparent: true,
  wireframe: false,
});

const material2 = new CustomShaderMaterial({
  baseMaterial: THREE.MeshPhysicalMaterial,
  vertexShader: wobbleVertexShader,
  fragmentShader: wobbleFragmentShader,
  uniforms: uniforms2,
  silent: true,
  metalness: 0,
  roughness: 0.5,
  color: "#ffffff",
  transmission: 0,
  ior: 1.5,
  thickness: 1.5,
  transparent: true,
  wireframe: false,
});

const depthMaterial = new CustomShaderMaterial({
  // CSM
  baseMaterial: THREE.MeshDepthMaterial,
  vertexShader: wobbleVertexShader,
  uniforms: uniforms,
  silent: true,

  // MeshDepthMaterial
  depthPacking: THREE.RGBADepthPacking,
});

// Tweaks
// gui
//   .add(uniforms.uPositionFrequency, "value", 0, 2, 0.001)
//   .name("uPositionFrequency");
// gui.add(uniforms.uTimeFrequency, "value", 0, 2, 0.001).name("uTimeFrequency");
// gui.add(uniforms.uStrength, "value", 0, 2, 0.001).name("uStrength");
// gui
//   .add(uniforms.uWarpPositionFrequency, "value", 0, 2, 0.001)
//   .name("uWarpPositionFrequency");
// gui
//   .add(uniforms.uWarpTimeFrequency, "value", 0, 2, 0.001)
//   .name("uWarpTimeFrequency");
// gui.add(uniforms.uWarpStrength, "value", 0, 2, 0.001).name("uWarpStrength");
// // gui
// //   .addColor(debugObject, "colorA")
// //   .onChange(() => uniforms.uColorA.value.set(debugObject.colorA));
// gui.add(material, "metalness", 0, 1, 0.001);
// gui.add(material, "roughness", 0, 1, 0.001);
// gui.add(material, "transmission", 0, 1, 0.001);
// gui.add(material, "ior", 0, 10, 0.001);
// gui.add(material, "thickness", 0, 10, 0.001);

// Geometry
let geometry = new THREE.IcosahedronGeometry(2.5, 50);
geometry = mergeVertices(geometry);
geometry.computeTangents();

let geometry2 = new THREE.IcosahedronGeometry(2.5, 50);
geometry2 = mergeVertices(geometry);
geometry2.computeTangents();

// Mesh
const wobble = new THREE.Mesh(geometry, material);
wobble.customDepthMaterial = depthMaterial;
wobble.receiveShadow = true;
wobble.castShadow = true;
scene.add(wobble);
wobble.position.set(-3, 1, -3);

const wobble2 = new THREE.Mesh(geometry2, material2);
wobble2.customDepthMaterial = depthMaterial;
wobble2.receiveShadow = true;
wobble2.castShadow = true;

wobble2.position.set(0, 1, 3);
scene.add(wobble2);

// gltfLoader.load('./suzanne.glb', (gltf) =>
// {
//     const wobble = gltf.scene.children[0]
//     wobble.receiveShadow = true
//     wobble.castShadow = true
//     wobble.material = material
//     wobble.customDepthMaterial = depthMaterial

//     scene.add(wobble)
// })

/**
 * Plane
 */

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight("#ffffff", 3);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 1;
directionalLight.shadow.normalBias = 0.05;
directionalLight.position.set(1, 0, 0);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(13, -3, -5);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // Materials
  uniforms.uTime.value = elapsedTime;

  if (transitioning) {
    const progress = (elapsedTime - transitionStartTime) / transitionDuration;
    if (progress < 1) {
      // Interpolate color
      currentColor = interpolateColor(currentColor, targetColor, progress);
      currentColor2 = interpolateColor(currentColor2, targetColor2, progress);
      uniforms.uColorA.value.copy(currentColor);
      uniforms2.uColorA.value.copy(currentColor2);
    } else {
      // Transition finished
      currentColor.copy(targetColor);
      currentColor2.copy(targetColor2);
      transitioning = false; // Reset transition state
    }
  }

  if (transitioningPosition) {
    const progress =
      (elapsedTime - transitionPositionStartTime) / transitionPositionDuration;
    if (progress < 1) {
      currentPositionFrequency = interpolateValues(
        currentPositionFrequency,
        targetPositionFrequency,
        progress
      );
      uniforms.uPositionFrequency.value = currentPositionFrequency;
    } else {
      // Transition finished
      currentPositionFrequency = targetPositionFrequency;
      uniforms.uPositionFrequency.value = currentPositionFrequency;
      transitioningPosition = false; // Reset transition state
    }
  }

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

function updateObservedData() {
  observedData = Number(element.innerText);
  console.log("Observed Data Updated:", observedData);
  uniforms.uPositionFrequency.value = observedData;
  targetPositionFrequency = observedData;

  // hue = observedData * 350;
  hue = observedData * 200;
  console.log("Hue: " + hue);
  let hue2 = hue / 360;

  let hsl = hue;
  const hex = hslToHex(hsl, 100, 50);

  let colorBlind = blinder.deuteranopia(hex);

  uniforms.uColorA.value = new THREE.Color(colorBlind);
  uniforms2.uColorA.value.setHSL(hue2, 1, 0.5);

  // Set the new target color for the transition
  targetColor = new THREE.Color(colorBlind);
  targetColor2.setHSL(hue2, 1, 0.5);
  transitionStartTime = clock.getElapsedTime();
  transitioning = true; //
  transitionPositionStartTime = clock.getElapsedTime();
  transitioningPosition = true;

  return observedData;
}

const observer = new MutationObserver(updateObservedData);

observer.observe(element, {
  characterData: true,
  subtree: true,
  childList: true,
});

updateObservedData();

tick();
