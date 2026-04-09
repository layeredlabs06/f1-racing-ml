import * as THREE from 'three';
import { NeuralCar, F1_TEAMS } from './nn.js?v=elev2';
import { SENSOR_LENGTH } from './track.js?v=elev2';

const CAR_LENGTH = 14;
const SENSOR_ANGLES = [-Math.PI / 2.5, -Math.PI / 5, 0, Math.PI / 5, Math.PI / 2.5];

export class Car {
  constructor(track, brain, teamIdx, speedMult) {
    this.track = track;
    const start = track.getStartPos();
    this.pos = { x: start.pos.x, y: start.pos.y || 0, z: start.pos.z };
    this.angle = start.angle;
    this.speed = 0;
    this.alive = true;
    this.score = 0;
    this.maxProgress = 0;
    this.lastProgress = 0;
    this.totalProgress = 0;
    this.stuckFrames = 0;
    this.lapTime = 0;
    this.finished = false;
    this.speedMult = speedMult;
    this.brain = brain || new NeuralCar();
    this.team = F1_TEAMS[teamIdx % F1_TEAMS.length];
    this.sensors = new Array(SENSOR_ANGLES.length).fill(0);
    this.group = buildCarMesh(this.team);
    this.group.position.set(this.pos.x, this.pos.y + 0.6, this.pos.z);
    // Local forward is +Z; world angle A maps to rotation.y = π/2 − A
    this.group.rotation.y = Math.PI / 2 - this.angle;
  }

  update() {
    if (!this.alive || this.finished) return;

    this.lapTime++;

    for (let i = 0; i < SENSOR_ANGLES.length; i++) {
      const d = this.track.castRay(this.pos.x, this.pos.z, this.angle + SENSOR_ANGLES[i]);
      this.sensors[i] = d / SENSOR_LENGTH;
    }

    const decision = this.brain.think(this.sensors);
    this.angle += decision.steer * 0.08;
    this.speed = (2.5 + (decision.gas + 1) * 2.8) * this.speedMult;

    this.pos.x += Math.cos(this.angle) * this.speed;
    this.pos.z += Math.sin(this.angle) * this.speed;

    // Strict progress check: returns -1 if the car drifted off-track OR
    // onto a non-contiguous lane (the wrong side of a figure-8 crossover).
    const progress = this.track.findProgressFromCar(
      this.pos.x, this.pos.z, this.lastProgress,
    );
    if (progress < 0) {
      this.alive = false;
      return;
    }

    // Kill fast if facing more than ~100° from the track tangent — catches
    // cars that spin around and start driving the wrong way on a corner.
    const tan = this.track.tangents[progress];
    const fwdDot = Math.cos(this.angle) * tan.x + Math.sin(this.angle) * tan.z;
    if (fwdDot < -0.25) {
      this.alive = false;
      return;
    }

    this.lastProgress = progress;
    this.pos.y = this.track.getHeightAtProgress(progress);

    const n = this.track.points.length;
    const diff = (progress - this.maxProgress + n) % n;
    if (diff > 0 && diff < n * 0.25) {
      this.maxProgress = progress;
      this.totalProgress += diff;
      this.stuckFrames = 0;

      if (this.totalProgress >= n) {
        this.finished = true;
        this.score = this.totalProgress + 10000 / this.lapTime;
      }
    } else {
      this.stuckFrames++;
      if (this.stuckFrames > 180) this.alive = false;
    }
    this.score = Math.max(this.score, this.totalProgress);
  }

  syncMesh() {
    this.group.position.x = this.pos.x;
    this.group.position.y = (this.pos.y || 0) + 0.6;
    this.group.position.z = this.pos.z;
    this.group.rotation.y = Math.PI / 2 - this.angle;
    const opacity = this.alive || this.finished ? 1 : 0.12;
    if (this.group.userData.opacity !== opacity) {
      this.group.userData.opacity = opacity;
      this.group.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material.transparent = opacity < 1;
          obj.material.opacity = opacity;
        }
      });
    }
    // Wheel spin proportional to speed
    if (this.group.userData.wheels) {
      for (const w of this.group.userData.wheels) {
        w.rotation.x -= this.speed * 0.08;
      }
    }
  }
}

function buildCarMesh(team) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: team.main,
    metalness: 0.55,
    roughness: 0.32,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: team.accent,
    metalness: 0.35,
    roughness: 0.5,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.95,
    metalness: 0.05,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.6,
    roughness: 0.15,
  });

  // Main chassis tub
  const tub = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.3, 12), bodyMat);
  tub.position.y = 0.6;
  tub.castShadow = true;
  group.add(tub);

  // Nose cone (narrow front)
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 5), bodyMat);
  nose.position.set(0, 0.4, 8);
  nose.castShadow = true;
  group.add(nose);

  // Sidepods
  const sidepodGeo = new THREE.BoxGeometry(1.6, 1.3, 7);
  const leftPod = new THREE.Mesh(sidepodGeo, bodyMat);
  leftPod.position.set(-3, 0.65, -0.5);
  leftPod.castShadow = true;
  group.add(leftPod);
  const rightPod = leftPod.clone();
  rightPod.position.x = 3;
  group.add(rightPod);

  // Engine cover
  const cover = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 5), bodyMat);
  cover.position.set(0, 1.5, -3);
  cover.castShadow = true;
  group.add(cover);

  // Airbox
  const airbox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.8), bodyMat);
  airbox.position.set(0, 2.2, -1);
  group.add(airbox);

  // Cockpit / driver
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.2), glassMat);
  cockpit.position.set(0, 1.6, 1.8);
  group.add(cockpit);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), accentMat);
  helmet.position.set(0, 1.95, 1.8);
  group.add(helmet);

  // Halo (thin torus arc)
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.08, 8, 24, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.rotation.z = Math.PI;
  halo.position.set(0, 2.3, 1.8);
  group.add(halo);

  // Front wing
  const frontWing = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.2, 1.4), bodyMat);
  frontWing.position.set(0, 0.25, 11);
  group.add(frontWing);
  const frontFlap = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 0.8), accentMat);
  frontFlap.position.set(0, 0.45, 11.4);
  frontFlap.rotation.x = -0.12;
  group.add(frontFlap);

  // Rear wing
  const rearWing = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 1.6), bodyMat);
  rearWing.position.set(0, 2.6, -6.5);
  group.add(rearWing);
  const rearSupportGeo = new THREE.BoxGeometry(0.3, 1.4, 0.4);
  const rsL = new THREE.Mesh(rearSupportGeo, bodyMat);
  rsL.position.set(-1.2, 1.9, -6.5);
  group.add(rsL);
  const rsR = rsL.clone();
  rsR.position.x = 1.2;
  group.add(rsR);

  // Wheels (rotating)
  const wheelGeo = new THREE.CylinderGeometry(1.1, 1.1, 1.3, 20);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelPositions = [
    [-2.9, 0.8, 6.5],
    [2.9, 0.8, 6.5],
    [-2.9, 0.8, -5.5],
    [2.9, 0.8, -5.5],
  ];
  const wheels = [];
  for (const [x, y, z] of wheelPositions) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, y, z);
    w.castShadow = true;
    group.add(w);
    wheels.push(w);
  }
  group.userData.wheels = wheels;
  group.userData.opacity = 1;

  // Scale down so car length ≈ CAR_LENGTH matches track width feel
  const scale = CAR_LENGTH / 14;
  group.scale.setScalar(scale);

  return group;
}
