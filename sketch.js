// F1 Racing ML - Neural Network Evolution Simulator
// Cars learn to drive around a track using neuroevolution

let NUM_CARS = 30;
const NUM_SENSORS = 5;
const HIDDEN_SIZE = 4;
let MUTATION_RATE = 0.3;
const SENSOR_LENGTH = 200;
const CAR_RADIUS = 18;
let SPEED_MULT = 1.0;
let USE_TIMEOUT = false;
let MAX_FRAMES = 1200;

// 2025 F1 Team Colors
const F1_TEAMS = [
  { name: 'Red Bull',     main: [54, 113, 198],  accent: [255, 205, 0]   },
  { name: 'Ferrari',      main: [232, 0, 45],    accent: [255, 255, 255] },
  { name: 'McLaren',      main: [255, 128, 0],   accent: [0, 0, 0]       },
  { name: 'Mercedes',     main: [39, 244, 210],  accent: [0, 0, 0]       },
  { name: 'Aston Martin', main: [0, 111, 98],    accent: [206, 220, 0]   },
  { name: 'Alpine',       main: [0, 147, 204],   accent: [255, 87, 164]  },
  { name: 'Williams',     main: [100, 196, 255], accent: [0, 55, 120]    },
  { name: 'RB',           main: [102, 146, 255], accent: [255, 0, 0]     },
  { name: 'Kick Sauber',  main: [82, 226, 82],   accent: [0, 0, 0]       },
  { name: 'Haas',         main: [182, 186, 189], accent: [232, 0, 45]    },
];

let track;
let cars = [];
let generation = 1;
let bestScore = 0;
let allTimeBest = 0;
let frameCounter = 0;
let bestLapTime = Infinity;
let genBestLap = Infinity;
let lapHistory = []; // { gen, bestLap, avgProgress }
let currentTrackName = 'Monaco';

// ─── Track Layouts ──────────────────────────────────

const TRACK_LAYOUTS = {
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
    width: 40,
  },
  Suzuka: {
    points: [
      // Start/Finish straight (bottom)
      [0.50, 0.82], [0.58, 0.80], [0.66, 0.78],
      // Turn 1-2 (right-hander into esses)
      [0.72, 0.74], [0.74, 0.68], [0.72, 0.62],
      // S-Curves (signature esses)
      [0.68, 0.56], [0.72, 0.50], [0.68, 0.44],
      [0.72, 0.38], [0.68, 0.32],
      // Dunlop curve
      [0.64, 0.28], [0.58, 0.26], [0.52, 0.28],
      // Degner curves
      [0.48, 0.32], [0.44, 0.38], [0.40, 0.44],
      // Hairpin
      [0.36, 0.48], [0.32, 0.50], [0.30, 0.48],
      [0.30, 0.44],
      // Spoon curve
      [0.32, 0.38], [0.36, 0.34], [0.40, 0.30],
      // Back straight (heading left under the crossover)
      [0.38, 0.26], [0.34, 0.24], [0.28, 0.24],
      // 130R (fast sweeping left)
      [0.22, 0.26], [0.18, 0.30], [0.16, 0.36],
      // Casio Triangle chicane
      [0.16, 0.42], [0.18, 0.48], [0.22, 0.52],
      // Heading back via underpass area
      [0.26, 0.58], [0.28, 0.64], [0.30, 0.70],
      // Final turns back to straight
      [0.34, 0.76], [0.40, 0.80], [0.46, 0.82],
    ],
    width: 40,
  },
};

// ─── Track ───────────────────────────────────────────

class Track {
  constructor(layoutName) {
    this.points = [];
    this.innerPoints = [];
    this.outerPoints = [];
    const layout = TRACK_LAYOUTS[layoutName] || TRACK_LAYOUTS.Monaco;
    this.width = layout.width;
    this.buildTrack(layout.points);
  }

  buildTrack(rawCoords) {
    const margin = 100;
    const scaleX = 3000;
    const scaleY = 2000;

    this.points = [];
    this.innerPoints = [];
    this.outerPoints = [];

    const rawPoints = rawCoords.map(([rx, ry]) =>
      createVector(margin + rx * scaleX, margin + ry * scaleY)
    );

    // Linear interpolation between points
    const interpolated = [];
    const stepsPerSeg = 8;
    for (let i = 0; i < rawPoints.length; i++) {
      const p1 = rawPoints[i];
      const p2 = rawPoints[(i + 1) % rawPoints.length];
      for (let t = 0; t < stepsPerSeg; t++) {
        const s = t / stepsPerSeg;
        interpolated.push(createVector(
          p1.x + (p2.x - p1.x) * s,
          p1.y + (p2.y - p1.y) * s,
        ));
      }
    }

    // Compute smoothed normals
    const normals = [];
    for (let i = 0; i < interpolated.length; i++) {
      const prev = interpolated[(i - 1 + interpolated.length) % interpolated.length];
      const next = interpolated[(i + 1) % interpolated.length];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      normals.push({ x: -dy / len, y: dx / len });
    }

    for (let i = 0; i < interpolated.length; i++) {
      const curr = interpolated[i];
      const nx = normals[i].x;
      const ny = normals[i].y;
      this.points.push(curr.copy());
      this.innerPoints.push(createVector(curr.x - nx * this.width, curr.y - ny * this.width));
      this.outerPoints.push(createVector(curr.x + nx * this.width, curr.y + ny * this.width));
    }

    this._buildGrid();
  }

  _buildGrid() {
    const CELL = 5;
    this._cellSize = CELL;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    this._gridMinX = minX - this.width - CELL;
    this._gridMinY = minY - this.width - CELL;
    this._gridCols = Math.ceil((maxX - this._gridMinX + this.width + CELL) / CELL) + 1;
    this._gridRows = Math.ceil((maxY - this._gridMinY + this.width + CELL) / CELL) + 1;

    this._grid = new Uint8Array(this._gridCols * this._gridRows);

    const w2 = this.width * this.width;
    for (let row = 0; row < this._gridRows; row++) {
      const py = this._gridMinY + row * CELL;
      for (let col = 0; col < this._gridCols; col++) {
        const px = this._gridMinX + col * CELL;
        for (let i = 0; i < this.points.length; i++) {
          const j = (i + 1) % this.points.length;
          const d2 = this._distToSegmentSq(px, py, this.points[i], this.points[j]);
          if (d2 < w2) {
            this._grid[row * this._gridCols + col] = 1;
            break;
          }
        }
      }
    }
  }

  _distToSegmentSq(px, py, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      const ex = px - a.x, ey = py - a.y;
      return ex * ex + ey * ey;
    }
    let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + t * dx - px;
    const cy = a.y + t * dy - py;
    return cx * cx + cy * cy;
  }

  getStartPos() {
    const p = this.points[0].copy();
    return { pos: p, angle: atan2(this.points[1].y - p.y, this.points[1].x - p.x) };
  }

  isOnTrack(x, y) {
    const col = Math.floor((x - this._gridMinX) / this._cellSize);
    const row = Math.floor((y - this._gridMinY) / this._cellSize);
    if (col < 0 || col >= this._gridCols || row < 0 || row >= this._gridRows) return false;
    return this._grid[row * this._gridCols + col] === 1;
  }

  getProgress(x, y, lastProgress) {
    const n = this.points.length;
    const searchRange = Math.floor(n * 0.15);
    let closestIdx = lastProgress || 0;
    let closestDist = Infinity;

    if (lastProgress !== undefined) {
      for (let offset = -searchRange; offset <= searchRange; offset++) {
        const i = (lastProgress + offset + n) % n;
        const d = dist(x, y, this.points[i].x, this.points[i].y);
        if (d < closestDist) {
          closestDist = d;
          closestIdx = i;
        }
      }
    } else {
      for (let i = 0; i < n; i++) {
        const d = dist(x, y, this.points[i].x, this.points[i].y);
        if (d < closestDist) {
          closestDist = d;
          closestIdx = i;
        }
      }
    }
    return closestIdx;
  }

  castRay(x, y, angle) {
    const cosA = cos(angle);
    const sinA = sin(angle);
    for (let d = 0; d < SENSOR_LENGTH; d += 4) {
      if (!this.isOnTrack(x + cosA * d, y + sinA * d)) {
        return d;
      }
    }
    return SENSOR_LENGTH;
  }

  draw() {
    const n = this.points.length;
    stroke(20, 28, 50, 180);
    strokeWeight(this.width * 2);
    strokeCap(ROUND);
    noFill();
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      line(this.points[i].x, this.points[i].y, this.points[j].x, this.points[j].y);
    }

    noFill();
    strokeWeight(2);
    stroke(60, 130, 200, 120);

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      line(this.outerPoints[i].x, this.outerPoints[i].y,
           this.outerPoints[j].x, this.outerPoints[j].y);
    }

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      line(this.innerPoints[i].x, this.innerPoints[i].y,
           this.innerPoints[j].x, this.innerPoints[j].y);
    }

    stroke(40, 80, 140, 40);
    strokeWeight(1);
    for (let i = 0; i < n; i += 2) {
      const j = (i + 1) % n;
      line(this.points[i].x, this.points[i].y, this.points[j].x, this.points[j].y);
    }
  }
}

// ─── Neural Network ──────────────────────────────────

class NeuralCar {
  constructor(weights) {
    if (!weights) {
      this.w1 = this.randomMatrix(NUM_SENSORS, HIDDEN_SIZE);
      this.w2 = this.randomMatrix(HIDDEN_SIZE, 2);
    } else {
      this.w1 = weights.w1.map(row => [...row]);
      this.w2 = weights.w2.map(row => [...row]);
    }
  }

  randomMatrix(rows, cols) {
    const m = [];
    for (let i = 0; i < rows; i++) {
      m.push([]);
      for (let j = 0; j < cols; j++) {
        m[i].push(randomGaussian(0, 1));
      }
    }
    return m;
  }

  think(sensors) {
    const hidden = [];
    for (let j = 0; j < HIDDEN_SIZE; j++) {
      let sum = 0;
      for (let i = 0; i < sensors.length; i++) {
        sum += sensors[i] * this.w1[i][j];
      }
      hidden.push(Math.tanh(sum));
    }

    const output = [];
    for (let j = 0; j < 2; j++) {
      let sum = 0;
      for (let i = 0; i < HIDDEN_SIZE; i++) {
        sum += hidden[i] * this.w2[i][j];
      }
      output.push(Math.tanh(sum));
    }

    this._lastHidden = hidden;
    this._lastOutput = output;
    return { steer: output[0], gas: output[1] };
  }

  mutate() {
    for (let i = 0; i < this.w1.length; i++) {
      for (let j = 0; j < this.w1[i].length; j++) {
        this.w1[i][j] += randomGaussian(0, 1) * MUTATION_RATE;
      }
    }
    for (let i = 0; i < this.w2.length; i++) {
      for (let j = 0; j < this.w2[i].length; j++) {
        this.w2[i][j] += randomGaussian(0, 1) * MUTATION_RATE;
      }
    }
  }

  getWeights() {
    return {
      w1: this.w1.map(row => [...row]),
      w2: this.w2.map(row => [...row]),
    };
  }
}

// ─── Car ─────────────────────────────────────────────

class Car {
  constructor(brain, teamIdx) {
    const start = track.getStartPos();
    this.pos = start.pos.copy();
    this.angle = start.angle;
    this.speed = 0;
    this.alive = true;
    this.score = 0;
    this.maxProgress = track.getProgress(this.pos.x, this.pos.y);
    this.lastProgress = this.maxProgress;
    this.totalProgress = 0;
    this.stuckFrames = 0;
    this.lapTime = 0;
    this.finished = false;
    this.brain = brain || new NeuralCar();
    this.team = F1_TEAMS[teamIdx !== undefined ? teamIdx % F1_TEAMS.length : Math.floor(Math.random() * F1_TEAMS.length)];
    this.sensors = [];
    this.sensorAngles = [
      -PI / 2.5,
      -PI / 5,
      0,
      PI / 5,
      PI / 2.5,
    ];
  }

  update() {
    if (!this.alive || this.finished) return;

    this.lapTime++;

    this.sensors = [];
    for (const sa of this.sensorAngles) {
      const d = track.castRay(this.pos.x, this.pos.y, this.angle + sa);
      this.sensors.push(d / SENSOR_LENGTH);
    }

    const decision = this.brain.think(this.sensors);
    this.angle += decision.steer * 0.08;
    this.speed = (3 + (decision.gas + 1) * 3) * SPEED_MULT;

    this.pos.x += cos(this.angle) * this.speed;
    this.pos.y += sin(this.angle) * this.speed;

    if (!track.isOnTrack(this.pos.x, this.pos.y)) {
      this.alive = false;
      return;
    }

    const progress = track.getProgress(this.pos.x, this.pos.y, this.lastProgress);
    this.lastProgress = progress;

    const n = track.points.length;
    const diff = (progress - this.maxProgress + n) % n;
    if (diff > 0 && diff < n * 0.5) {
      this.maxProgress = progress;
      this.totalProgress += diff;
      this.stuckFrames = 0;

      if (this.totalProgress >= n) {
        this.finished = true;
        this.score = this.totalProgress + (10000 / this.lapTime);
        genBestLap = Math.min(genBestLap, this.lapTime);
        bestLapTime = Math.min(bestLapTime, this.lapTime);
        return;
      }
    } else {
      this.stuckFrames++;
      if (this.stuckFrames > 300) {
        this.alive = false;
      }
    }

    this.score = this.totalProgress;
  }

  draw() {
    if (!this.alive && !this.finished) return;

    const [mr, mg, mb] = this.team.main;
    const [ar, ag, ab] = this.team.accent;

    stroke(mr, mg, mb, 120);
    strokeWeight(1.5);
    for (let i = 0; i < this.sensorAngles.length; i++) {
      const d = this.sensors[i] * SENSOR_LENGTH;
      const ex = this.pos.x + cos(this.angle + this.sensorAngles[i]) * d;
      const ey = this.pos.y + sin(this.angle + this.sensorAngles[i]) * d;
      line(this.pos.x, this.pos.y, ex, ey);
      fill(mr, mg, mb);
      noStroke();
      circle(ex, ey, 5);
    }

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    noStroke();
    fill(mr, mg, mb, 15);
    ellipse(0, 0, CAR_RADIUS * 5, CAR_RADIUS * 3.6);
    fill(mr, mg, mb, 35);
    ellipse(0, 0, CAR_RADIUS * 3, CAR_RADIUS * 2.2);

    fill(ar, ag, ab);
    stroke(mr, mg, mb);
    strokeWeight(1);
    rect(-CAR_RADIUS * 1.4, -CAR_RADIUS * 0.9, 4, CAR_RADIUS * 1.8, 1);
    rect(CAR_RADIUS * 1.1, -CAR_RADIUS * 0.7, 4, CAR_RADIUS * 1.4, 1);

    noStroke();
    fill(mr, mg, mb);
    beginShape();
    vertex(CAR_RADIUS * 1.2, 0);
    vertex(CAR_RADIUS * 0.5, -CAR_RADIUS * 0.45);
    vertex(-CAR_RADIUS * 0.8, -CAR_RADIUS * 0.5);
    vertex(-CAR_RADIUS * 1.2, -CAR_RADIUS * 0.35);
    vertex(-CAR_RADIUS * 1.2, CAR_RADIUS * 0.35);
    vertex(-CAR_RADIUS * 0.8, CAR_RADIUS * 0.5);
    vertex(CAR_RADIUS * 0.5, CAR_RADIUS * 0.45);
    endShape(CLOSE);

    fill(ar, ag, ab, 200);
    ellipse(0, 0, CAR_RADIUS * 0.9, CAR_RADIUS * 0.7);
    fill(255, 255, 255, 100);
    ellipse(CAR_RADIUS * 0.1, -CAR_RADIUS * 0.05, CAR_RADIUS * 0.4, CAR_RADIUS * 0.3);

    fill(40, 40, 40);
    rect(-CAR_RADIUS * 0.9, -CAR_RADIUS * 0.7, CAR_RADIUS * 0.5, CAR_RADIUS * 0.2, 1);
    rect(-CAR_RADIUS * 0.9, CAR_RADIUS * 0.5, CAR_RADIUS * 0.5, CAR_RADIUS * 0.2, 1);
    rect(CAR_RADIUS * 0.6, -CAR_RADIUS * 0.55, CAR_RADIUS * 0.4, CAR_RADIUS * 0.15, 1);
    rect(CAR_RADIUS * 0.6, CAR_RADIUS * 0.4, CAR_RADIUS * 0.4, CAR_RADIUS * 0.15, 1);

    pop();
  }
}

// ─── Evolution ───────────────────────────────────────

function nextGeneration() {
  // Record history
  const avgProg = cars.reduce((s, c) => s + c.totalProgress, 0) / cars.length;
  lapHistory.push({
    gen: generation,
    bestLap: genBestLap < Infinity ? genBestLap : null,
    avgProgress: avgProg,
  });
  if (lapHistory.length > 100) lapHistory.shift();

  const scores = cars.map((c, i) => ({ idx: i, score: c.score }));
  scores.sort((a, b) => b.score - a.score);

  bestScore = scores[0].score;
  allTimeBest = Math.max(allTimeBest, bestScore);

  const topCount = Math.ceil(NUM_CARS / 5);
  const top = scores.slice(0, topCount).map(s => cars[s.idx]);

  const newCars = [];
  for (let i = 0; i < NUM_CARS; i++) {
    const parent = random(top);
    const child = new NeuralCar(parent.brain.getWeights());
    child.mutate();
    newCars.push(new Car(child, i));
  }

  cars = newCars;
  generation++;
  frameCounter = 0;
  genBestLap = Infinity;
}

// ─── Neural Network Visualization ───────────────────

function drawNeuralNet(brain, sensors, bx, by, bw, bh) {
  // Background panel
  fill(10, 14, 26, 200);
  stroke(60, 130, 200, 40);
  strokeWeight(1);
  rect(bx, by, bw, bh, 8);

  // Title
  noStroke();
  fill(180, 220, 255, 180);
  textSize(11);
  textAlign(CENTER);
  text('Neural Network', bx + bw / 2, by + 16);

  const padX = 30;
  const padY = 28;
  const layerX = [bx + padX, bx + bw / 2, bx + bw - padX];
  const inputLabels = ['L2', 'L1', 'C', 'R1', 'R2'];
  const outputLabels = ['Steer', 'Gas'];

  // Node positions
  const inputNodes = [];
  for (let i = 0; i < NUM_SENSORS; i++) {
    const y = by + padY + 8 + (i / (NUM_SENSORS - 1)) * (bh - padY * 2 - 16);
    inputNodes.push({ x: layerX[0], y });
  }

  const hiddenNodes = [];
  for (let i = 0; i < HIDDEN_SIZE; i++) {
    const y = by + padY + 16 + (i / (HIDDEN_SIZE - 1)) * (bh - padY * 2 - 32);
    hiddenNodes.push({ x: layerX[1], y });
  }

  const outputNodes = [];
  for (let i = 0; i < 2; i++) {
    const y = by + padY + 30 + (i / 1) * (bh - padY * 2 - 60);
    outputNodes.push({ x: layerX[2], y });
  }

  // Draw connections: input → hidden
  for (let i = 0; i < NUM_SENSORS; i++) {
    for (let j = 0; j < HIDDEN_SIZE; j++) {
      const w = brain.w1[i][j];
      const intensity = Math.min(Math.abs(w) * 80, 255);
      if (w > 0) {
        stroke(80, 255, 140, intensity);
      } else {
        stroke(255, 80, 80, intensity);
      }
      strokeWeight(Math.min(Math.abs(w) * 0.8, 2.5));
      line(inputNodes[i].x, inputNodes[i].y, hiddenNodes[j].x, hiddenNodes[j].y);
    }
  }

  // Draw connections: hidden → output
  for (let i = 0; i < HIDDEN_SIZE; i++) {
    for (let j = 0; j < 2; j++) {
      const w = brain.w2[i][j];
      const intensity = Math.min(Math.abs(w) * 80, 255);
      if (w > 0) {
        stroke(80, 255, 140, intensity);
      } else {
        stroke(255, 80, 80, intensity);
      }
      strokeWeight(Math.min(Math.abs(w) * 0.8, 2.5));
      line(hiddenNodes[i].x, hiddenNodes[i].y, outputNodes[j].x, outputNodes[j].y);
    }
  }

  // Draw input nodes
  for (let i = 0; i < NUM_SENSORS; i++) {
    const val = sensors ? sensors[i] : 0;
    const brightness = 80 + val * 175;
    noStroke();
    fill(brightness, brightness * 0.9, 50);
    circle(inputNodes[i].x, inputNodes[i].y, 12);
    fill(180, 200, 220, 160);
    textSize(9);
    textAlign(RIGHT);
    text(inputLabels[i], inputNodes[i].x - 10, inputNodes[i].y + 3);
  }

  // Draw hidden nodes
  const hiddenVals = brain._lastHidden || [];
  for (let i = 0; i < HIDDEN_SIZE; i++) {
    const val = hiddenVals[i] || 0;
    noStroke();
    if (val > 0) {
      fill(80 + val * 175, 255, 140);
    } else {
      fill(255, 80 + (-val) * 175, 80);
    }
    circle(hiddenNodes[i].x, hiddenNodes[i].y, 12);
  }

  // Draw output nodes
  const outputVals = brain._lastOutput || [];
  for (let i = 0; i < 2; i++) {
    const val = outputVals[i] || 0;
    noStroke();
    if (val > 0) {
      fill(80 + val * 175, 255, 140);
    } else {
      fill(255, 80 + (-val) * 175, 80);
    }
    circle(outputNodes[i].x, outputNodes[i].y, 14);
    fill(180, 200, 220, 160);
    textSize(9);
    textAlign(LEFT);
    text(outputLabels[i], outputNodes[i].x + 12, outputNodes[i].y + 3);

    // Value label
    textAlign(CENTER);
    fill(255, 255, 255, 200);
    textSize(8);
    text((val >= 0 ? '+' : '') + val.toFixed(2), outputNodes[i].x, outputNodes[i].y + 22);
  }

  textAlign(LEFT);
}

// ─── Lap Time Graph ─────────────────────────────────

function drawLapGraph(gx, gy, gw, gh) {
  // Background panel
  fill(10, 14, 26, 200);
  stroke(60, 130, 200, 40);
  strokeWeight(1);
  rect(gx, gy, gw, gh, 8);

  noStroke();
  fill(180, 220, 255, 180);
  textSize(11);
  textAlign(CENTER);
  text('Lap Time by Generation', gx + gw / 2, gy + 16);

  if (lapHistory.length < 2) {
    fill(100, 130, 160, 120);
    textSize(10);
    text('Waiting for data...', gx + gw / 2, gy + gh / 2);
    return;
  }

  const padL = 35;
  const padR = 10;
  const padT = 26;
  const padB = 22;
  const plotX = gx + padL;
  const plotY = gy + padT;
  const plotW = gw - padL - padR;
  const plotH = gh - padT - padB;

  // Find entries with lap times
  const lapEntries = lapHistory.filter(e => e.bestLap !== null);

  if (lapEntries.length < 1) {
    // Show progress graph instead
    const maxProg = Math.max(...lapHistory.map(e => e.avgProgress), 1);
    stroke(60, 130, 200, 60);
    strokeWeight(1);
    // Y axis
    line(plotX, plotY, plotX, plotY + plotH);
    // X axis
    line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);

    // Progress line
    stroke(255, 160, 50, 200);
    strokeWeight(1.5);
    noFill();
    beginShape();
    for (let i = 0; i < lapHistory.length; i++) {
      const x = plotX + (i / (lapHistory.length - 1)) * plotW;
      const y = plotY + plotH - (lapHistory[i].avgProgress / maxProg) * plotH;
      vertex(x, y);
    }
    endShape();

    noStroke();
    fill(255, 160, 50, 160);
    textSize(9);
    textAlign(LEFT);
    text('Avg Progress', plotX + 4, plotY + 10);
    return;
  }

  // Lap time graph
  const minLap = Math.min(...lapEntries.map(e => e.bestLap));
  const maxLap = Math.max(...lapEntries.map(e => e.bestLap));
  const range = Math.max(maxLap - minLap, 1);

  // Axes
  stroke(60, 130, 200, 60);
  strokeWeight(1);
  line(plotX, plotY, plotX, plotY + plotH);
  line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);

  // Y axis labels (lap time in seconds)
  noStroke();
  fill(120, 150, 180, 160);
  textSize(8);
  textAlign(RIGHT);
  const topVal = (maxLap * 1.05) / 60;
  const botVal = (minLap * 0.95) / 60;
  text(topVal.toFixed(1) + 's', plotX - 3, plotY + 8);
  text(botVal.toFixed(1) + 's', plotX - 3, plotY + plotH + 4);

  // X axis label
  textAlign(CENTER);
  text('Gen ' + lapHistory[0].gen, plotX, plotY + plotH + 14);
  text('Gen ' + lapHistory[lapHistory.length - 1].gen, plotX + plotW, plotY + plotH + 14);

  // Lap time line
  stroke(80, 255, 140, 220);
  strokeWeight(2);
  noFill();
  beginShape();
  const maxPadded = maxLap * 1.05;
  const minPadded = minLap * 0.95;
  const fullRange = maxPadded - minPadded || 1;

  for (let i = 0; i < lapHistory.length; i++) {
    if (lapHistory[i].bestLap === null) continue;
    const x = plotX + (i / (lapHistory.length - 1)) * plotW;
    const y = plotY + ((lapHistory[i].bestLap - minPadded) / fullRange) * plotH;
    vertex(x, y);
  }
  endShape();

  // Dots on data points
  noStroke();
  fill(80, 255, 140);
  for (let i = 0; i < lapHistory.length; i++) {
    if (lapHistory[i].bestLap === null) continue;
    const x = plotX + (i / (lapHistory.length - 1)) * plotW;
    const y = plotY + ((lapHistory[i].bestLap - minPadded) / fullRange) * plotH;
    circle(x, y, 4);
  }

  // Best lap label
  noStroke();
  fill(80, 255, 140, 200);
  textSize(9);
  textAlign(LEFT);
  text('Best: ' + (minLap / 60).toFixed(1) + 's', plotX + 4, plotY + 10);

  textAlign(LEFT);
}

// ─── p5.js ───────────────────────────────────────────

let camX = 0, camY = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noiseSeed(42);
  track = new Track(currentTrackName);

  for (let i = 0; i < NUM_CARS; i++) {
    cars.push(new Car(null, i));
  }
}

function draw() {
  background(10, 14, 26);

  // Find best alive car to follow
  let bestCar = null;
  let bestProgress = -1;
  let aliveCount = 0;
  for (const car of cars) {
    car.update();
    if (car.alive && !car.finished) {
      aliveCount++;
      if (car.score > bestProgress) {
        bestProgress = car.score;
        bestCar = car;
      }
    }
  }

  // Also consider finished cars for camera
  if (!bestCar) {
    for (const car of cars) {
      if (car.finished && car.score > bestProgress) {
        bestProgress = car.score;
        bestCar = car;
      }
    }
  }

  if (bestCar) {
    camX = lerp(camX, bestCar.pos.x - width / 2, 0.05);
    camY = lerp(camY, bestCar.pos.y - height / 2, 0.05);
  }

  push();
  translate(-camX, -camY);

  track.draw();

  for (const car of cars) {
    if (!car.alive && !car.finished) {
      push();
      tint(255, 30);
      car.draw();
      pop();
    }
  }
  for (const car of cars) {
    if (car.alive || car.finished) car.draw();
  }

  pop();

  frameCounter++;

  if (aliveCount === 0 || (USE_TIMEOUT && frameCounter > MAX_FRAMES)) {
    nextGeneration();
  }

  // ─── HUD ────────────────────────────────────────
  noStroke();
  fill(255, 255, 255, 220);
  textSize(20);
  textStyle(BOLD);
  textAlign(LEFT);
  text(`Gen ${generation}  -  ${currentTrackName}`, 20, 35);

  textSize(15);
  textStyle(NORMAL);
  fill(180, 220, 255, 200);
  const finishedCount = cars.filter(c => c.finished).length;
  text(`Racing: ${aliveCount}/${NUM_CARS}  Finished: ${finishedCount}`, 20, 58);

  const lapStr = bestLapTime < Infinity ? (bestLapTime / 60).toFixed(1) + 's' : '--';
  const genLapStr = genBestLap < Infinity ? (genBestLap / 60).toFixed(1) + 's' : '--';
  fill(80, 255, 140, 220);
  text(`Best Lap: ${lapStr}   Gen Lap: ${genLapStr}`, 20, 78);

  // Neural network visualization (bottom-left)
  const nnCar = bestCar || cars.find(c => c.alive);
  if (nnCar) {
    drawNeuralNet(nnCar.brain, nnCar.sensors, 16, height - 230, 200, 220);
  }

  // Lap time graph (bottom-right)
  drawLapGraph(width - 286, height - 190, 270, 180);
}

function changeTrack(name) {
  currentTrackName = name;
  track = new Track(name);
  cars = [];
  for (let i = 0; i < NUM_CARS; i++) {
    cars.push(new Car(null, i));
  }
  generation = 1;
  allTimeBest = 0;
  bestLapTime = Infinity;
  genBestLap = Infinity;
  lapHistory = [];
  frameCounter = 0;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  changeTrack(currentTrackName);
}
