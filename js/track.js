import * as THREE from 'three';

// All gameplay physics live in an (x, z) ground plane so the 2D simulation
// logic from the original p5 sketch ports over 1:1. Y is up for rendering.

export const TRACK_LAYOUTS = {
  Monaco: {
    points: [
      [0.15, 0.12], [0.22, 0.10], [0.30, 0.08], [0.38, 0.07],
      [0.42, 0.08], [0.44, 0.12],
      [0.47, 0.18], [0.50, 0.24],
      [0.54, 0.28], [0.58, 0.28], [0.62, 0.26],
      [0.68, 0.22], [0.74, 0.18], [0.80, 0.14],
      [0.85, 0.13], [0.88, 0.16], [0.88, 0.21], [0.85, 0.24],
      [0.87, 0.30], [0.90, 0.36], [0.92, 0.42], [0.90, 0.48],
      [0.85, 0.50], [0.78, 0.52], [0.70, 0.53],
      [0.60, 0.54], [0.50, 0.55],
      [0.44, 0.55], [0.40, 0.54],
      [0.36, 0.53], [0.32, 0.52], [0.28, 0.52],
      [0.24, 0.54], [0.22, 0.58], [0.22, 0.64], [0.22, 0.70],
      [0.22, 0.76], [0.20, 0.80], [0.16, 0.82], [0.12, 0.80],
      [0.10, 0.76], [0.08, 0.70], [0.07, 0.64],
      [0.06, 0.56], [0.06, 0.46], [0.06, 0.36],
      [0.06, 0.26], [0.08, 0.18],
      [0.11, 0.14],
    ],
    width: 38,
  },
  Suzuka: {
    points: [
      [0.50, 0.82], [0.58, 0.80], [0.66, 0.78],
      [0.72, 0.74], [0.74, 0.68], [0.72, 0.62],
      [0.68, 0.56], [0.72, 0.50], [0.68, 0.44],
      [0.72, 0.38], [0.68, 0.32],
      [0.64, 0.28], [0.58, 0.26], [0.52, 0.28],
      [0.48, 0.32], [0.44, 0.38], [0.40, 0.44],
      [0.36, 0.48], [0.32, 0.50], [0.30, 0.48],
      [0.30, 0.44],
      [0.32, 0.38], [0.36, 0.34], [0.40, 0.30],
      [0.38, 0.26], [0.34, 0.24], [0.28, 0.24],
      [0.22, 0.26], [0.18, 0.30], [0.16, 0.36],
      [0.16, 0.42], [0.18, 0.48], [0.22, 0.52],
      [0.26, 0.58], [0.28, 0.64], [0.30, 0.70],
      [0.34, 0.76], [0.40, 0.80], [0.46, 0.82],
    ],
    width: 38,
  },
};

export const SENSOR_LENGTH = 220;

export class Track {
  constructor(layoutName) {
    const layout = TRACK_LAYOUTS[layoutName] || TRACK_LAYOUTS.Monaco;
    this.name = layoutName;
    this.width = layout.width;
    this.points = [];
    this.innerPoints = [];
    this.outerPoints = [];
    this.tangents = [];
    this._buildCenterline(layout.points);
    this._buildGrid();
    this.mesh = this._buildMesh();
  }

  _buildCenterline(rawCoords) {
    const margin = 200;
    const scaleX = 3200;
    const scaleZ = 2200;

    const raw = rawCoords.map(([rx, ry]) => ({
      x: margin + rx * scaleX - scaleX / 2,
      z: margin + ry * scaleZ - scaleZ / 2,
    }));

    // Catmull-Rom style interpolation for smoother track
    const interp = [];
    const stepsPerSeg = 10;
    for (let i = 0; i < raw.length; i++) {
      const p0 = raw[(i - 1 + raw.length) % raw.length];
      const p1 = raw[i];
      const p2 = raw[(i + 1) % raw.length];
      const p3 = raw[(i + 2) % raw.length];
      for (let t = 0; t < stepsPerSeg; t++) {
        const s = t / stepsPerSeg;
        const s2 = s * s;
        const s3 = s2 * s;
        const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * s +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3);
        const z = 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * s +
          (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * s2 +
          (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * s3);
        interp.push({ x, z });
      }
    }

    // Compute normals and tangents
    const n = interp.length;
    for (let i = 0; i < n; i++) {
      const prev = interp[(i - 1 + n) % n];
      const next = interp[(i + 1) % n];
      const dx = next.x - prev.x;
      const dz = next.z - prev.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const tx = dx / len;
      const tz = dz / len;
      // Normal rotated 90°
      const nx = -tz;
      const nz = tx;
      const c = interp[i];
      this.points.push({ x: c.x, z: c.z });
      this.tangents.push({ x: tx, z: tz });
      this.innerPoints.push({ x: c.x - nx * this.width, z: c.z - nz * this.width });
      this.outerPoints.push({ x: c.x + nx * this.width, z: c.z + nz * this.width });
    }
  }

  _buildGrid() {
    const CELL = 5;
    this._cellSize = CELL;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const p of this.points) {
      if (p.x < minX) minX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.x > maxX) maxX = p.x;
      if (p.z > maxZ) maxZ = p.z;
    }
    this._gridMinX = minX - this.width - CELL;
    this._gridMinZ = minZ - this.width - CELL;
    this._gridCols = Math.ceil((maxX - this._gridMinX + this.width + CELL) / CELL) + 1;
    this._gridRows = Math.ceil((maxZ - this._gridMinZ + this.width + CELL) / CELL) + 1;
    this._grid = new Uint8Array(this._gridCols * this._gridRows);

    const w2 = this.width * this.width;
    for (let row = 0; row < this._gridRows; row++) {
      const pz = this._gridMinZ + row * CELL;
      for (let col = 0; col < this._gridCols; col++) {
        const px = this._gridMinX + col * CELL;
        for (let i = 0; i < this.points.length; i++) {
          const j = (i + 1) % this.points.length;
          const d2 = this._distToSegmentSq(px, pz, this.points[i], this.points[j]);
          if (d2 < w2) {
            this._grid[row * this._gridCols + col] = 1;
            break;
          }
        }
      }
    }
  }

  _distToSegmentSq(px, pz, a, b) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lenSq = dx * dx + dz * dz;
    if (lenSq === 0) {
      const ex = px - a.x, ez = pz - a.z;
      return ex * ex + ez * ez;
    }
    let t = ((px - a.x) * dx + (pz - a.z) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + t * dx - px;
    const cz = a.z + t * dz - pz;
    return cx * cx + cz * cz;
  }

  // ─── Gameplay API (kept as 2D x,z) ─────────────────

  getStartPos() {
    const p = this.points[0];
    const next = this.points[1];
    return {
      pos: { x: p.x, z: p.z },
      angle: Math.atan2(next.z - p.z, next.x - p.x),
    };
  }

  isOnTrack(x, z) {
    const col = Math.floor((x - this._gridMinX) / this._cellSize);
    const row = Math.floor((z - this._gridMinZ) / this._cellSize);
    if (col < 0 || col >= this._gridCols || row < 0 || row >= this._gridRows) return false;
    return this._grid[row * this._gridCols + col] === 1;
  }

  getProgress(x, z, lastProgress) {
    const n = this.points.length;
    const searchRange = Math.floor(n * 0.15);
    let closestIdx = lastProgress || 0;
    let closestDist = Infinity;

    if (lastProgress !== undefined) {
      for (let off = -searchRange; off <= searchRange; off++) {
        const i = (lastProgress + off + n) % n;
        const dx = x - this.points[i].x;
        const dz = z - this.points[i].z;
        const d = dx * dx + dz * dz;
        if (d < closestDist) {
          closestDist = d;
          closestIdx = i;
        }
      }
    } else {
      for (let i = 0; i < n; i++) {
        const dx = x - this.points[i].x;
        const dz = z - this.points[i].z;
        const d = dx * dx + dz * dz;
        if (d < closestDist) {
          closestDist = d;
          closestIdx = i;
        }
      }
    }
    return closestIdx;
  }

  castRay(x, z, angle) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    for (let d = 0; d < SENSOR_LENGTH; d += 4) {
      if (!this.isOnTrack(x + cosA * d, z + sinA * d)) return d;
    }
    return SENSOR_LENGTH;
  }

  // ─── 3D Mesh Build ─────────────────────────────────

  _buildMesh() {
    const group = new THREE.Group();
    const n = this.points.length;

    // Road surface as an indexed BufferGeometry ribbon
    const roadPositions = new Float32Array(n * 2 * 3);
    const roadUVs = new Float32Array(n * 2 * 2);
    const roadNormals = new Float32Array(n * 2 * 3);
    for (let i = 0; i < n; i++) {
      const inn = this.innerPoints[i];
      const out = this.outerPoints[i];
      roadPositions[i * 6 + 0] = inn.x;
      roadPositions[i * 6 + 1] = 0.05;
      roadPositions[i * 6 + 2] = inn.z;
      roadPositions[i * 6 + 3] = out.x;
      roadPositions[i * 6 + 4] = 0.05;
      roadPositions[i * 6 + 5] = out.z;
      roadUVs[i * 4 + 0] = 0;
      roadUVs[i * 4 + 1] = i / 6;
      roadUVs[i * 4 + 2] = 1;
      roadUVs[i * 4 + 3] = i / 6;
      roadNormals[i * 6 + 1] = 1;
      roadNormals[i * 6 + 4] = 1;
    }
    const roadIdx = [];
    for (let i = 0; i < n; i++) {
      const a = i * 2;
      const b = ((i + 1) % n) * 2;
      roadIdx.push(a, a + 1, b + 1);
      roadIdx.push(a, b + 1, b);
    }
    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.BufferAttribute(roadPositions, 3));
    roadGeo.setAttribute('normal', new THREE.BufferAttribute(roadNormals, 3));
    roadGeo.setAttribute('uv', new THREE.BufferAttribute(roadUVs, 2));
    roadGeo.setIndex(roadIdx);

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a20,
      roughness: 0.85,
      metalness: 0.05,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.receiveShadow = true;
    group.add(road);

    // Center racing line (white dashed)
    const linePts = [];
    for (let i = 0; i < n; i += 2) {
      linePts.push(new THREE.Vector3(this.points[i].x, 0.08, this.points[i].z));
    }
    linePts.push(new THREE.Vector3(this.points[0].x, 0.08, this.points[0].z));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    const dashMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 6,
      gapSize: 8,
      transparent: true,
      opacity: 0.35,
    });
    const centerLine = new THREE.Line(lineGeo, dashMat);
    centerLine.computeLineDistances();
    group.add(centerLine);

    // Kerbs: alternating red/white blocks along inner and outer boundaries
    const kerbGeo = new THREE.BoxGeometry(4, 0.4, 5);
    const kerbRed = new THREE.MeshStandardMaterial({ color: 0xe8002d, roughness: 0.6 });
    const kerbWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const kerbCount = Math.floor(n / 2);
    const kerbMeshInner = new THREE.InstancedMesh(kerbGeo, kerbRed, kerbCount);
    const kerbMeshOuter = new THREE.InstancedMesh(kerbGeo, kerbWhite, kerbCount);
    const dummy = new THREE.Object3D();
    for (let k = 0; k < kerbCount; k++) {
      const i = k * 2;
      const t = this.tangents[i];
      const ang = Math.atan2(t.z, t.x);
      dummy.position.set(this.innerPoints[i].x, 0.15, this.innerPoints[i].z);
      dummy.rotation.set(0, -ang, 0);
      dummy.updateMatrix();
      kerbMeshInner.setMatrixAt(k, dummy.matrix);

      dummy.position.set(this.outerPoints[i].x, 0.15, this.outerPoints[i].z);
      dummy.rotation.set(0, -ang, 0);
      dummy.updateMatrix();
      kerbMeshOuter.setMatrixAt(k, dummy.matrix);
    }
    kerbMeshInner.instanceMatrix.needsUpdate = true;
    kerbMeshOuter.instanceMatrix.needsUpdate = true;
    group.add(kerbMeshInner);
    group.add(kerbMeshOuter);

    // Ground plane (grass) below track
    const groundGeo = new THREE.PlaneGeometry(8000, 8000, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f2814,
      roughness: 1,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    group.add(ground);

    // Start/finish line
    const startGeo = new THREE.PlaneGeometry(this.width * 2, 3);
    const startMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const startLine = new THREE.Mesh(startGeo, startMat);
    startLine.rotation.x = -Math.PI / 2;
    const sp = this.points[0];
    const st = this.tangents[0];
    startLine.position.set(sp.x, 0.1, sp.z);
    startLine.rotation.z = -Math.atan2(st.z, st.x);
    group.add(startLine);

    return group;
  }
}
