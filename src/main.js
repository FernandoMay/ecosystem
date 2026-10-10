/**
 * ecosystem UI — canvas rendering + DOM wiring.
 * All simulation logic lives in ./simulation.js (pure, tested).
 */
import { Simulation, Herbivore } from './simulation.js';

const canvas = document.getElementById('ecosystem');
const ctx = canvas.getContext('2d');

const UI = {
  day: document.getElementById('day'),
  herbivores: document.getElementById('herbivore-count'),
  carnivores: document.getElementById('carnivore-count'),
  plants: document.getElementById('plant-count'),
  startPause: document.getElementById('start-pause'),
  restart: document.getElementById('restart'),
  speed: document.getElementById('speed'),
};

const sim = new Simulation({
  width: canvas.width,
  height: canvas.height,
  initialHerbivores: 20,
  initialCarnivores: 5,
  initialPlants: 100,
});

let timer = null;
const TICK_MS = 100;

// --- rendering -----------------------------------------------------------

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of sim.plants) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(74, 222, 128, 0.6)';
    ctx.fill();
  }
  for (const h of sim.herbivores) {
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(52, 211, 153, 0.8)';
    ctx.fill();
  }
  for (const c of sim.carnivores) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.fill();
  }
}

function updateStats() {
  const s = sim.stats();
  UI.day.textContent = s.day;
  UI.herbivores.textContent = s.herbivores;
  UI.carnivores.textContent = s.carnivores;
  UI.plants.textContent = s.plants;
}

function render() {
  draw();
  updateStats();
}

// --- controls ------------------------------------------------------------

function tick() {
  sim.step();
  render();
  if (sim.collapsed) {
    pause();
    UI.startPause.disabled = true;
    UI.startPause.textContent = 'Collapsed';
  }
}

function play() {
  if (timer || sim.collapsed) return;
  timer = setInterval(tick, TICK_MS);
  UI.startPause.textContent = 'Pause';
  UI.startPause.classList.replace('bg-green-500', 'bg-yellow-500');
  UI.startPause.classList.replace('hover:bg-green-600', 'hover:bg-yellow-600');
}

function pause() {
  clearInterval(timer);
  timer = null;
  if (!sim.collapsed) UI.startPause.textContent = 'Start';
  UI.startPause.classList.replace('bg-yellow-500', 'bg-green-500');
  UI.startPause.classList.replace('hover:bg-yellow-600', 'hover:bg-green-600');
}

UI.startPause.addEventListener('click', () => (timer ? pause() : play()));
UI.restart.addEventListener('click', () => {
  pause();
  UI.startPause.disabled = false;
  sim.reset();
  render();
});

UI.speed.addEventListener('change', (e) => {
  const ms = Number(e.target.value);
  if (timer) { clearInterval(timer); timer = setInterval(tick, ms); }
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) * canvas.width) / rect.width;
  const y = ((e.clientY - rect.top) * canvas.height) / rect.height;
  sim.herbivores.push(new Herbivore({ x, y }));
  render();
});

render();
