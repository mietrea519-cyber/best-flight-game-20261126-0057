// Sky Courier — the world: islands, sea, runways and rings, all generated
// from a mission seed so every mission (and every screenshot) is stable.
// The world is a side view: x runs in metres along the flight path, y is
// altitude in metres above the sea. Islands are smooth bumps; between them is
// open water. Each mission has a start runway, a destination runway and a
// chain of glowing rings to fly through.

import { WORLD } from './config.js';

// A small seeded generator so terrain is identical on every load.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(a, b, t) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

export function buildWorld(seed, direction) {
  const rand = mulberry32(seed);
  const length = WORLD.length;
  const dir = direction >= 0 ? 1 : -1;

  // Islands: a start island, a destination island, and two or three in
  // between for the eye. Each is a centre, a half-width and a peak height.
  const islands = [];
  const startX = dir > 0 ? 120 : length - 120;
  const endX = dir > 0 ? length - 120 : 120;
  islands.push({ x: startX, half: 260, peak: 26, palms: 5, huts: 2 });
  islands.push({ x: endX, half: 300, peak: 30, palms: 6, huts: 3 });
  const midCount = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < midCount; i++) {
    const x = 1200 + (i * (length - 2400)) / Math.max(1, midCount - 1) + (rand() - 0.5) * 500;
    islands.push({
      x,
      half: 180 + rand() * 160,
      peak: 20 + rand() * 25,
      palms: 3 + Math.floor(rand() * 5),
      huts: Math.floor(rand() * 3),
    });
  }
  islands.sort((a, b) => a.x - b.x);

  // Terrain height: the highest island bump at x, else the sea (0).
  function groundHeight(x) {
    let h = 0;
    for (const island of islands) {
      const d = Math.abs(x - island.x) / island.half;
      if (d < 1) {
        const bump = island.peak * (Math.cos(d * Math.PI) * 0.5 + 0.5);
        h = Math.max(h, bump);
      }
    }
    return h;
  }

  // Runways sit flat on the start and destination islands.
  function runwayAt(x) {
    const start = { x: startX, half: 150 };
    const end = { x: endX, half: 150 };
    if (Math.abs(x - start.x) < start.half) return start;
    if (Math.abs(x - end.x) < end.half) return end;
    return null;
  }

  // A runway is flat ground: override the bump under its strip.
  function flatGroundHeight(x) {
    const runway = runwayAt(x);
    if (runway) return 14;
    return groundHeight(x);
  }

  // Clouds: fixed puffs placed by the seed, drifting slowly with the wind.
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    clouds.push({
      x: rand() * length,
      y: 150 + rand() * 170,
      scale: 0.7 + rand() * 1.3,
      speed: 2 + rand() * 4,
    });
  }

  // Rings: a chain from the start runway to the destination, weaving in
  // altitude so the pilot must climb, dive and level out.
  const rings = [];
  const ringCount = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < ringCount; i++) {
    const t = (i + 1) / (ringCount + 1);
    const x = startX + (endX - startX) * t + (rand() - 0.5) * 260;
    const base = 85 + Math.sin(t * Math.PI * 2.2) * 40 + rand() * 35;
    rings.push({
      x,
      y: Math.max(55, Math.min(180, base)),
      r: WORLD.ringRadius,
      passed: false,
    });
  }

  // One cargo drop zone on a mid island: a marked beach the player can hit.
  const dropIsland = islands[Math.floor(islands.length / 2)];
  const dropZone = { x: dropIsland.x, y: flatGroundHeight(dropIsland.x), hit: false };

  return {
    seed,
    dir,
    length,
    islands,
    clouds,
    rings,
    dropZone,
    startX,
    endX,
    groundHeight,
    flatGroundHeight,
    runwayAt,
  };
}
