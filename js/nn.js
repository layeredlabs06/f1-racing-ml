// Neural network (ported 1:1 from the 2D version)

export const NUM_SENSORS = 7;
export const HIDDEN_SIZE = 8;

function randomGaussian(mean = 0, std = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class NeuralCar {
  constructor(weights) {
    if (!weights) {
      this.w1 = this.randomMatrix(NUM_SENSORS, HIDDEN_SIZE);
      this.w2 = this.randomMatrix(HIDDEN_SIZE, 2);
    } else {
      this.w1 = weights.w1.map((row) => [...row]);
      this.w2 = weights.w2.map((row) => [...row]);
    }
    this._lastHidden = [];
    this._lastOutput = [];
  }

  randomMatrix(rows, cols) {
    const m = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) row.push(randomGaussian(0, 1));
      m.push(row);
    }
    return m;
  }

  think(sensors) {
    const hidden = [];
    for (let j = 0; j < HIDDEN_SIZE; j++) {
      let sum = 0;
      for (let i = 0; i < sensors.length; i++) sum += sensors[i] * this.w1[i][j];
      hidden.push(Math.tanh(sum));
    }

    const output = [];
    for (let j = 0; j < 2; j++) {
      let sum = 0;
      for (let i = 0; i < HIDDEN_SIZE; i++) sum += hidden[i] * this.w2[i][j];
      output.push(Math.tanh(sum));
    }

    this._lastHidden = hidden;
    this._lastOutput = output;
    return { steer: output[0], gas: output[1] };
  }

  mutate(rate) {
    for (let i = 0; i < this.w1.length; i++) {
      for (let j = 0; j < this.w1[i].length; j++) {
        this.w1[i][j] += randomGaussian(0, 1) * rate;
      }
    }
    for (let i = 0; i < this.w2.length; i++) {
      for (let j = 0; j < this.w2[i].length; j++) {
        this.w2[i][j] += randomGaussian(0, 1) * rate;
      }
    }
  }

  getWeights() {
    return {
      w1: this.w1.map((row) => [...row]),
      w2: this.w2.map((row) => [...row]),
    };
  }
}

export const F1_TEAMS = [
  { name: 'Red Bull',     main: 0x3671c6, accent: 0xffcd00 },
  { name: 'Ferrari',      main: 0xe8002d, accent: 0xffffff },
  { name: 'McLaren',      main: 0xff8000, accent: 0x000000 },
  { name: 'Mercedes',     main: 0x27f4d2, accent: 0x000000 },
  { name: 'Aston Martin', main: 0x006f62, accent: 0xcedc00 },
  { name: 'Alpine',       main: 0x0093cc, accent: 0xff57a4 },
  { name: 'Williams',     main: 0x64c4ff, accent: 0x003778 },
  { name: 'RB',           main: 0x6692ff, accent: 0xff0000 },
  { name: 'Kick Sauber',  main: 0x52e252, accent: 0x000000 },
  { name: 'Haas',         main: 0xb6babd, accent: 0xe8002d },
];
