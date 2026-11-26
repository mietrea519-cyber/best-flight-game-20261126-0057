// Sky Courier — the seaplane's flight model. An arcade model with just
// enough physics to reward throttle and turn discipline: speed comes from the
// throttle, lift comes from speed, a slow wing stalls, and fuel is a real
// budget. The plane flies east or west depending on the mission's direction.

import { PLANE, WORLD } from './config.js';

export function createPlane(world, fuel) {
  const startRunway = world.runwayAt(world.startX);
  return {
    x: world.startX,
    // Parked on the runway: 14 m of island plus the floats.
    y: 14 + 2,
    speed: 0,
    pitch: 0,
    throttle: 0,
    fuel,
    airborne: false,
    crashed: false,
    landed: false,
    crashReason: '',
    vy: 0,
    // Propeller angle for the render loop.
    propAngle: 0,
    // Seconds since the wheels left the ground.
    airTime: 0,
  };
}

// One physics step, dt in seconds. Returns an event string when something
// notable happens: 'takeoff', 'landed', 'crash-water', 'crash-terrain',
// 'crash-hard', 'stall' (only on the frame it begins).
export function stepPlane(plane, world, input, dt, wind) {
  if (plane.crashed || plane.landed) return '';

  // Throttle answers the stick, then bleeds toward the lever.
  plane.throttle = Math.max(0, Math.min(1, plane.throttle + input.throttle * PLANE.throttleResponse * dt));
  if (plane.fuel <= 0) plane.throttle = 0;

  // Pitch follows the stick, easing back toward level on its own.
  const targetPitch = input.pitch * PLANE.pitchMax;
  plane.pitch += (targetPitch - plane.pitch) * Math.min(1, 3.2 * dt);
  plane.pitch = Math.max(PLANE.pitchMin, Math.min(PLANE.pitchMax, plane.pitch));
  plane.propAngle += (6 + plane.throttle * 40) * dt;

  // Speed: thrust minus drag, plus a little help from a dive.
  const drag = PLANE.dragFactor * plane.speed * plane.speed;
  const thrust = plane.throttle * 14;
  const diveHelp = -Math.sin((plane.pitch * Math.PI) / 180) * 3.2;
  plane.speed = Math.max(0, plane.speed + (thrust - drag + diveHelp) * dt);
  if (plane.speed > PLANE.maxSpeed) plane.speed = PLANE.maxSpeed;

  // Lift: enough speed and the wing flies; too slow and she sinks.
  const lift = PLANE.liftFactor * plane.speed * plane.speed;
  const climbRate = Math.sin((plane.pitch * Math.PI) / 180) * plane.speed;
  const sinking = plane.speed < PLANE.stallSpeed ? (PLANE.stallSpeed - plane.speed) * 0.55 : 0;
  const targetVy = climbRate * Math.min(1, lift / (PLANE.gravity * 0.9)) - sinking;
  plane.vy += (targetVy - plane.vy) * Math.min(1, 2.4 * dt);

  const wasAirborne = plane.airborne;
  plane.x += world.dir * Math.cos((plane.pitch * Math.PI) / 180) * plane.speed * dt + wind * dt;
  plane.y += plane.vy * dt;
  if (plane.airborne) plane.airTime += dt;

  // Fuel burns with the throttle.
  plane.fuel = Math.max(0, plane.fuel - plane.throttle * PLANE.fuelBurn * dt);

  // Keep the plane inside the world.
  if (plane.x < 40) plane.x = 40;
  if (plane.x > world.length - 40) plane.x = world.length - 40;
  if (plane.y > 320) {
    plane.y = 320;
    plane.vy = Math.min(0, plane.vy);
  }

  const ground = world.flatGroundHeight(plane.x);
  const runway = world.runwayAt(plane.x);

  // Still on the ground: roll along the strip until the wing really flies.
  // The plane only counts as airborne once it is clearly above the surface,
  // so a parked plane never reads as having taken off and landed.
  if (!plane.airborne) {
    if (plane.y > ground + 5) {
      plane.airborne = true;
      return 'takeoff';
    }
    if (plane.y <= ground + 2) {
      plane.y = ground + 2;
      plane.vy = 0;
    }
    return '';
  }

  if (plane.y <= ground + 2) {
    plane.y = ground + 2;
    // Touching down: water or rough ground is always a crash.
    if (!runway) {
      plane.crashed = true;
      plane.crashReason = ground <= 1 ? 'Ditched in the sea.' : 'Clipped the hillside.';
      return ground <= 1 ? 'crash-water' : 'crash-terrain';
    }
    const sink = -plane.vy;
    if (sink > PLANE.hardTouchdown || Math.abs(plane.pitch) > 18) {
      plane.crashed = true;
      plane.crashReason = 'Landed too hard — the floats gave way.';
      return 'crash-hard';
    }
    plane.landed = true;
    plane.vy = 0;
    return 'landed';
  }
  return '';
}

// The plane is inside a ring when it crosses the ring's x with its altitude
// inside the ring's opening.
export function ringHit(plane, ring) {
  if (ring.passed) return false;
  const dx = Math.abs(plane.x - ring.x);
  const dy = Math.abs(plane.y - ring.y);
  if (dx < 6 && dy < WORLD.ringScoreRadius) {
    ring.passed = true;
    return true;
  }
  return false;
}
