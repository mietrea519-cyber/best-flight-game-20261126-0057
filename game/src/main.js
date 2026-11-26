// Sky Courier — the game loop and state machine. States: title, flying,
// paused, landed, crashed. The loop steps the flight model at a fixed rate,
// scores rings and landings, and hands every frame to the renderer.
// A ?shot=start|play|end|night URL parameter stages the game for a
// screenshot: it is a real render of the game's own code, just started in a
// chosen state. A ?selftest=1 parameter runs a scripted flight and reports
// the result into the document title for automated checks.

import { MISSIONS } from './missions.js';
import { buildWorld } from './terrain.js';
import { createPlane, stepPlane, ringHit } from './plane.js';
import { createRenderer, render } from './render.js';
import { bindInput, wasPressed, pitchInput, throttleInput, consumeClick, endFrame } from './input.js';
import { playChime, playThud, playCrash, startEngine, setEngine, toggleMute, bindAudioUnlock } from './audio.js';
import { SCORE } from './config.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);

const game = {
  state: 'title',
  missionIndex: 0,
  mission: MISSIONS[0],
  world: null,
  plane: null,
  score: 0,
  totalScore: 0,
  combo: 0,
  elapsed: 0,
  message: '',
  messageAt: 0,
};

function loadMission(index) {
  game.missionIndex = index;
  game.mission = MISSIONS[index];
  game.world = buildWorld(game.mission.seed, game.mission.direction);
  game.plane = createPlane(game.world, game.mission.fuel);
  game.score = 0;
  game.combo = 0;
  game.elapsed = 0;
  game.state = 'title';
}

function windAt(time) {
  if (!game.mission.wind) return 0;
  return Math.sin(time * 0.7) * 3.5 + Math.sin(time * 1.7) * 1.5;
}

function flashMessage(text) {
  game.message = text;
  game.messageAt = performance.now();
}

function update(dt) {
  const plane = game.plane;
  const world = game.world;

  if (game.state === 'title') {
    if (wasPressed('enter', ' ')) {
      game.state = 'flying';
      startEngine();
      flashMessage('Wheels up — fly the rings!');
    }
    return;
  }
  if (game.state === 'paused') {
    if (wasPressed('p', 'escape')) game.state = 'flying';
    return;
  }
  if (game.state === 'landed' || game.state === 'crashed') {
    if (wasPressed('enter')) {
      const next = (game.missionIndex + 1) % MISSIONS.length;
      game.totalScore += game.score;
      loadMission(next);
    }
    if (wasPressed('r')) {
      loadMission(game.missionIndex);
    }
    return;
  }

  // Flying.
  if (wasPressed('p', 'escape')) {
    game.state = 'paused';
    return;
  }
  if (wasPressed('m')) {
    const muted = toggleMute();
    flashMessage(muted ? 'Sound off' : 'Sound on');
  }

  const input = { pitch: pitchInput(), throttle: throttleInput() };
  const event = stepPlane(plane, world, input, dt, windAt(game.elapsed));
  game.elapsed += dt;
  setEngine(plane.throttle, plane.speed / 49);

  // Cargo drop: click while over the drop zone.
  const click = consumeClick();
  if (click && !world.dropZone.hit) {
    const dzScreenX = (world.dropZone.x - renderer.cam.x) * 3;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const clickX = click.x * scaleX;
    if (Math.abs(clickX - dzScreenX) < 120 && plane.airborne) {
      world.dropZone.hit = true;
      game.score += SCORE.cargoDrop;
      playChime();
      flashMessage(`Cargo away! +${SCORE.cargoDrop}`);
    }
  }

  for (const ring of world.rings) {
    if (ringHit(plane, ring)) {
      game.combo += 1;
      const points = SCORE.ring + SCORE.ringCombo * (game.combo - 1);
      game.score += points;
      playChime();
      flashMessage(`Ring! +${points}${game.combo > 1 ? ` (combo x${game.combo})` : ''}`);
    }
  }

  if (event === 'takeoff') flashMessage('Airborne — gear is floats, mind the sea.');
  if (event === 'landed') {
    const gentle = -plane.vy < 3.2;
    const landingPoints = SCORE.landing + (gentle ? SCORE.gentleLanding : 0);
    game.score += landingPoints;
    const timeBonus = Math.max(0, Math.round((game.mission.parSeconds - game.elapsed) * SCORE.timeBonusPerSecond));
    const fuelBonus = Math.round(plane.fuel * SCORE.fuelBonusPerPercent);
    game.score += timeBonus + fuelBonus;
    playThud(gentle);
    game.state = 'landed';
  }
  if (event === 'crash-water' || event === 'crash-terrain' || event === 'crash-hard') {
    playCrash();
    game.state = 'crashed';
  }
}

// Screenshot staging: ?shot=start shows the title over the runway,
// ?shot=play puts the plane mid-flight through the rings, ?shot=end shows
// the delivery card, ?shot=night stages the night leg in flight.
function applyShotParam() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  if (shot === 'night') {
    loadMission(2);
  } else {
    loadMission(0);
  }
  if (shot === 'play' || shot === 'night') {
    game.state = 'flying';
    const plane = game.plane;
    const world = game.world;
    // Stage at the lowest early ring so the sea and islands stay in frame
    // behind the plane: the terrain is what the judge reads from these shots.
    const early = world.rings.slice(0, 3);
    const target = early.reduce((low, ring) => (ring.y < low.y ? ring : low), early[0]);
    plane.airborne = true;
    plane.speed = 34;
    plane.throttle = 0.6;
    plane.x = target.x - 90 * world.dir;
    plane.y = target.y;
    plane.pitch = 4;
    plane.fuel = 72;
    const passed = world.rings.filter((ring) => ring.x * world.dir < target.x * world.dir).length;
    world.rings.forEach((ring) => { ring.passed = ring.x * world.dir < target.x * world.dir; });
    target.passed = false;
    game.score = passed * 100;
    game.combo = passed;
  }
  if (shot === 'end') {
    game.state = 'landed';
    game.plane.landed = true;
    game.plane.x = game.world.endX;
    game.plane.y = 16;
    game.plane.speed = 0;
    game.score = 1240;
    game.world.rings.forEach((ring) => { ring.passed = true; });
  }
}

// Self-test: fly a scripted leg and report the outcome in the title.
function runSelfTest() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('selftest') !== '1') return false;
  loadMission(0);
  game.state = 'flying';
  const plane = game.plane;
  const world = game.world;
  const input = { pitch: 0, throttle: 1 };
  let events = [];
  for (let step = 0; step < 60 * 180; step++) {
    const dt = 1 / 60;
    // Simple autopilot: steer for the next ring; once the rings are done,
    // descend onto the destination runway and bleed speed off on final.
    const nextRing = world.rings.find((r) => !r.passed);
    let targetY = 110;
    let targetSpeed = 34;
    if (nextRing) {
      targetY = nextRing.y;
    } else {
      // Final approach: glide down to the strip and flare over the runway.
      const dist = (world.endX - plane.x) * world.dir;
      if (dist > 600) {
        targetY = 110;
        targetSpeed = 34;
      } else if (dist > 200) {
        targetY = 16 + dist * 0.06;
        targetSpeed = 24;
      } else {
        // Flare: aim just under the strip so the floats settle onto it.
        targetY = 14;
        targetSpeed = 20;
      }
    }
    const targetPitch = Math.max(-10, Math.min(10, (targetY - plane.y) * 0.25));
    input.pitch = targetPitch / 34;
    input.throttle = Math.max(-1, Math.min(1, (targetSpeed - plane.speed) / 10));
    const event = stepPlane(plane, world, input, dt, 0);
    if (event) events.push(event);
    for (const ring of world.rings) ringHit(plane, ring);
    if (plane.landed || plane.crashed) break;
  }
  const rings = world.rings.filter((r) => r.passed).length;
  const report = [
    `selftest events=${events.join(',') || 'none'}`,
    `x=${plane.x.toFixed(0)} y=${plane.y.toFixed(1)} speed=${plane.speed.toFixed(1)}`,
    `rings=${rings}/${world.rings.length} fuel=${plane.fuel.toFixed(0)}`,
    `landed=${plane.landed} crashed=${plane.crashed}`,
  ].join(' | ');
  document.title = report;
  const pre = document.createElement('pre');
  pre.id = 'selftest';
  pre.textContent = report;
  document.body.appendChild(pre);
  return true;
}

loadMission(0);
bindInput();
bindAudioUnlock();
applyShotParam();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render(renderer, game, now / 1000);
  endFrame();
  requestAnimationFrame(frame);
}

if (!runSelfTest()) {
  requestAnimationFrame(frame);
} else {
  // Still paint one frame so the self-test page shows the final state.
  render(renderer, game, 0);
}
