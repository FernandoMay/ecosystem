/**
 * ecosystem — pure simulation engine (zero DOM, zero dependencies).
 *
 * The engine knows nothing about canvas, HTML or browsers: it only
 * advances a predator-prey-plant model one day at a time. That makes
 * the whole simulation testable under Node (`node --test`).
 *
 * Randomness is injected (defaults to Math.random) so tests can run
 * deterministic scenarios by seeding a fake RNG.
 */

export const PLANTS_MAX = 500;

const CREATURE_DEFAULTS = {
  energy: 100,
  age: 0,
  maxAge: 300,          // midpoint of the legacy 200-300 day lifespan
  speed: 1.5,
  direction: 0,
};

export class Plant {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 3;
    this.energy = 20;
  }
}

export class Creature {
  constructor({ x, y, energy, age, maxAge, speed, direction }) {
    this.x = x;
    this.y = y;
    this.energy = energy ?? CREATURE_DEFAULTS.energy;
    this.age = age ?? CREATURE_DEFAULTS.age;
    this.maxAge = maxAge ?? CREATURE_DEFAULTS.maxAge;
    this.speed = speed ?? CREATURE_DEFAULTS.speed;
    this.direction = direction ?? CREATURE_DEFAULTS.direction;
  }

  /** Move one step; consumes energy; bounces off the walls. */
  move(world, rng) {
    this.x += Math.cos(this.direction) * this.speed;
    this.y += Math.sin(this.direction) * this.speed;
    this.energy -= 0.1;

    if (this.x < this.radius || this.x > world.width - this.radius) {
      this.direction = Math.PI - this.direction;
      this.x = Math.max(this.radius, Math.min(world.width - this.radius, this.x));
    }
    if (this.y < this.radius || this.y > world.height - this.radius) {
      this.direction = -this.direction;
      this.y = Math.max(this.radius, Math.min(world.height - this.radius, this.y));
    }
    if (rng() < 0.05) {
      this.direction += (rng() - 0.5) * Math.PI / 2;
    }
  }

  isDead() {
    return this.energy <= 0 || this.age > this.maxAge;
  }
}

export class Herbivore extends Creature {
  constructor(props) {
    super(props);
    this.radius = 5;
    this.reproductionCooldown = 0;
  }

  /** Eat one overlapping plant, if any. Returns true if it ate. */
  eat(plants) {
    for (let i = plants.length - 1; i >= 0; i--) {
      const p = plants[i];
      if (Math.hypot(this.x - p.x, this.y - p.y) < this.radius + p.radius) {
        this.energy += p.energy;
        plants.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  reproduce() {
    if (this.energy > 150 && this.reproductionCooldown <= 0) {
      this.energy -= 50;
      this.reproductionCooldown = 50;
      return new Herbivore({ x: this.x, y: this.y });
    }
    return null;
  }
}

export class Carnivore extends Creature {
  constructor(props) {
    super(props);
    this.radius = 7;
    this.speed = 1.2 + (props?.rng?.() ?? 0.5) * 0.5;
    this.reproductionCooldown = 0;
  }

  /** Hunt the closest herbivore; kills it on contact. Returns prey eaten. */
  hunt(herbivores) {
    let closest = null;
    let minDistance = Infinity;

    for (const h of herbivores) {
      const d = Math.hypot(this.x - h.x, this.y - h.y);
      if (d < minDistance) {
        minDistance = d;
        closest = h;
      }
    }
    if (!closest) return false;

    this.direction = Math.atan2(closest.y - this.y, closest.x - this.x);
    if (minDistance < this.radius + closest.radius) {
      this.energy += closest.energy * 0.5;
      closest.energy = 0; // prey dies
      return true;
    }
    return false;
  }

  reproduce() {
    if (this.energy > 200 && this.reproductionCooldown <= 0) {
      this.energy -= 100;
      this.reproductionCooldown = 80;
      return new Carnivore({ x: this.x, y: this.y });
    }
    return null;
  }
}

export class Simulation {
  constructor({
    width = 800,
    height = 600,
    initialHerbivores = 20,
    initialCarnivores = 5,
    initialPlants = 100,
    plantGrowthRate = 2,
    rng = Math.random,
  } = {}) {
    this.width = width;
    this.height = height;
    this.initialHerbivores = initialHerbivores;
    this.initialCarnivores = initialCarnivores;
    this.initialPlants = initialPlants;
    this.plantGrowthRate = plantGrowthRate;
    this.rng = rng;

    this.day = 0;
    this.herbivores = [];
    this.carnivores = [];
    this.plants = [];
    this.collapsed = false;
    this.reset();
  }

  reset() {
    this.day = 0;
    this.collapsed = false;
    this.herbivores = [];
    this.carnivores = [];
    this.plants = [];
    const spawn = () => ({
      x: this.rng() * this.width,
      y: this.rng() * this.height,
    });
    for (let i = 0; i < this.initialHerbivores; i++) {
      this.herbivores.push(new Herbivore(spawn()));
    }
    for (let i = 0; i < this.initialCarnivores; i++) {
      this.carnivores.push(new Carnivore(spawn()));
    }
    for (let i = 0; i < this.initialPlants; i++) {
      this.plants.push(new Plant(this.rng() * this.width, this.rng() * this.height));
    }
  }

  /** Advance the world by one day. */
  step() {
    if (this.collapsed) return;
    this.day++;

    // Plants grow (capped)
    for (let i = 0; i < this.plantGrowthRate; i++) {
      if (this.plants.length < PLANTS_MAX) {
        this.plants.push(new Plant(this.rng() * this.width, this.rng() * this.height));
      }
    }

    const newborns = [];
    for (const h of this.herbivores) {
      h.move(this, this.rng);
      h.age++;
      h.eat(this.plants);
      if (h.reproductionCooldown > 0) h.reproductionCooldown--;
      const child = h.reproduce();
      if (child) newborns.push(child);
    }
    this.herbivores = this.herbivores.concat(newborns);
    this.herbivores = this.herbivores.filter((h) => !h.isDead());

    const carnivoreNewborns = [];
    for (const c of this.carnivores) {
      c.move(this, this.rng);
      c.age++;
      c.hunt(this.herbivores);
      if (c.reproductionCooldown > 0) c.reproductionCooldown--;
      const child = c.reproduce();
      if (child) carnivoreNewborns.push(child);
    }
    this.carnivores = this.carnivores.concat(carnivoreNewborns);
    this.carnivores = this.carnivores.filter((c) => !c.isDead());
    // Prey killed by hunting is removed after the carnivore pass.
    this.herbivores = this.herbivores.filter((h) => !h.isDead());

    if (this.herbivores.length === 0 && this.carnivores.length === 0) {
      this.collapsed = true;
    }
  }

  stats() {
    return {
      day: this.day,
      herbivores: this.herbivores.length,
      carnivores: this.carnivores.length,
      plants: this.plants.length,
      collapsed: this.collapsed,
    };
  }
}
