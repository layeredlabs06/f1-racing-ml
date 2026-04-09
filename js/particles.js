// Visual effects: tire smoke puffs for crashes and persistent skid marks.
//
// Both systems are fire-and-forget — `main.js` calls `spawnCrash` whenever a
// car first dies, and the update loop recycles expired particles. Skid
// marks stay for the rest of the generation to build up a visible racing
// line over time.

import * as THREE from 'three';

const MAX_SMOKE = 400;
const MAX_SKID = 1600;

function makeSmokeTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(240,240,240,0.95)');
  g.addColorStop(0.4, 'rgba(200,200,205,0.45)');
  g.addColorStop(1, 'rgba(200,200,205,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this._initSmoke();
    this._initSkid();
  }

  _initSmoke() {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_SMOKE * 3);
    const sizes = new Float32Array(MAX_SMOKE);
    const opacities = new Float32Array(MAX_SMOKE);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    const tex = makeSmokeTexture();
    // PointsMaterial with per-vertex size via a small shader override.
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: { pointTex: { value: tex } },
      vertexShader: `
        attribute float size;
        attribute float aOpacity;
        varying float vOpacity;
        void main() {
          vOpacity = aOpacity;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTex;
        varying float vOpacity;
        void main() {
          vec4 c = texture2D(pointTex, gl_PointCoord);
          if (c.a < 0.02) discard;
          gl_FragColor = vec4(c.rgb, c.a * vOpacity);
        }
      `,
    });

    const points = new THREE.Points(geom, mat);
    points.frustumCulled = false;
    this.scene.add(points);

    this._smoke = {
      points,
      positions,
      sizes,
      opacities,
      velocities: new Float32Array(MAX_SMOKE * 3),
      life: new Float32Array(MAX_SMOKE),
      maxLife: new Float32Array(MAX_SMOKE),
      baseSize: new Float32Array(MAX_SMOKE),
      next: 0,
      count: 0,
    };
    // Initialize off-screen
    for (let i = 0; i < MAX_SMOKE; i++) {
      positions[i * 3 + 1] = -9999;
    }
  }

  _initSkid() {
    // Skid marks are short thin quads laid flat on the road surface.
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_SKID * 6 * 3); // 2 triangles per mark
    const index = [];
    for (let i = 0; i < MAX_SKID; i++) {
      const b = i * 6;
      index.push(b, b + 1, b + 2, b + 3, b + 4, b + 5);
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setIndex(index);
    geom.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: 0x050505,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.frustumCulled = false;
    this.scene.add(mesh);

    this._skid = { mesh, positions, next: 0, count: 0 };
    // Zero out positions (all marks at origin, invisible to start)
    for (let i = 0; i < positions.length; i++) positions[i] = 0;
    geom.attributes.position.needsUpdate = true;
  }

  reset() {
    const s = this._smoke;
    for (let i = 0; i < MAX_SMOKE; i++) {
      s.life[i] = 0;
      s.opacities[i] = 0;
      s.positions[i * 3 + 1] = -9999;
    }
    s.points.geometry.attributes.position.needsUpdate = true;
    s.points.geometry.attributes.aOpacity.needsUpdate = true;

    const k = this._skid;
    for (let i = 0; i < k.positions.length; i++) k.positions[i] = 0;
    k.mesh.geometry.attributes.position.needsUpdate = true;
    k.next = 0;
    k.count = 0;
  }

  // Spawn a cloud of smoke at a world position with optional outward impulse.
  spawnCrash(x, y, z, vx = 0, vz = 0) {
    const s = this._smoke;
    const burst = 24;
    for (let b = 0; b < burst; b++) {
      const i = s.next;
      s.next = (s.next + 1) % MAX_SMOKE;
      const ang = Math.random() * Math.PI * 2;
      const spd = 0.2 + Math.random() * 0.8;
      s.positions[i * 3 + 0] = x + Math.cos(ang) * 2;
      s.positions[i * 3 + 1] = y + 0.4 + Math.random() * 1.2;
      s.positions[i * 3 + 2] = z + Math.sin(ang) * 2;
      s.velocities[i * 3 + 0] = vx * 0.15 + Math.cos(ang) * spd;
      s.velocities[i * 3 + 1] = 0.4 + Math.random() * 0.5;
      s.velocities[i * 3 + 2] = vz * 0.15 + Math.sin(ang) * spd;
      s.baseSize[i] = 9 + Math.random() * 7;
      s.sizes[i] = s.baseSize[i];
      s.opacities[i] = 1;
      s.life[i] = 0;
      s.maxLife[i] = 70 + Math.random() * 50;
    }
  }

  // Lay two parallel skid strips behind a car at its current wheels.
  spawnSkid(x, y, z, angle, length = 3) {
    const k = this._skid;
    // Two strips: left and right wheelbase. Half-width ~2.5 car units.
    const halfW = 2.2;
    const nx = -Math.sin(angle);
    const nz = Math.cos(angle);
    const tx = Math.cos(angle);
    const tz = Math.sin(angle);
    for (const side of [-halfW, halfW]) {
      const cx = x + nx * side;
      const cz = z + nz * side;
      const ax = cx - tx * length * 0.5;
      const az = cz - tz * length * 0.5;
      const bx = cx + tx * length * 0.5;
      const bz = cz + tz * length * 0.5;
      const w = 0.45;
      const ox = nx * w;
      const oz = nz * w;
      const i = k.next;
      k.next = (k.next + 1) % MAX_SKID;
      const p = k.positions;
      const o = i * 18;
      // Triangle 1: a-left, a-right, b-right
      p[o + 0] = ax - ox; p[o + 1] = y + 0.06; p[o + 2] = az - oz;
      p[o + 3] = ax + ox; p[o + 4] = y + 0.06; p[o + 5] = az + oz;
      p[o + 6] = bx + ox; p[o + 7] = y + 0.06; p[o + 8] = bz + oz;
      // Triangle 2: a-left, b-right, b-left
      p[o + 9]  = ax - ox; p[o + 10] = y + 0.06; p[o + 11] = az - oz;
      p[o + 12] = bx + ox; p[o + 13] = y + 0.06; p[o + 14] = bz + oz;
      p[o + 15] = bx - ox; p[o + 16] = y + 0.06; p[o + 17] = bz - oz;
    }
    k.mesh.geometry.attributes.position.needsUpdate = true;
  }

  update() {
    const s = this._smoke;
    for (let i = 0; i < MAX_SMOKE; i++) {
      if (s.opacities[i] <= 0) continue;
      s.life[i] += 1;
      const t = s.life[i] / s.maxLife[i];
      if (t >= 1) {
        s.opacities[i] = 0;
        s.positions[i * 3 + 1] = -9999;
        continue;
      }
      s.positions[i * 3 + 0] += s.velocities[i * 3 + 0];
      s.positions[i * 3 + 1] += s.velocities[i * 3 + 1];
      s.positions[i * 3 + 2] += s.velocities[i * 3 + 2];
      s.velocities[i * 3 + 0] *= 0.96;
      s.velocities[i * 3 + 1] *= 0.97;
      s.velocities[i * 3 + 2] *= 0.96;
      s.sizes[i] = s.baseSize[i] * (1 + t * 1.8);
      s.opacities[i] = 1 - t;
    }
    s.points.geometry.attributes.position.needsUpdate = true;
    s.points.geometry.attributes.size.needsUpdate = true;
    s.points.geometry.attributes.aOpacity.needsUpdate = true;
  }
}
