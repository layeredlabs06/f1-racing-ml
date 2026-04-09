import { NeuralCar } from './nn.js?v=elev2';
import { Car } from './car.js?v=elev2';

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

  const topCount = Math.max(1, Math.ceil(settings.numCars / 5));
  const top = scored.slice(0, topCount).map((s) => cars[s.idx]);

  // Dispose old meshes
  for (const c of cars) state.scene.remove(c.group);

  const newCars = [];
  for (let i = 0; i < settings.numCars; i++) {
    const parent = top[Math.floor(Math.random() * top.length)];
    const child = new NeuralCar(parent.brain.getWeights());
    child.mutate(settings.mutationRate);
    const car = new Car(state.track, child, i, settings.speedMult);
    newCars.push(car);
    state.scene.add(car.group);
  }

  // Update min lap tracking from the generation that just ended
  if (state.genBestLap < state.bestLapTime) state.bestLapTime = state.genBestLap;

  state.cars = newCars;
  state.generation++;
  state.frameCounter = 0;
  state.genBestLap = Infinity;
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
