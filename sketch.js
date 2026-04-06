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

let track;
let cars = [];
let generation = 1;
let bestScore = 0;
let allTimeBest = 0;
let frameCounter = 0;

// ─── Track ───────────────────────────────────────────

class Track {
  constructor() {
    this.points = [];
    this.innerPoints = [];
    this.outerPoints = [];
    this.width = 40;
    this.buildTrack();
  }

  buildTrack() {
    // Monaco GP — clean layout, no overlapping
    // Strategy: the circuit is a single loop that never crosses itself
    // Left side = pit straight (x≈0.05), everything else is to the right
    const monacoRaw = [
      // Start/Finish straight (top, going right) y≈0.12
      [0.15, 0.12], [0.22, 0.10], [0.30, 0.08], [0.38, 0.07],
      // T1 Sainte Dévote (turn right, head down-right)
      [0.42, 0.08], [0.44, 0.12],
      // Beau Rivage (heading right and slightly down)
      [0.47, 0.18], [0.50, 0.24],
      // T2-3 Casino (curve right)
      [0.54, 0.28], [0.58, 0.28], [0.62, 0.26],
      // T4-5 Mirabeau → Grand Hotel
      [0.68, 0.22], [0.74, 0.18], [0.80, 0.14],
      // Grand Hotel Hairpin (far right)
      [0.85, 0.13], [0.88, 0.16], [0.88, 0.21],
      [0.85, 0.24],
      // T6-7-8 Portier → right side descent
      [0.87, 0.30], [0.90, 0.36], [0.92, 0.42],
      [0.90, 0.48],
      // Tunnel entrance → straight left
      [0.85, 0.50], [0.78, 0.52], [0.70, 0.53],
      [0.60, 0.54], [0.50, 0.55],
      // T10-11 Chicane (gentle)
      [0.44, 0.55], [0.40, 0.54],
      // T12 Tabac → Swimming Pool
      [0.36, 0.53], [0.32, 0.52], [0.28, 0.52],
      // T13-14-15 Swimming Pool → heading down (x≈0.24)
      [0.24, 0.54], [0.22, 0.58], [0.22, 0.64],
      [0.22, 0.70],
      // T16-17 Rascasse (smooth wide turn, x goes from 0.22 → 0.12)
      [0.22, 0.76], [0.20, 0.80], [0.16, 0.82],
      [0.12, 0.80],
      // T18-19 Anthony Noghes (heading up, x≈0.08)
      [0.10, 0.76], [0.08, 0.70], [0.07, 0.64],
      // Pit straight (x≈0.06, straight up to start)
      [0.06, 0.56], [0.06, 0.46], [0.06, 0.36],
      [0.06, 0.26], [0.08, 0.18],
      // Close to start
      [0.11, 0.14],
    ];

    const margin = 100;
    const scaleX = 3000;
    const scaleY = 2000;

    this.points = [];
    this.innerPoints = [];
    this.outerPoints = [];

    // Convert to canvas coordinates
    const rawPoints = monacoRaw.map(([rx, ry]) =>
      createVector(margin + rx * scaleX, margin + ry * scaleY)
    );

    // Linear interpolation between points (no overshoot)
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

    // Compute smoothed normals using average of prev/next tangents
    const normals = [];
    for (let i = 0; i < interpolated.length; i++) {
      const prev = interpolated[(i - 1 + interpolated.length) % interpolated.length];
      const next = interpolated[(i + 1) % interpolated.length];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      normals.push({ x: -dy / len, y: dx / len });
    }

    // Build center, inner, outer points
    for (let i = 0; i < interpolated.length; i++) {
      const curr = interpolated[i];
      const nx = normals[i].x;
      const ny = normals[i].y;

      this.points.push(curr.copy());
      this.innerPoints.push(createVector(curr.x - nx * this.width, curr.y - ny * this.width));
      this.outerPoints.push(createVector(curr.x + nx * this.width, curr.y + ny * this.width));
    }
  }

  getStartPos() {
    const p = this.points[0].copy();
    return { pos: p, angle: atan2(this.points[1].y - p.y, this.points[1].x - p.x) };
  }

  isOnTrack(x, y) {
    // Check distance to nearest track segment (not just points)
    let minDist = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      const j = (i + 1) % this.points.length;
      const d = this._distToSegment(x, y, this.points[i], this.points[j]);
      if (d < minDist) minDist = d;
    }
    return minDist < this.width;
  }

  getProgress(x, y, lastProgress) {
    // Search in a window around lastProgress to avoid jumping to distant segments
    const n = this.points.length;
    const searchRange = Math.floor(n * 0.15); // search ±15% of track
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

  _distToSegment(px, py, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return dist(px, py, a.x, a.y);
    let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return dist(px, py, a.x + t * dx, a.y + t * dy);
  }

  castRay(x, y, angle) {
    const step = 3;
    for (let d = 0; d < SENSOR_LENGTH; d += step) {
      const rx = x + cos(angle) * d;
      const ry = y + sin(angle) * d;
      if (!this.isOnTrack(rx, ry)) {
        return d;
      }
    }
    return SENSOR_LENGTH;
  }

  draw() {
    // Track surface — thick stroke along center line
    const n = this.points.length;
    stroke(20, 28, 50, 180);
    strokeWeight(this.width * 2);
    strokeCap(ROUND);
    noFill();
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      line(this.points[i].x, this.points[i].y, this.points[j].x, this.points[j].y);
    }

    // Track borders
    noFill();
    strokeWeight(2);
    stroke(60, 130, 200, 120);

    // Outer border
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      line(this.outerPoints[i].x, this.outerPoints[i].y,
           this.outerPoints[j].x, this.outerPoints[j].y);
    }

    // Inner border
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      line(this.innerPoints[i].x, this.innerPoints[i].y,
           this.innerPoints[j].x, this.innerPoints[j].y);
    }

    // Center line (dashed)
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
      // 5 sensors → 4 hidden → 2 outputs
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
    // Forward pass
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
  constructor(brain) {
    const start = track.getStartPos();
    this.pos = start.pos.copy();
    this.angle = start.angle;
    this.speed = 0;
    this.alive = true;
    this.score = 0;
    this.maxProgress = track.getProgress(this.pos.x, this.pos.y);
    this.lastProgress = this.maxProgress;
    this.stuckFrames = 0;
    this.brain = brain || new NeuralCar();
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
    if (!this.alive) return;

    // Read sensors
    this.sensors = [];
    for (const sa of this.sensorAngles) {
      const d = track.castRay(this.pos.x, this.pos.y, this.angle + sa);
      this.sensors.push(d / SENSOR_LENGTH); // normalize 0-1
    }

    // Neural network decision
    const decision = this.brain.think(this.sensors);
    this.angle += decision.steer * 0.08;
    this.speed = (3 + (decision.gas + 1) * 3) * SPEED_MULT;

    // Move
    this.pos.x += cos(this.angle) * this.speed;
    this.pos.y += sin(this.angle) * this.speed;

    // Check if on track
    if (!track.isOnTrack(this.pos.x, this.pos.y)) {
      this.alive = false;
      return;
    }

    // Update score (track progress)
    const progress = track.getProgress(this.pos.x, this.pos.y, this.lastProgress);
    this.lastProgress = progress;

    // Calculate forward movement considering lap wrapping
    const n = track.points.length;
    const diff = (progress - this.maxProgress + n) % n;
    if (diff > 0 && diff < n * 0.5) {
      this.maxProgress = progress;
      this.score += diff;
      this.stuckFrames = 0;
    } else {
      this.stuckFrames++;
      if (this.stuckFrames > 300) {
        this.alive = false;
      }
    }
  }

  draw() {
    if (!this.alive) return;

    // Sensors
    stroke(255, 160, 50, 120);
    strokeWeight(1.5);
    for (let i = 0; i < this.sensorAngles.length; i++) {
      const d = this.sensors[i] * SENSOR_LENGTH;
      const ex = this.pos.x + cos(this.angle + this.sensorAngles[i]) * d;
      const ey = this.pos.y + sin(this.angle + this.sensorAngles[i]) * d;
      line(this.pos.x, this.pos.y, ex, ey);

      // Sensor endpoint dot
      fill(255, 160, 50);
      noStroke();
      circle(ex, ey, 5);
    }

    // F1 car body (top-down view)
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    // Glow
    noStroke();
    for (let r = CAR_RADIUS * 3; r > CAR_RADIUS; r -= 3) {
      const alpha = map(r, CAR_RADIUS, CAR_RADIUS * 3, 50, 0);
      fill(255, 120, 20, alpha);
      ellipse(0, 0, r * 2.5, r * 1.8);
    }

    // Rear wing
    fill(200, 100, 20);
    stroke(255, 140, 40);
    strokeWeight(1);
    rect(-CAR_RADIUS * 1.4, -CAR_RADIUS * 0.9, 4, CAR_RADIUS * 1.8, 1);

    // Front wing
    rect(CAR_RADIUS * 1.1, -CAR_RADIUS * 0.7, 4, CAR_RADIUS * 1.4, 1);

    // Main body (elongated)
    noStroke();
    fill(255, 150, 40);
    beginShape();
    vertex(CAR_RADIUS * 1.2, 0);
    vertex(CAR_RADIUS * 0.5, -CAR_RADIUS * 0.45);
    vertex(-CAR_RADIUS * 0.8, -CAR_RADIUS * 0.5);
    vertex(-CAR_RADIUS * 1.2, -CAR_RADIUS * 0.35);
    vertex(-CAR_RADIUS * 1.2, CAR_RADIUS * 0.35);
    vertex(-CAR_RADIUS * 0.8, CAR_RADIUS * 0.5);
    vertex(CAR_RADIUS * 0.5, CAR_RADIUS * 0.45);
    endShape(CLOSE);

    // Cockpit (darker center circle)
    fill(220, 110, 20);
    ellipse(0, 0, CAR_RADIUS * 0.9, CAR_RADIUS * 0.7);

    // Cockpit highlight
    fill(255, 200, 80, 160);
    ellipse(CAR_RADIUS * 0.1, -CAR_RADIUS * 0.05, CAR_RADIUS * 0.4, CAR_RADIUS * 0.3);

    // Rear wheels
    fill(60, 60, 60);
    rect(-CAR_RADIUS * 0.9, -CAR_RADIUS * 0.7, CAR_RADIUS * 0.5, CAR_RADIUS * 0.2, 1);
    rect(-CAR_RADIUS * 0.9, CAR_RADIUS * 0.5, CAR_RADIUS * 0.5, CAR_RADIUS * 0.2, 1);

    // Front wheels
    rect(CAR_RADIUS * 0.6, -CAR_RADIUS * 0.55, CAR_RADIUS * 0.4, CAR_RADIUS * 0.15, 1);
    rect(CAR_RADIUS * 0.6, CAR_RADIUS * 0.4, CAR_RADIUS * 0.4, CAR_RADIUS * 0.15, 1);

    pop();
  }
}

// ─── Evolution ───────────────────────────────────────

function nextGeneration() {
  const scores = cars.map((c, i) => ({ idx: i, score: c.score }));
  scores.sort((a, b) => b.score - a.score);

  bestScore = scores[0].score;
  allTimeBest = Math.max(allTimeBest, bestScore);

  // Top 20% survive and breed
  const topCount = Math.ceil(NUM_CARS / 5);
  const top = scores.slice(0, topCount).map(s => cars[s.idx]);

  const newCars = [];
  for (let i = 0; i < NUM_CARS; i++) {
    const parent = random(top);
    const child = new NeuralCar(parent.brain.getWeights());
    child.mutate();
    newCars.push(new Car(child));
  }

  cars = newCars;
  generation++;
  frameCounter = 0;
}

// ─── p5.js ───────────────────────────────────────────

let camX = 0, camY = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noiseSeed(42);
  track = new Track();

  for (let i = 0; i < NUM_CARS; i++) {
    cars.push(new Car());
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
    if (car.alive) {
      aliveCount++;
      if (car.score > bestProgress) {
        bestProgress = car.score;
        bestCar = car;
      }
    }
  }

  // Camera follows best car (smooth lerp)
  if (bestCar) {
    camX = lerp(camX, bestCar.pos.x - width / 2, 0.05);
    camY = lerp(camY, bestCar.pos.y - height / 2, 0.05);
  }

  push();
  translate(-camX, -camY);

  track.draw();

  // Draw dead cars faintly, alive cars on top
  for (const car of cars) {
    if (!car.alive) {
      push();
      tint(255, 30);
      car.draw();
      pop();
    }
  }
  for (const car of cars) {
    if (car.alive) car.draw();
  }

  pop();

  frameCounter++;

  // Next generation when all dead or timeout
  if (aliveCount === 0 || (USE_TIMEOUT && frameCounter > MAX_FRAMES)) {
    nextGeneration();
  }

  // HUD (fixed position, not affected by camera)
  noStroke();
  fill(255, 255, 255, 220);
  textSize(20);
  textStyle(BOLD);
  textAlign(LEFT);
  text(`Gen ${generation}`, 20, 35);

  textSize(15);
  textStyle(NORMAL);
  fill(180, 220, 255, 200);
  text(`Alive: ${aliveCount}/${NUM_CARS}`, 20, 58);
  text(`Best: ${allTimeBest}`, 20, 78);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  track = new Track();
  cars = [];
  for (let i = 0; i < NUM_CARS; i++) {
    cars.push(new Car());
  }
  generation = 1;
  allTimeBest = 0;
}
