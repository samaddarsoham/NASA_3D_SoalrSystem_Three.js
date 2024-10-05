import * as THREE from "https://cdn.skypack.dev/three@0.129.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";

let scene, camera, renderer, controls, sunLight;
let planets = {};
let orbitsVisible = true;
let studioLightingEnabled = false;
let currentPlanet = null;

// Revolution speeds (base speeds in radians per second)
const revolutionSpeeds = {
  mercury: 0.01,
  venus: 0.008,
  earth: 0.006,
  mars: 0.004,
  jupiter: 0.003,
  saturn: 0.002,
  uranus: 0.0015,
  neptune: 0.001
};

// Speed multiplier
let revolutionSpeedMultiplier = 1;

function createMaterialArray() {
  const skyboxImagepaths = ['../img/skybox/space_ft.png', '../img/skybox/space_bk.png', '../img/skybox/space_up.png', '../img/skybox/space_dn.png', '../img/skybox/space_rt.png', '../img/skybox/space_lf.png'];
  const materialArray = skyboxImagepaths.map((image) => {
    let texture = new THREE.TextureLoader().load(image);
    return new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
  });
  return materialArray;
}

function setSkyBox() {
  const materialArray = createMaterialArray();
  let skyboxGeo = new THREE.BoxGeometry(1000, 1000, 1000);
  const skybox = new THREE.Mesh(skyboxGeo, materialArray);
  scene.add(skybox);
}

function loadPlanetTexture(texture, radius, widthSegments, heightSegments, meshType) {
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const loader = new THREE.TextureLoader();
  const planetTexture = loader.load(texture);
  const material = meshType === 'standard' ? new THREE.MeshStandardMaterial({ map: planetTexture }) : new THREE.MeshBasicMaterial({ map: planetTexture });

  const planet = new THREE.Mesh(geometry, material);
  planets[texture.split('/').pop().split('_')[0]] = planet; // Store planet in planets object
  return planet;
}

function createRing(innerRadius, color) {
  let outerRadius = innerRadius - 0.1;
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 100);
  const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  setSkyBox();

  // Load planets
  const planetTextures = {
    sun: "../img/sun_hd.jpg",
    mercury: "../img/mercury_hd.jpg",
    venus: "../img/venus_hd.jpg",
    earth: "../img/earth_hd.jpg",
    mars: "../img/mars_hd.jpg",
    jupiter: "../img/jupiter_hd.jpg",
    saturn: "../img/saturn_hd.jpg",
    uranus: "../img/uranus_hd.jpg",
    neptune: "../img/neptune_hd.jpg"
  };

  for (const [name, texture] of Object.entries(planetTextures)) {
    const radius = name === 'sun' ? 20 : 4; // Adjust radius for the sun
    const meshType = name === 'sun' ? 'basic' : 'standard';
    const planet = loadPlanetTexture(texture, radius, 100, 100, meshType);
    scene.add(planet);
  }

  sunLight = new THREE.PointLight(0xffffff, 1, 0);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  // Create orbits
  createRing(50, 0xaaaaaa); // Mercury
  createRing(60, 0xffcc00); // Venus
  createRing(70, 0x0033cc); // Earth
  createRing(80, 0xff4500); // Mars
  createRing(100, 0xd7a86d); // Jupiter
  createRing(120, 0xe8c69b); // Saturn
  createRing(140, 0x66b2e8); // Uranus
  createRing(160, 0x0000ff); // Neptune

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 12;
  controls.maxDistance = 1000;
  camera.position.z = 100;

  // Add event listener for object selection
  document.getElementById('objectFilter').addEventListener('change', (event) => {
    if (event.target.selectedOptions.length > 0) {
      const selectedPlanet = event.target.selectedOptions[0].value;
      zoomToPlanet(selectedPlanet);
    }
  });

  // Add view mode change listener
  document.getElementById('viewMode').addEventListener('change', (event) => {
    if (event.target.value === 'first-person') {
      controls.enabled = false; // Disable orbit controls
      camera.position.set(0, 10, 10); // Position the camera for first-person view
      camera.lookAt(0, 0, 0); // Look at the center (the sun)
    } else {
      controls.enabled = true; // Enable orbit controls
    }
  });
}

function planetRevolver(time, speed, planet, orbitRadius) {
  const planetAngle = time * revolutionSpeedMultiplier * speed; // Use a slower base speed
  planet.position.x = 0 + orbitRadius * Math.cos(planetAngle);
  planet.position.z = 0 + orbitRadius * Math.sin(planetAngle);
}

function animate(time) {
  requestAnimationFrame(animate);
  
  const rotationSpeed = 0.005;
  for (const planet of Object.values(planets)) {
    planet.rotation.y += rotationSpeed;
  }

  // Revolve planets
  planetRevolver(time, revolutionSpeeds.mercury, planets.mercury, 50);
  planetRevolver(time, revolutionSpeeds.venus, planets.venus, 60);
  planetRevolver(time, revolutionSpeeds.earth, planets.earth, 70);
  planetRevolver(time, revolutionSpeeds.mars, planets.mars, 80);
  planetRevolver(time, revolutionSpeeds.jupiter, planets.jupiter, 100);
  planetRevolver(time, revolutionSpeeds.saturn, planets.saturn, 120);
  planetRevolver(time, revolutionSpeeds.uranus, planets.uranus, 140);
  planetRevolver(time, revolutionSpeeds.neptune, planets.neptune, 160);

  // Follow the current planet if one is selected
  if (currentPlanet) {
    const planet = planets[currentPlanet];
    camera.position.set(planet.position.x, planet.position.y + 10, planet.position.z + 20);
    camera.lookAt(planet.position);
  }

  controls.update();
  renderer.render(scene, camera);
}

function zoomToPlanet(planetName) {
  currentPlanet = planetName; // Set current planet for following
  const planet = planets[planetName];
  if (planet) {
    camera.position.set(planet.position.x, planet.position.y + 10, planet.position.z + 20);
    camera.lookAt(planet.position);

    // Update the info panel
    document.getElementById('objectInfo').innerText = `You are now viewing ${planetName.charAt(0).toUpperCase() + planetName.slice(1)}`;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Speed control handler
document.getElementById('speedControl').addEventListener('input', (event) => {
  revolutionSpeedMultiplier = event.target.value;
  document.getElementById('speedValue').innerText = event.target.value;
});

// Toggle orbits
function toggleOrbits() {
  orbitsVisible = !orbitsVisible;
  scene.children.forEach(child => {
    if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) {
      child.visible = orbitsVisible;
    }
  });
  document.getElementById('toggleOrbits').innerText = orbitsVisible ? "Hide Orbits" : "Show Orbits";
}

// Toggle studio lighting
function toggleLighting() {
  studioLightingEnabled = !studioLightingEnabled;
  const lights = scene.children.filter(child => child instanceof THREE.Light);
  lights.forEach(light => scene.remove(light));
  
  if (studioLightingEnabled) {
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10).normalize();

    scene.add(ambientLight);
    scene.add(directionalLight);
  } else {
    scene.add(sunLight);
  }
  
  document.getElementById('toggleLighting').innerText = studioLightingEnabled ? "Disable Studio Lighting" : "Enable Studio Lighting";
}

// Event listeners
document.getElementById('toggleOrbits').addEventListener('click', toggleOrbits);
document.getElementById('toggleLighting').addEventListener('click', toggleLighting);
window.addEventListener("resize", onWindowResize, false);

init();
animate(0);
