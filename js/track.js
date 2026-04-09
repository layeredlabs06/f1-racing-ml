import * as THREE from 'three';

// All gameplay physics live in an (x, z) ground plane so the 2D simulation
// logic from the original p5 sketch ports over 1:1. Y is up for rendering.
//
// Track geometry is real-world coordinates projected from the authoritative
// F1 circuit GeoJSON published by https://github.com/bacinger/f1-circuits
// (equirectangular projection relative to each track's bbox center — meters).
// Values are then multiplied by TRACK_SCALE so the gameplay constants that
// were tuned for the earlier hand-drawn layouts still feel right.

export const TRACK_SCALE = 3.0;

export const TRACK_LAYOUTS = {
  // Circuit de Monaco — 3337 m, 159 surveyed points
  Monaco: {
    points: [
      [112.72,-296.78], [111.12,-306.8], [113.37,-315.81], [119.16,-328.17], [124.63,-336.85], [141.68,-358.45],
      [228.3,-476.12], [234.34,-484.58], [243.26,-487.14], [254.12,-484.02], [261.68,-477.79], [267.15,-467.99],
      [268.28,-456.97], [268.52,-447.84], [269.4,-440.38], [273.91,-431.48], [279.14,-424.69], [288.87,-410.99],
      [295.46,-398.86], [298.04,-391.51], [301.34,-387.17], [306.56,-385.72], [312.6,-387.5], [317.1,-392.18],
      [318.47,-398.86], [315.49,-404.54], [307.85,-410.1], [285.25,-438.82], [282.03,-445.73], [281.95,-452.4],
      [283.72,-457.53], [286.13,-462.31], [296.75,-467.77], [313.16,-472], [322.09,-475.34], [331.26,-479.01],
      [343.96,-483.46], [357.8,-484.46], [365.12,-480.79], [367.85,-469.44], [365.28,-403.09], [355.06,-334.85],
      [344.45,-291.44], [332.62,-260.49], [312.36,-225.09], [289.03,-195.14], [255.25,-158.3], [206.91,-128.69],
      [178.12,-114.55], [122.62,-88.61], [85.3,-75.7], [30.2,-62.67], [-5.27,-57.11], [-24.09,-53.54],
      [-27.31,-48.09], [-27.55,-43.3], [-28.67,-37.74], [-31.09,-32.28], [-39.05,-29.5], [-50.31,-27.61],
      [-62.78,-34.73], [-69.61,-35.18], [-168.87,-22.15], [-218.17,-15.03], [-263.53,-7.9], [-276.08,-6.01],
      [-284.45,-4.56], [-290.48,1.67], [-299.97,20.37], [-308.01,38.52], [-314.45,56.66], [-317.26,69.57],
      [-320.24,92.06], [-320.48,130.58], [-320.08,140.15], [-317.26,146.72], [-311.63,153.07], [-299.16,162.19],
      [-290.8,169.87], [-287.18,178.11], [-285.73,190.02], [-271.58,271.95], [-267.96,286.32], [-266.83,290.88],
      [-267.15,297], [-270.77,301.9], [-278.73,307.47], [-286.7,311.36], [-288.55,316.93], [-287.02,328.62],
      [-277.93,355.22], [-269.65,375.26], [-261.2,391.07], [-246.72,411.77], [-228.55,430.14], [-215.19,437.82],
      [-200.23,444.83], [-192.75,448.17], [-188.97,452.4], [-184.63,465.43], [-186.72,472.33], [-193.48,476.34],
      [-223.48,484.24], [-240.21,486.91], [-251.23,487.14], [-261.04,485.69], [-267.23,481.01], [-271.01,477.12],
      [-271.17,467.99], [-272.62,460.64], [-275.52,451.63], [-292.41,430.81], [-304.79,410.88], [-314.45,395.97],
      [-324.66,367.69], [-347.26,288.99], [-353.46,263.61], [-357.8,236.44], [-363.43,196.81], [-367.85,145.27],
      [-367.85,111.65], [-366.41,85.94], [-363.59,59.22], [-358.6,40.63], [-352.97,23.93], [-350.24,13.69],
      [-348.87,4.68], [-349.51,-9.02], [-349.76,-17.48], [-347.02,-22.49], [-340.02,-25.83], [-322.97,-29.95],
      [-307.77,-30.61], [-286.94,-33.17], [-257.9,-36.85], [-232.17,-41.41], [-166.69,-60.67], [-130.1,-70.69],
      [-96.56,-76.14], [-73.55,-78.04], [-55.62,-84.49], [-3.74,-109.09], [19.02,-118.44], [52.24,-125.9],
      [79.99,-129.8], [106.45,-134.25], [121.33,-139.48], [139.43,-150.84], [155.11,-167.2], [163.96,-181.01],
      [167.9,-195.48], [167.26,-210.62], [164.68,-224.87], [159.05,-240.56], [151.57,-255.48], [139.83,-264.61],
      [128.57,-275.18], [123.1,-279.97], [118.03,-285.09],
    ],
    width: 17,
    // Monaco has ~42 m of real elevation: climb from Ste Devote through
    // Beau Rivage and Massenet to Casino Square, descent through Mirabeau
    // and the Grand Hotel hairpin, tunnel drop, and flat chicane/harbor.
    elevation: [
      [0.00, 0],  [0.06, 4],  [0.14, 14], [0.22, 20], [0.32, 22],
      [0.42, 14], [0.52, 6],  [0.62, -2], [0.72, -6], [0.82, -3],
      [0.92, -1], [1.00, 0],
    ],
  },
  // Suzuka International Racing Course — 5807 m, 171 surveyed points
  Suzuka: {
    points: [
      [695.08,35.73], [816.23,181.56], [957.93,355.22], [970.9,373.59], [978.12,392.74], [981.87,409.99],
      [981.59,426.91], [979.49,439.94], [962.95,491.03], [955.1,504.39], [943.68,514.52], [934.08,519.98],
      [916.82,524.21], [901.1,523.65], [883.83,517.86], [867.76,505.17], [851.4,480.46], [767.81,352.11],
      [752,338.64], [738.39,334.29], [717.83,330.73], [674.62,330.4], [652.87,324.16], [637.52,313.37],
      [625.92,299.23], [620.44,285.42], [600.98,211.51], [592.85,192.58], [579.87,176.33], [564.8,165.31],
      [545.8,156.4], [526.34,152.73], [476.09,151.95], [452.88,147.5], [436.98,139.93], [420.54,127.24],
      [408.48,109.54], [401.08,91.51], [397.7,74.47], [397.88,58.22], [400.99,44.42], [425.66,-23.04],
      [429.4,-36.74], [430.04,-54.77], [427.39,-66.68], [420.9,-83.94], [411.22,-98.63], [392.67,-111.77],
      [370.11,-124.01], [343.34,-137.48], [319.77,-146.94], [302.23,-151.84], [277.56,-155.96], [249.6,-156.4],
      [227.58,-155.51], [209.22,-150.62], [194.33,-144.27], [171.12,-134.36], [146.73,-120.67], [118.68,-97.74],
      [96.75,-74.47], [4.57,37.29], [-0.18,43.75], [-14.89,47.2], [-149.56,59.33], [-158.24,58.22],
      [-167.47,51.99], [-171.21,41.41], [-172.86,32.51], [-193.32,-51.65], [-220.64,-209.73], [-225.85,-238.78],
      [-227.13,-253.48], [-225.66,-268.62], [-222.74,-284.31], [-216.53,-300.56], [-209.49,-316.71], [-187.75,-366.58],
      [-185.46,-374.26], [-187.11,-381.27], [-191.22,-387.73], [-198.26,-392.51], [-206.39,-395.07], [-214.24,-394.52],
      [-223.2,-388.51], [-230.6,-377.82], [-262.3,-323.05], [-288.06,-281.75], [-304.87,-257.26], [-318.76,-241.12],
      [-330.73,-230.88], [-351.29,-214.62], [-372.94,-203.05], [-395.6,-196.26], [-435.07,-190.47], [-472.43,-188.91],
      [-500.57,-191.03], [-534.1,-198.37], [-570.83,-208.72], [-611.94,-224.09], [-637.89,-236.11], [-660.64,-249.8],
      [-681.65,-265.5], [-703.85,-285.42], [-726.78,-310.81], [-741.95,-332.96], [-755.56,-357.23], [-789.18,-446.73],
      [-807.18,-485.91], [-816.32,-501.61], [-828.74,-513.19], [-845.01,-520.53], [-864.47,-524.21], [-887.76,-523.65],
      [-909.32,-520.53], [-930.43,-515.86], [-950.99,-507.4], [-967.8,-494.59], [-977.94,-478.34], [-981.87,-462.42],
      [-980.68,-442.39], [-976.11,-427.47], [-969.44,-412.44], [-958.02,-399.86], [-935.45,-378.71], [-907.22,-355.22],
      [-879.63,-331.07], [-844.64,-304.57], [-804.62,-277.3], [-763.69,-251.69], [-717.92,-229.88], [-676.99,-208.95],
      [-634.97,-192.92], [-566.72,-169.32], [-491.62,-140.04], [-400.71,-108.2], [-310.54,-79.71], [-248.14,-58.11],
      [-167.47,-27.27], [-149.01,-22.6], [-130.65,-22.04], [-111.19,-25.71], [-92.28,-30.95], [-58.2,-44.08],
      [-26.86,-59.78], [-0.55,-76.03], [26.68,-97.18], [77.57,-144.83], [147.28,-209.84], [166.64,-225.87],
      [180.44,-235.55], [193.05,-243.9], [202,-249.25], [206.84,-249.69], [213.24,-247.02], [228.95,-232.99],
      [240.28,-223.53], [249.51,-220.86], [258.19,-222.53], [268.42,-229.32], [285.23,-244.57], [304.14,-258.15],
      [325.25,-267.06], [351.01,-269.28], [375.04,-267.95], [400.44,-262.72], [425.84,-252.81], [447.4,-242.45],
      [474.44,-224.09], [498.74,-201.49], [523.69,-173.66],
    ],
    width: 17,
    // Suzuka rolling terrain, relatively flat overall
    elevation: [
      [0.00, 2], [0.15, 5], [0.30, 2], [0.45, -2],
      [0.60, 0], [0.75, 3], [0.90, 5], [1.00, 2],
    ],
  },
};

// Linearly interpolate an [[t, h], ...] elevation table at normalized t.
function sampleElevation(profile, t) {
  if (!profile || profile.length === 0) return 0;
  if (t <= profile[0][0]) return profile[0][1];
  if (t >= profile[profile.length - 1][0]) return profile[profile.length - 1][1];
  for (let i = 0; i < profile.length - 1; i++) {
    const [t0, h0] = profile[i];
    const [t1, h1] = profile[i + 1];
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return h0 + (h1 - h0) * k;
    }
  }
  return 0;
}

export const SENSOR_LENGTH = 220;

export class Track {
  constructor(layoutName) {
    const layout = TRACK_LAYOUTS[layoutName] || TRACK_LAYOUTS.Monaco;
    this.name = layoutName;
    this.width = layout.width;
    this.layout = layout;
    this.points = [];
    this.innerPoints = [];
    this.outerPoints = [];
    this.tangents = [];
    this.heights = [];
    this._buildCenterline(layout.points);
    this._buildHeights(layout);
    this._buildGrid();
    this.mesh = this._buildMesh();
  }

  _buildHeights(layout) {
    const n = this.points.length;
    const profile = layout.elevation || [[0, 0], [1, 0]];
    // Elevation meters are multiplied by TRACK_SCALE so they match the
    // already-scaled XZ coordinates and slopes look correct.
    for (let i = 0; i < n; i++) {
      this.heights.push(sampleElevation(profile, i / n) * TRACK_SCALE);
    }
    // Smooth the heights with a rolling mean to hide any abrupt keyframe
    // transitions across the 12 control points of Monaco.
    const smooth = new Array(n);
    const R = 6;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let k = -R; k <= R; k++) sum += this.heights[(i + k + n) % n];
      smooth[i] = sum / (R * 2 + 1);
    }
    this.heights = smooth;
  }

  getHeightAtProgress(progress) {
    const n = this.heights.length;
    if (n === 0) return 0;
    return this.heights[((progress % n) + n) % n | 0];
  }

  _buildCenterline(rawCoords) {
    // Input points are already real meters (see TRACK_LAYOUTS comment).
    // Multiply by TRACK_SCALE so the gameplay constants (sensor length,
    // car speed, camera distances) that were tuned for the old layouts
    // continue to work without re-balancing.
    const raw = rawCoords.map(([rx, rz]) => ({
      x: rx * TRACK_SCALE,
      z: rz * TRACK_SCALE,
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
    // Two Uint16 slots per cell. 0 = empty; otherwise segment_index + 1.
    // Two slots is enough to represent a figure-8 crossover: both lanes
    // can be recorded, and the car picks whichever matches its progress.
    this._grid = new Uint16Array(this._gridCols * this._gridRows * 2);

    const n = this.points.length;
    const w2 = this.width * this.width;
    // Two recorded segments must be from truly different parts of the
    // track (not merely consecutive samples) to count as a crossover.
    const minSegGap = Math.max(24, Math.floor(n / 24));

    for (let row = 0; row < this._gridRows; row++) {
      const pz = this._gridMinZ + row * CELL;
      for (let col = 0; col < this._gridCols; col++) {
        const px = this._gridMinX + col * CELL;

        let best1 = Infinity, idx1 = -1;
        let best2 = Infinity, idx2 = -1;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const d2 = this._distToSegmentSq(px, pz, this.points[i], this.points[j]);
          if (d2 >= w2) continue;

          // Same local neighborhood as slot #1? Tighten slot #1 only.
          if (idx1 >= 0 && this._circDist(idx1, i, n) < minSegGap) {
            if (d2 < best1) {
              best1 = d2;
              idx1 = i;
            }
            continue;
          }
          // Same local neighborhood as slot #2? Tighten slot #2 only.
          if (idx2 >= 0 && this._circDist(idx2, i, n) < minSegGap) {
            if (d2 < best2) {
              best2 = d2;
              idx2 = i;
            }
            continue;
          }
          // Genuinely different part of the track — insert sorted.
          if (d2 < best1) {
            best2 = best1;
            idx2 = idx1;
            best1 = d2;
            idx1 = i;
          } else if (d2 < best2) {
            best2 = d2;
            idx2 = i;
          }
        }

        const cell = (row * this._gridCols + col) * 2;
        this._grid[cell] = idx1 >= 0 ? idx1 + 1 : 0;
        this._grid[cell + 1] = idx2 >= 0 ? idx2 + 1 : 0;
      }
    }
  }

  _circDist(a, b, n) {
    const d = Math.abs(a - b);
    return Math.min(d, n - d);
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
      pos: { x: p.x, y: this.heights[0], z: p.z },
      angle: Math.atan2(next.z - p.z, next.x - p.x),
    };
  }

  _cellOf(x, z) {
    const col = Math.floor((x - this._gridMinX) / this._cellSize);
    const row = Math.floor((z - this._gridMinZ) / this._cellSize);
    if (col < 0 || col >= this._gridCols || row < 0 || row >= this._gridRows) return -1;
    return (row * this._gridCols + col) * 2;
  }

  // Permissive: is there pavement of any lane at this point? Used by ray
  // sensors which should still see the opposite crossover lane as "road".
  isOnTrack(x, z) {
    const cell = this._cellOf(x, z);
    if (cell < 0) return false;
    return this._grid[cell] !== 0 || this._grid[cell + 1] !== 0;
  }

  // Strict: returns the new progress index for a car whose previous
  // progress was `lastProgress`, or -1 if the car has drifted off-track
  // or onto a lane that is not contiguous with where it was last frame.
  // At a figure-8 crossover this returns the lane that matches the car's
  // own progress so it cannot teleport between the two overlapping lanes.
  findProgressFromCar(x, z, lastProgress) {
    const cell = this._cellOf(x, z);
    if (cell < 0) return -1;
    const s1 = this._grid[cell] - 1;
    const s2 = this._grid[cell + 1] - 1;
    if (s1 < 0) return -1;
    const n = this.points.length;
    const window = Math.max(20, Math.floor(n * 0.08));
    const d1 = this._circDist(s1, lastProgress, n);
    if (s2 < 0) return d1 <= window ? s1 : -1;
    const d2 = this._circDist(s2, lastProgress, n);
    if (d1 <= d2) return d1 <= window ? s1 : (d2 <= window ? s2 : -1);
    return d2 <= window ? s2 : (d1 <= window ? s1 : -1);
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

    // Road surface as an indexed BufferGeometry ribbon — Y follows elevation
    const roadPositions = new Float32Array(n * 2 * 3);
    const roadUVs = new Float32Array(n * 2 * 2);
    const roadNormals = new Float32Array(n * 2 * 3);
    for (let i = 0; i < n; i++) {
      const inn = this.innerPoints[i];
      const out = this.outerPoints[i];
      const y = this.heights[i] + 0.05;
      roadPositions[i * 6 + 0] = inn.x;
      roadPositions[i * 6 + 1] = y;
      roadPositions[i * 6 + 2] = inn.z;
      roadPositions[i * 6 + 3] = out.x;
      roadPositions[i * 6 + 4] = y;
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

    // Center racing line (white dashed) — follows road surface Y
    const linePts = [];
    for (let i = 0; i < n; i += 2) {
      linePts.push(new THREE.Vector3(this.points[i].x, this.heights[i] + 0.08, this.points[i].z));
    }
    linePts.push(new THREE.Vector3(this.points[0].x, this.heights[0] + 0.08, this.points[0].z));
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

    // Kerbs: red on inside of corners, white on outside. Geometry is
    // long (10) along the tangent and thin (3) across the track so
    // the kerb sits flush against the track edge without eating into
    // the drivable area. Local X = tangent, local Z = normal.
    const kerbGeo = new THREE.BoxGeometry(10, 0.6, 3);
    const kerbRed = new THREE.MeshStandardMaterial({ color: 0xe8002d, roughness: 0.6 });
    const kerbWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const kerbStep = 5;
    const kerbCount = Math.floor(n / kerbStep);
    const kerbMeshInner = new THREE.InstancedMesh(kerbGeo, kerbRed, kerbCount);
    const kerbMeshOuter = new THREE.InstancedMesh(kerbGeo, kerbWhite, kerbCount);
    const dummy = new THREE.Object3D();
    const edgeOffset = this.width + 1.6; // push kerb centre just outside the track edge
    for (let k = 0; k < kerbCount; k++) {
      const i = k * kerbStep;
      const t = this.tangents[i];
      const ang = Math.atan2(t.z, t.x);
      const nx = -t.z, nz = t.x;
      const c = this.points[i];

      const y = this.heights[i] + 0.3;
      dummy.position.set(c.x - nx * edgeOffset, y, c.z - nz * edgeOffset);
      dummy.rotation.set(0, -ang, 0);
      dummy.updateMatrix();
      kerbMeshInner.setMatrixAt(k, dummy.matrix);

      dummy.position.set(c.x + nx * edgeOffset, y, c.z + nz * edgeOffset);
      dummy.rotation.set(0, -ang, 0);
      dummy.updateMatrix();
      kerbMeshOuter.setMatrixAt(k, dummy.matrix);
    }
    kerbMeshInner.instanceMatrix.needsUpdate = true;
    kerbMeshOuter.instanceMatrix.needsUpdate = true;
    group.add(kerbMeshInner);
    group.add(kerbMeshOuter);

    // Ground plane (grass) below track
    const groundGeo = new THREE.PlaneGeometry(14000, 14000, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f2814,
      roughness: 1,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -25;
    ground.receiveShadow = true;
    group.add(ground);

    // Start/finish line
    const startGeo = new THREE.PlaneGeometry(this.width * 2, 3);
    const startMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const startLine = new THREE.Mesh(startGeo, startMat);
    startLine.rotation.x = -Math.PI / 2;
    const sp = this.points[0];
    const st = this.tangents[0];
    startLine.position.set(sp.x, this.heights[0] + 0.1, sp.z);
    startLine.rotation.z = -Math.atan2(st.z, st.x);
    group.add(startLine);

    return group;
  }
}
