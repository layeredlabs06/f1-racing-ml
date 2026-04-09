import { NeuralCar } from './nn.js';
import { Car } from './car.js';

// Single-point crossover on each weight matrix row: child inherits rows from
// parentA with probability 0.5, otherwise from parentB. Gives the population
// a real recombination operator on top of pure mutation.
function crossoverBrain(aWeights, bWeights) {
  const mix = (A, B) => A.map((row, i) => (Math.random() < 0.5 ? [...row] : [...B[i]]));
  return new NeuralCar({
    w1: mix(aWeights.w1, bWeights.w1),
    w2: mix(aWeights.w2, bWeights.w2),
  });
}

export function nextGeneration(state) {
  const { cars, settings } = state;
  const avgProg = cars.reduce((s, c) => s + c.totalProgress, 0) / cars.length;
  state.lapHistory.push({
    gen: state.generation,
    bestLap: state.genBestLap < Infinity ? state.genBestLap : null,
    avgProgress: avgProg,
  });
  if (state.lapHistory.length > 100) state.lapHistory.shift();

  const scored = cars
    .map((c, i) => ({ idx: i, score: c.score }))
    .sort((a, b) => b.score - a.score);

  state.bestScore = scored[0]?.score || 0;
  state.allTimeBest = Math.max(state.allTimeBest, state.bestScore);

  const topCount = Math.max(2, Math.ceil(settings.numCars / 5));
  const topCars = scored.slice(0, topCount).map((s) => cars[s.idx]);
  const eliteCount = Math.min(2, topCount);

  // Dispose old meshes
  for (const c of cars) state.scene.remove(c.group);

  const newCars = [];

  // 1) Elite carryover — top N genomes survive unchanged so the best
  //    discovered brain is never lost to a bad mutation.
  for (let i = 0; i < eliteCount && newCars.length < settings.numCars; i++) {
    const elite = new NeuralCar(topCars[i].brain.getWeights());
    newCars.push(new Car(state.track, elite, newCars.length, settings.speedMult));
  }

  // 2) Crossover children from randomly paired parents in the top pool,
  //    then mutated lightly for exploration.
  while (newCars.length < settings.numCars) {
    const a = topCars[Math.floor(Math.random() * topCars.length)];
    let b = topCars[Math.floor(Math.random() * topCars.length)];
    if (topCars.length > 1 && b === a) {
      b = topCars[(topCars.indexOf(a) + 1) % topCars.length];
    }
    const child = crossoverBrain(a.brain.getWeights(), b.brain.getWeights());
    child.mutate(settings.mutationRate);
    newCars.push(new Car(state.track, child, newCars.length, settings.speedMult));
  }

  for (const car of newCars) state.scene.add(car.group);

  if (state.genBestLap < state.bestLapTime) state.bestLapTime = state.genBestLap;

  state.cars = newCars;
  state.generation++;
  state.frameCounter = 0;
  state.genBestLap = Infinity;
  state.followCar = null;
}

export function initialCars(state) {
  const { scene, track, settings } = state;
  const cars = [];
  for (let i = 0; i < settings.numCars; i++) {
    const car = new Car(track, null, i, settings.speedMult);
    cars.push(car);
    scene.add(car.group);
  }
  return cars;
}
