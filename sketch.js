// F1 Racing ML - Neural Network Evolution Simulator
// Cars learn to drive around a track using neuroevolution

const NUM_CARS = 30;
const NUM_SENSORS = 5;
const HIDDEN_SIZE = 4;
const MUTATION_RATE = 0.3;
const SENSOR_LENGTH = 120;
const CAR_RADIUS = 12;

let track;
let cars = [];
let generation = 1;
let bestScore = 0;
let allTimeBest = 0;
let frameCounter = 0;
const MAX_FRAMES = 600;

// ─── Track ───────────────────────────────────────────

class Track {
  constructor() {
    this.points = [];
    this.innerPoints = [];
    this.outerPoints = [];
    this.width = 50;
    this.buildTrack();
  }

  buildTrack() {
    const cx = width / 2;
    const cy = height / 2;
    const baseRadius = Math.min(width, height) * 0.32;
    const numPoints = 60;

    // Generate organic track shape with noise
    const offsets = [];
    for (let i = 0; i < numPoints; i++) {
      const angle = (TWO_PI / numPoints) * i;
      const n = noise(cos(angle) * 1.5 + 10, sin(angle) * 1.5 + 10);
      offsets.push(baseRadius * (0.6 + n * 0.7));
    }

    // Smooth the offsets
    const smoothed = [];
    for (let i = 0; i < numPoints; i++) {
      let sum = 0;
      for (let j = -3; j <= 3; j++) {
        sum += offsets[(i + j + numPoints) % numPoints];
      }
      smoothed.push(sum / 7);
    }

    this.points = [];
    this.innerPoints = [];
    this.outerPoints = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (TWO_PI / numPoints) * i;
      const r = smoothed[i];
      const x = cx + cos(angle) * r;
      const y = cy + sin(angle) * r;
      this.points.push(createVector(x, y));

      const nx = cos(angle);
      const ny = sin(angle);
      this.innerPoints.push(createVector(x - nx * this.width, y - ny * this.width));
      this.outerPoints.push(createVector(x + nx * this.width, y + ny * this.width));
    }
  }

  getStartPos() {
    const p = this.points[0].copy();
    return { pos: p, angle: atan2(this.points[1].y - p.y, this.points[1].x - p.x) };
  }

  isOnTrack(x, y) {
    // Check if point is between inner and outer boundaries
    let minDist = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      const d = dist(x, y, this.points[i].x, this.points[i].y);
      minDist = Math.min(minDist, d);
    }

    // Find closest track center point
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      const d = dist(x, y, this.points[i].x, this.points[i].y);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }

    return closestDist < this.width;
  }

  getProgress(x, y) {
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      const d = dist(x, y, this.points[i].x, this.points[i].y);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }
    return closestIdx;
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
    // Track fill
    noStroke();
    fill(20, 28, 50, 180);
    beginShape();
    for (const p of this.outerPoints) vertex(p.x, p.y);
    endShape(CLOSE);

    // Cut inner
    fill(10, 14, 26);
    beginShape();
    for (const p of this.innerPoints) vertex(p.x, p.y);
    endShape(CLOSE);

    // Track borders
    noFill();
    strokeWeight(2);

    // Outer border
    stroke(60, 130, 200, 120);
    beginShape();
    for (const p of this.outerPoints) curveVertex(p.x, p.y);
    for (let i = 0; i < 3; i++) curveVertex(this.outerPoints[i].x, this.outerPoints[i].y);
    endShape();

    // Inner border
    stroke(60, 130, 200, 120);
    beginShape();
    for (const p of this.innerPoints) curveVertex(p.x, p.y);
    for (let i = 0; i < 3; i++) curveVertex(this.innerPoints[i].x, this.innerPoints[i].y);
    endShape();

    // Center line (dashed)
    stroke(40, 80, 140, 40);
    strokeWeight(1);
    for (let i = 0; i < this.points.length; i += 2) {
      const j = (i + 1) % this.points.length;
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
    this.maxProgress = 0;
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
    this.speed = 1.5 + (decision.gas + 1) * 1.5; // 1.5 ~ 4.5

    // Move
    this.pos.x += cos(this.angle) * this.speed;
    this.pos.y += sin(this.angle) * this.speed;

    // Check if on track
    if (!track.isOnTrack(this.pos.x, this.pos.y)) {
      this.alive = false;
      return;
    }

    // Update score (track progress)
    const progress = track.getProgress(this.pos.x, this.pos.y);
    if (progress > this.maxProgress || (this.maxProgress > track.points.length * 0.8 && progress < track.points.length * 0.2)) {
      this.maxProgress = Math.max(this.maxProgress, progress);
      this.score = this.maxProgress;
      this.stuckFrames = 0;
    } else {
      this.stuckFrames++;
      if (this.stuckFrames > 80) {
        this.alive = false;
      }
    }
  }

  draw() {
    if (!this.alive) return;

    // Sensors
    stroke(255, 160, 50, 100);
    strokeWeight(1);
    for (let i = 0; i < this.sensorAngles.length; i++) {
      const d = this.sensors[i] * SENSOR_LENGTH;
      const ex = this.pos.x + cos(this.angle + this.sensorAngles[i]) * d;
      const ey = this.pos.y + sin(this.angle + this.sensorAngles[i]) * d;
      line(this.pos.x, this.pos.y, ex, ey);

      // Sensor endpoint dot
      fill(255, 160, 50);
      noStroke();
      circle(ex, ey, 4);
    }

    // Car body (glowing orange circle)
    noStroke();

    // Glow
    for (let r = CAR_RADIUS * 2.5; r > CAR_RADIUS; r -= 3) {
      const alpha = map(r, CAR_RADIUS, CAR_RADIUS * 2.5, 60, 0);
      fill(255, 140, 30, alpha);
      circle(this.pos.x, this.pos.y, r * 2);
    }

    // Core
    fill(255, 160, 50);
    circle(this.pos.x, this.pos.y, CAR_RADIUS * 2);

    // Inner highlight
    fill(255, 200, 100, 180);
    circle(this.pos.x - 2, this.pos.y - 2, CAR_RADIUS);
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

  track.draw();

  let aliveCount = 0;
  for (const car of cars) {
    car.update();
    if (car.alive) aliveCount++;
  }

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

  frameCounter++;

  // Next generation if all dead or time up
  if (aliveCount === 0 || frameCounter > MAX_FRAMES) {
    nextGeneration();
  }

  // HUD
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
