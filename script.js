
import * as THREE from "https://cdn.skypack.dev/three@0.129.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";

let scene, camera, renderer, controls;
let earth = null; // Earth
let moon = null; // Moon
let satellites = []; // Array for satellites
let moonRevolutionSpeed = 0.002; // Initial speed for realistic revolution
const moonRotationSpeed = 0.005; // Set a slower rotation speed for the Moon
let moonAngle = 0; // Angle for Moon's revolution
const raycaster = new THREE.Raycaster(); // Raycaster for click detection
const mouse = new THREE.Vector2(); // Mouse coordinates
let focusedObject = null; // Currently focused object

// Function to fetch planet data
async function fetchPlanetData() {
  try{
  const response = await fetch("https://nasabackendofficial.onrender.com/api/v1/planets/each/Earth"); // Adjust the endpoint as necessary
    
    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }
    const data = await response.json();
    // Assuming the response contains a 'name' property
    const planetName = data.data[0].PlanetName|| "Unknown Planet";

    document.querySelector('.planet').textContent =planetName;
    document.querySelector('.Ecc').textContent = data.data[0].Eccentricity;
    document.querySelector('.Semi').textContent =  data.data[0].SemiMajorAxis; 
    document.querySelector('.Incli').textContent =  data.data[0].Inclination; 
    document.querySelector('.Long').textContent =  data.data[0].Longitude;
    document.querySelector('.Mean').textContent =  data.data[0].MeanAnomaly; 
    document.querySelector('.True').textContent = data.data[0].TrueAnomaly; 
    document.querySelector('.Argue').textContent =  data.data[0].ArgumentOfPeriapsis; 

  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error);
    document.querySelector('.planet').textContent = "Error fetching planet data"; // Handle errors gracefully
  }
}

// Call the function to fetch planet data
fetchPlanetData();

function createMaterialArray() {
  const skyboxImagepaths = [
    '../img/skybox/space_ft.png',
    '../img/skybox/space_bk.png',
    '../img/skybox/space_up.png',
    '../img/skybox/space_dn.png',
    '../img/skybox/space_rt.png',
    '../img/skybox/space_lf.png'
  ];
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

function loadPlanetTexture(texture, radius, widthSegments, heightSegments) {
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const planet = new THREE.Mesh(geometry, material);
  return planet;
}

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  setSkyBox(); // Add skybox for stars and space

  // Preload Earth texture
  const earthTextureLoader = new THREE.TextureLoader();
  earthTextureLoader.load("../img/earth_hd.jpg", (texture) => {
    earth = loadPlanetTexture(texture, 45, 100, 100); // Radius to 45
    earth.position.set(0, 0, 0); // Keep Earth in the center
    scene.add(earth);
    
    // Preload Mercury texture for the Moon
    const moonTextureLoader = new THREE.TextureLoader();
    moonTextureLoader.load("../img/mercury_hd.jpg", (texture) => {
      moon = loadPlanetTexture(texture, 8, 32, 32); // Half the size of the original moon
      moon.position.set(70, 0, 50); // Position Moon on the orbit
      scene.add(moon);
      
      // Load satellites
      const satelliteFiles = [
        { path: "../img/ImageToStl.com_3landsat9parts.glb", angleOffset: 1 },
        { path: "../img/Aura.glb", angleOffset: Math.PI / 4 },
        { path: "../img/ISS_stationary.glb", angleOffset: Math.PI / 3 },
        { path: "../img/jwst_james_webb_space_telescope.glb", angleOffset: Math.PI / 2 },
        { path: "../img/starlink_spacex_satellite.glb", angleOffset: Math.PI * 5 / 6 },
        { path: "../img/hubble.glb", angleOffset: Math.PI / 6 },
      ];

      const gltfLoader = new GLTFLoader();
      satelliteFiles.forEach(({ path, angleOffset }) => {
        gltfLoader.load(path, (gltf) => {
          const satellite = gltf.scene;
          satellite.scale.set(0.2, 0.2, 0.2); // Set all satellites to the same size
          satellite.position.set(60 * Math.cos(angleOffset), 60 * Math.sin(angleOffset), 0); // Initial position
          
          satellites.push({ model: satellite, angleOffset }); // Store the satellite and its angle
          scene.add(satellite); // Add to scene
        });
      });

      // Create lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 1); // Soft white light
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Bright white light
      directionalLight.position.set(0, 50, 50).normalize(); // Position the light towards satellites
      scene.add(directionalLight);
      
      // Start rendering after the textures are loaded
      animate();
    });
  });

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  
  // Initialize controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true; // Enable zooming
  controls.enablePan = true; // Enable panning
  controls.target.set(5, 5, 5); // Set target to the Earth
  controls.update(); // Update controls
  camera.position.set(-20, 100, 90); // Set camera position
  
  // Add click event listener
  window.addEventListener('click', onMouseClick, true);
}

function onMouseClick(event) {
  // Calculate mouse position in normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(satellites.map(sat => sat.model).concat(moon));

  if (intersects.length > 0) {
    focusedObject = intersects[0].object; // Get the first intersected object
  }
}

function animate() {
  requestAnimationFrame(animate);
  
  // Rotate Earth around its axis
  if (earth) {
    earth.rotation.y += 0.01; // Adjust the speed of rotation as needed
  }

  // Move Moon in orbit around Earth
  if (moon) {
    moonAngle += moonRevolutionSpeed; // Increment the angle
    moon.position.x = 70 * Math.cos(moonAngle); // Update position based on angle (orbit radius)
    moon.position.z = 70 * Math.sin(moonAngle); // Update position based on angle (orbit radius)
    
    // Rotate the Moon around its axis to match its revolution
    moon.rotation.y += moonRotationSpeed; // Slower rotation speed for the Moon
  }

  // Move satellites in orbit around Earth
  if (satellites.length > 0) {
    satellites.forEach(({ model, angleOffset }) => {
      const satelliteAngle = moonAngle + angleOffset; // Use moon angle with offset
      model.position.x = 60 * Math.cos(satelliteAngle); // Update position based on angle
      model.position.z = 60 * Math.sin(satelliteAngle); // Update position based on angle
    });
  }

  // Follow the focused object
  if (focusedObject) {
    const boundingBox = new THREE.Box3().setFromObject(focusedObject);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3()).length();
    const distance = size * 0.4; // Adjust distance to fit the object

    camera.position.lerp(new THREE.Vector3(center.x, center.y, center.z + distance * 1.5), 0.1); // Smoothly interpolate camera position
    camera.lookAt(center); // Look at the focused object
  }

  controls.update(); // Update the controls
  renderer.render(scene, camera); // Render the scene
}

// Handle window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

init(); // Initialize the scene and start rendering
