import * as THREE from 'three';
import { Track } from './track.js?v=elev5';
import { Hud } from './hud.js?v=elev5';
import { initialCars, nextGeneration } from './evolution.js?v=elev5';

const CAMERA_MODES = ['chase', 'top', 'hero', 'orbit'];

const state = {
  renderer: null,
  scene: null,
  camera: null,
  track: null,
  cars: [],
  generation: 1,
  frameCounter: 0,
  bestScore: 0,
  allTimeBest: 0,
  bestLapTime: Infinity,
  genBestLap: Infinity,
  lapHistory: [],
  bestCar: null,
  followCar: null, // sticky — only reassigned when it dies/finishes or gen resets
  cameraMode: 'chase',
  settings: {
    numCars: 30,
    mutationRate: 0.3,
    speedMult: 1.0,
    useTimeout: false,
    maxFrames: 1200,
    trackName: 'Monaco',
  },
  orbit: { azimuth: 0.4, elevation: 0.6, distance: 400, target: new THREE.Vector3() },
  hud: null,
};

function init() {
  const canvas = document.getElementById('webgl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  state.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e1a);
  scene.fog = new THREE.Fog(0x0a0e1a, 1400, 5200);
  state.scene = scene;

  // Sky gradient dome
  const skyGeo = new THREE.SphereGeometry(6500, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x0a1530) },
      bottomColor: { value: new THREE.Color(0x2a4a7a) },
      offset: { value: 400 },
      exponent: { value: 0.7 },
    },
    vertexShader: `varying vec3 vWorldPos;
      void main(){ vWorldPos = (modelMatrix * vec4(position,1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor;
      uniform float offset; uniform float exponent; varying vec3 vWorldPos;
      void main(){
        float h = normalize(vWorldPos + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent), 0.0)), 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  // Lighting
  const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x1a2438, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d0, 1.6);
  sun.position.set(1200, 1800, 800);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 200;
  sun.shadow.camera.far = 6000;
  sun.shadow.camera.left = -3200;
  sun.shadow.camera.right = 3200;
  sun.shadow.camera.top = 3200;
  sun.shadow.camera.bottom = -3200;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 11000);
  camera.position.set(0, 300, 400);
  state.camera = camera;

  state.track = new Track(state.settings.trackName);
  scene.add(state.track.mesh);
  state.cars = initialCars(state);

  // HUD
  state.hud = new Hud(document.getElementById('hud'));

  setupControls();
  setupOrbitInput(canvas);

  window.addEventListener('resize', onResize);
  requestAnimationFrame(tick);
}

function onResize() {
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();
  state.hud.resize();
}

function setupControls() {
  const $ = (id) => document.getElementById(id);
  const sync = () => {
    $('speedVal').textContent = (+$('speed').value).toFixed(1) + 'x';
    $('mutVal').textContent = (+$('mutation').value).toFixed(2);
  };
  $('speed').addEventListener('input', () => {
    sync();
    const v = parseFloat($('speed').value) || 1.0;
    state.settings.speedMult = v;
    for (const c of state.cars) c.speedMult = v;
  });
  $('mutation').addEventListener('input', sync);
  sync();

  $('applyBtn').addEventListener('click', () => {
    state.settings.numCars = parseInt($('numCars').value) || 30;
    state.settings.speedMult = parseFloat($('speed').value) || 1.0;
    state.settings.mutationRate = parseFloat($('mutation').value) || 0.3;
    state.settings.useTimeout = $('useTimeout').checked;
    state.settings.maxFrames = parseInt($('timeout').value) || 1200;
    const newTrack = $('trackSelect').value;
    if (newTrack !== state.settings.trackName) {
      state.settings.trackName = newTrack;
      for (const c of state.cars) state.scene.remove(c.group);
      state.scene.remove(state.track.mesh);
      state.track = new Track(newTrack);
      state.scene.add(state.track.mesh);
      state.cars = initialCars(state);
      state.generation = 1;
      state.lapHistory = [];
      state.bestLapTime = Infinity;
      state.genBestLap = Infinity;
      state.frameCounter = 0;
    } else {
      for (const c of state.cars) state.scene.remove(c.group);
      state.cars = initialCars(state);
      state.frameCounter = 0;
    }
  });

  $('hideBtn').addEventListener('click', () => {
    $('controls').style.display = 'none';
    $('toggleBtn').style.display = 'block';
  });
  $('toggleBtn').addEventListener('click', () => {
    $('controls').style.display = 'block';
    $('toggleBtn').style.display = 'none';
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'c' || e.key === 'C') {
      const i = CAMERA_MODES.indexOf(state.cameraMode);
      state.cameraMode = CAMERA_MODES[(i + 1) % CAMERA_MODES.length];
    }
    if (e.key === 'r' || e.key === 'R') nextGeneration(state);
  });
}

function setupOrbitInput(canvas) {
  let dragging = false;
  let lx = 0, ly = 0;
  canvas.addEventListener('mousedown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx;
    const dy = e.clientY - ly;
    lx = e.clientX;
    ly = e.clientY;
    state.orbit.azimuth -= dx * 0.008;
    state.orbit.elevation = Math.max(0.1, Math.min(1.4, state.orbit.elevation - dy * 0.006));
  });
  canvas.addEventListener('wheel', (e) => {
    state.orbit.distance = Math.max(100, Math.min(1800, state.orbit.distance + e.deltaY * 0.8));
  }, { passive: true });
}

function updateCamera() {
  const cam = state.camera;
  const best = state.followCar || state.bestCar;
  const target = new THREE.Vector3();

  if (best) {
    target.set(best.pos.x, (best.pos.y || 0) + 4, best.pos.z);
  } else {
    target.set(0, 4, 0);
  }

  switch (state.cameraMode) {
    case 'chase': {
      if (!best) return;
      const by = (best.pos.y || 0);
      const behind = 38;
      const height = 15;
      const ahead = 22;
      const bx = best.pos.x - Math.cos(best.angle) * behind;
      const bz = best.pos.z - Math.sin(best.angle) * behind;
      cam.position.lerp(new THREE.Vector3(bx, by + height, bz), 0.06);
      if (!state.camLook) state.camLook = new THREE.Vector3(best.pos.x, by + 3, best.pos.z);
      state.camLook.lerp(
        new THREE.Vector3(
          best.pos.x + Math.cos(best.angle) * ahead,
          by + 3,
          best.pos.z + Math.sin(best.angle) * ahead,
        ),
        0.08,
      );
      cam.lookAt(state.camLook);
      break;
    }
    case 'hero': {
      if (!best) return;
      const by = (best.pos.y || 0);
      const side = Math.cos(best.angle) * 28 - Math.sin(best.angle) * 50;
      const fwd = Math.sin(best.angle) * 28 + Math.cos(best.angle) * 50;
      cam.position.lerp(new THREE.Vector3(best.pos.x + side, by + 9, best.pos.z + fwd), 0.04);
      if (!state.camLook) state.camLook = new THREE.Vector3(best.pos.x, by + 3, best.pos.z);
      state.camLook.lerp(new THREE.Vector3(best.pos.x, by + 3, best.pos.z), 0.08);
      cam.lookAt(state.camLook);
      break;
    }
    case 'top': {
      cam.position.lerp(new THREE.Vector3(target.x, 620, target.z + 60), 0.04);
      if (!state.camLook) state.camLook = new THREE.Vector3(target.x, 0, target.z);
      state.camLook.lerp(target, 0.06);
      cam.lookAt(state.camLook);
      break;
    }
    case 'orbit':
    default: {
      state.orbit.target.lerp(target, 0.1);
      const { azimuth, elevation, distance, target: t } = state.orbit;
      const x = t.x + Math.cos(azimuth) * Math.cos(elevation) * distance;
      const y = t.y + Math.sin(elevation) * distance;
      const z = t.z + Math.sin(azimuth) * Math.cos(elevation) * distance;
      cam.position.set(x, y, z);
      cam.lookAt(t);
    }
  }
}

function tick() {
  requestAnimationFrame(tick);

  // Simulate
  let bestAlive = null;
  let bestAliveScore = -Infinity;
  let bestAny = null;
  let bestAnyScore = -Infinity;
  let aliveCount = 0;
  for (const car of state.cars) {
    car.update();
    if (car.finished) {
      if (car.lapTime < state.genBestLap) state.genBestLap = car.lapTime;
      if (car.lapTime < state.bestLapTime) state.bestLapTime = car.lapTime;
    }
    if (car.alive && !car.finished) {
      aliveCount++;
      if (car.score > bestAliveScore) {
        bestAliveScore = car.score;
        bestAlive = car;
      }
    }
    if (car.score > bestAnyScore) {
      bestAnyScore = car.score;
      bestAny = car;
    }
    car.syncMesh();
  }
  state.bestCar = bestAlive || bestAny;

  // Sticky camera subject: keep following the same car until it dies or
  // finishes — switching every frame to "whoever leads right now" is what
  // makes the view feel like it is teleporting between cars.
  const cur = state.followCar;
  const curValid = cur && cur.alive && !cur.finished && state.cars.includes(cur);
  if (!curValid) {
    state.followCar = bestAlive || bestAny;
  }

  state.frameCounter++;
  if (aliveCount === 0 || (state.settings.useTimeout && state.frameCounter > state.settings.maxFrames)) {
    nextGeneration(state);
  }

  updateCamera();
  state.renderer.render(state.scene, state.camera);
  state.hud.render(state);
}

init();
