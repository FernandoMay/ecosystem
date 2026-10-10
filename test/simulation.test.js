/**
 * Engine tests for ecosystem. Deterministic via a fake RNG.
 * Run: node --test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Simulation, Herbivore, Carnivore, Plant, PLANTS_MAX } from '../src/simulation.js';

/** Deterministic RNG: cycles through a fixed 0..1 sequence. */
function fakeRng(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

const HALF = [0.5]; // always 0.5 → reproducible spawns/speeds/directions

function makeSim(overrides = {}) {
  return new Simulation({
    width: 800,
    height: 600,
    rng: HALF.length === 1 ? () => 0.5 : undefined,
    ...overrides,
  });
}

test('initial world is spawned with configured populations', () => {
  const sim = makeSim({ initialHerbivores: 10, initialCarnivores: 3, initialPlants: 50 });
  const s = sim.stats();
  assert.equal(s.herbivores, 10);
  assert.equal(s.carnivores, 3);
  assert.equal(s.plants, 50);
  assert.equal(s.day, 0);
  assert.equal(s.collapsed, false);
});

test('step advances the day counter', () => {
  const sim = makeSim();
  sim.step();
  assert.equal(sim.stats().day, 1);
  sim.step();
  assert.equal(sim.stats().day, 2);
});

test('herbivore eats an overlapping plant and gains its energy', () => {
  const herb = new Herbivore({ x: 100, y: 100 });
  const plant = new Plant(101, 100); // within 5+3 radius
  const before = herb.energy;
  const plants = [plant];
  assert.equal(herb.eat(plants), true);
  assert.equal(plants.length, 0);
  assert.ok(herb.energy > before);
});

test('herbivore does not eat a distant plant', () => {
  const herb = new Herbivore({ x: 0, y: 0 });
  const plants = [new Plant(400, 400)];
  assert.equal(herb.eat(plants), false);
  assert.equal(plants.length, 1);
});

test('carnivore kills a captured herbivore', () => {
  const carn = new Carnivore({ x: 100, y: 100, rng: () => 0.5 });
  const prey = new Herbivore({ x: 105, y: 100 });
  const before = carn.energy;
  prey.move({ width: 800, height: 600 }, () => 0.5); // keep prey where it is-ish
  assert.equal(carn.hunt([prey]), true);
  assert.equal(prey.energy, 0);
  assert.ok(carn.energy > before);
});

test('creatures die of starvation at zero energy', () => {
  const herb = new Herbivore({ x: 0, y: 0 });
  herb.energy = 0;
  assert.equal(herb.isDead(), true);
});

test('creatures die of old age', () => {
  const herb = new Herbivore({ x: 0, y: 0, maxAge: 10 });
  herb.age = 11;
  assert.equal(herb.isDead(), true);
});

test('herbivore reproduces only above 150 energy, with cooldown', () => {
  const herb = new Herbivore({ x: 0, y: 0 });
  herb.energy = 100;
  assert.equal(herb.reproduce(), null); // not enough energy

  herb.energy = 200;
  const child = herb.reproduce();
  assert.ok(child instanceof Herbivore);
  assert.equal(herb.energy, 150); // paid the cost
  assert.equal(herb.reproductionCooldown, 50);

  assert.equal(herb.reproduce(), null); // on cooldown
});

test('plant growth is capped at PLANTS_MAX', () => {
  const sim = makeSim({ initialPlants: PLANTS_MAX, plantGrowthRate: 10 });
  sim.step();
  assert.ok(sim.plants.length <= PLANTS_MAX);
});

test('ecosystem flags collapse when all creatures die', () => {
  const sim = makeSim();
  sim.herbivores = [];
  sim.carnivores = [];
  // plants alone cannot keep it alive: collapse is checked in step()
  // so simulate any creature-less world as collapsed via manual step:
  sim.plants = [];
  sim.step();
  assert.equal(sim.collapsed, true);
  assert.equal(sim.stats().collapsed, true);
});

test('collapsed simulation stops advancing', () => {
  const sim = makeSim();
  sim.herbivores = [];
  sim.carnivores = [];
  sim.plants = [];
  sim.step();          // collapse
  const day = sim.day;
  sim.step();          // no-op
  assert.equal(sim.day, day);
});

test('simulation is reproducible with a seeded rng', () => {
  const seq = Array.from({ length: 1000 }, (_, i) => (i * 7 % 101) / 100);
  const simA = new Simulation({ rng: fakeRng(seq), initialHerbivores: 5 });
  const simB = new Simulation({ rng: fakeRng(seq), initialHerbivores: 5 });
  for (let i = 0; i < 10; i++) { simA.step(); simB.step(); }
  assert.deepEqual(simA.stats(), simB.stats());
});
