// Sky Courier — everything the player sees: sky, sea, islands, runways,
// rings, the seaplane itself and the lit instruments. All art is drawn with
// canvas paths in one consistent flat style, so the game needs no image
// files and no network. The camera follows the plane and the HUD is drawn
// last, in screen space.
//
// Coordinates: the world is in metres (x along the flight path, y altitude
// above the sea). The camera holds world metres at the screen's left edge
// (cam.x) and at its vertical centre (cam.y). Screen position is
//   sx = (worldX - cam.x) * SCALE
//   sy = HEIGHT / 2 - (worldY - cam.y) * SCALE

import { VIEW, PALETTES } from './config.js';

const METRES_TO_FEET = 3.28084;
const MS_TO_KNOTS = 1.94384;

// World metres to screen pixels: 1 m = 3 px at the camera's zoom.
const SCALE = 3;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  return { canvas, ctx };
}

function cameraFor(plane, world) {
  const viewWidthMetres = VIEW.width / SCALE;
  const centreOffset = (VIEW.width / 2 - VIEW.lookAhead * world.dir) / SCALE;
  let camX = plane.x - centreOffset;
  camX = Math.max(0, Math.min(world.length - viewWidthMetres, camX));
  // Keep the plane near the vertical middle; never let the sea leave the
  // bottom of the screen entirely.
  const camY = Math.max(10, Math.min(280, plane.y));
  return { x: camX, y: camY };
}

function wx(r, worldX) {
  return (worldX - r.cam.x) * SCALE;
}

function wy(r, worldY) {
  return VIEW.height / 2 - (worldY - r.cam.y) * SCALE;
}

function drawSky(r, palette, night) {
  const { ctx } = r;
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, palette.skyTop);
  grad.addColorStop(0.55, palette.skyMid);
  grad.addColorStop(1, palette.skyLow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  // Sun or moon, low over the horizon.
  const sunX = VIEW.width * 0.78;
  const sunY = 150;
  ctx.save();
  ctx.fillStyle = palette.sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
  if (night) {
    ctx.fillStyle = 'rgba(220, 225, 240, 0.9)';
    ctx.beginPath();
    ctx.arc(sunX - 12, sunY - 8, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.skyTop;
    ctx.beginPath();
    ctx.arc(sunX - 2, sunY - 14, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Stars at night.
  if (night) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137.5) % VIEW.width;
      const sy = (i * 89.3) % 260;
      ctx.globalAlpha = 0.3 + ((i * 7) % 10) / 16;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
}

function drawClouds(r, world, palette, time) {
  const { ctx } = r;
  ctx.fillStyle = palette.cloud;
  for (const cloud of world.clouds) {
    // Clouds drift and sit a little behind the world (parallax).
    const cloudX = ((cloud.x + time * cloud.speed) % world.length);
    const cx = wx(r, cloudX);
    const cy = VIEW.height / 2 - (cloud.y - r.cam.y * 0.5) * SCALE * 0.6 - 60;
    if (cx < -220 || cx > VIEW.width + 220) continue;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 70 * cloud.scale, 20 * cloud.scale, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 45 * cloud.scale, cy + 8, 48 * cloud.scale, 16 * cloud.scale, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 48 * cloud.scale, cy + 10, 42 * cloud.scale, 14 * cloud.scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSeaAndIslands(r, world, palette, night) {
  const { ctx } = r;
  const seaY = wy(r, 0);
  // Sea fills from the waterline down.
  const seaGrad = ctx.createLinearGradient(0, Math.max(0, seaY), 0, VIEW.height);
  seaGrad.addColorStop(0, palette.sea);
  seaGrad.addColorStop(1, palette.seaDeep);
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, Math.max(0, seaY), VIEW.width, VIEW.height - Math.max(0, seaY));

  // Sun glints on the water.
  if (seaY < VIEW.height - 20) {
    ctx.strokeStyle = palette.seaGlint;
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const gx = (i * 211 + 40) % VIEW.width;
      const gy = seaY + 26 + i * 24;
      if (gy > VIEW.height) continue;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 46 - i * 2, gy);
      ctx.stroke();
    }
  }

  // Islands: sand base, grass top, palms and huts, drawn in world space.
  for (const island of world.islands) {
    const cx = wx(r, island.x);
    const baseY = wy(r, 0);
    const half = island.half * SCALE;
    const peak = island.peak * SCALE;
    if (cx + half < -50 || cx - half > VIEW.width + 50) continue;
    ctx.beginPath();
    ctx.moveTo(cx - half, baseY);
    ctx.quadraticCurveTo(cx - half * 0.6, baseY - peak * 0.9, cx, baseY - peak);
    ctx.quadraticCurveTo(cx + half * 0.6, baseY - peak * 0.9, cx + half, baseY);
    ctx.closePath();
    ctx.fillStyle = palette.sand;
    ctx.fill();
    // Grass cap.
    ctx.beginPath();
    ctx.moveTo(cx - half * 0.82, baseY - peak * 0.28);
    ctx.quadraticCurveTo(cx - half * 0.4, baseY - peak * 0.95, cx, baseY - peak);
    ctx.quadraticCurveTo(cx + half * 0.4, baseY - peak * 0.95, cx + half * 0.82, baseY - peak * 0.28);
    ctx.closePath();
    ctx.fillStyle = palette.grass;
    ctx.fill();
    ctx.fillStyle = palette.grassDark;
    ctx.beginPath();
    ctx.ellipse(cx, baseY - peak * 0.55, half * 0.45, peak * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    // Palm trees.
    for (let p = 0; p < island.palms; p++) {
      const px = cx - half * 0.6 + (p / Math.max(1, island.palms - 1)) * half * 1.2;
      const py = baseY - peak * (0.55 + ((p * 37) % 10) / 40);
      drawPalm(ctx, px, py, night);
    }
    // Huts.
    for (let h = 0; h < island.huts; h++) {
      const hx = cx - half * 0.3 + h * half * 0.35;
      const hy = baseY - peak * 0.42;
      ctx.fillStyle = '#8a5a34';
      ctx.fillRect(hx - 12, hy - 12, 24, 12);
      ctx.fillStyle = '#c96f2e';
      ctx.beginPath();
      ctx.moveTo(hx - 15, hy - 12);
      ctx.lineTo(hx, hy - 24);
      ctx.lineTo(hx + 15, hy - 12);
      ctx.closePath();
      ctx.fill();
      if (night) {
        ctx.fillStyle = 'rgba(255, 214, 120, 0.9)';
        ctx.fillRect(hx - 4, hy - 8, 8, 6);
      }
    }
  }
}

function drawPalm(ctx, x, y, night) {
  ctx.strokeStyle = night ? '#1d2f1a' : '#5a3d22';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 4, y - 16, x + 10, y - 26);
  ctx.stroke();
  ctx.strokeStyle = night ? '#24402a' : '#3f7a33';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const a = -0.4 - i * 0.45;
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 26);
    ctx.quadraticCurveTo(x + 10 + Math.cos(a) * 16, y - 26 + Math.sin(a) * 10, x + 10 + Math.cos(a) * 26, y - 26 + Math.sin(a) * 16);
    ctx.stroke();
  }
}

function drawRunways(r, world, night) {
  const { ctx } = r;
  for (const island of world.islands) {
    const runway = world.runwayAt(island.x);
    if (!runway) continue;
    const cx = wx(r, runway.x);
    const half = runway.half * SCALE;
    const top = wy(r, 14);
    if (cx + half < -50 || cx - half > VIEW.width + 50) continue;
    // Strip.
    ctx.fillStyle = '#3a3f46';
    ctx.fillRect(cx - half, top - 6, half * 2, 12);
    // Centre dashes.
    ctx.fillStyle = '#f5f0dc';
    for (let d = -half + 12; d < half - 12; d += 34) {
      ctx.fillRect(cx + d, top - 1.5, 18, 3);
    }
    // Threshold bars.
    ctx.fillRect(cx - half + 4, top - 5, 10, 10);
    ctx.fillRect(cx + half - 14, top - 5, 10, 10);
    // Edge lights, always lit at night and warm in the day.
    for (let d = -half + 10; d <= half - 10; d += 44) {
      ctx.fillStyle = night ? '#ffd76a' : '#ffcf5e';
      ctx.beginPath();
      ctx.arc(cx + d, top - 10, night ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      if (night) {
        ctx.fillStyle = 'rgba(255, 215, 106, 0.3)';
        ctx.beginPath();
        ctx.arc(cx + d, top - 10, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawRings(r, world) {
  const { ctx } = r;
  for (const ring of world.rings) {
    const cx = wx(r, ring.x);
    const cy = wy(r, ring.y);
    if (cx < -100 || cx > VIEW.width + 100) continue;
    const rad = ring.r * SCALE;
    ctx.save();
    ctx.lineWidth = 7;
    ctx.strokeStyle = ring.passed ? 'rgba(120, 220, 140, 0.85)' : 'rgba(255, 176, 66, 0.95)';
    ctx.shadowColor = ring.passed ? 'rgba(120, 220, 140, 0.9)' : 'rgba(255, 176, 66, 0.9)';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, rad - 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // Drop zone marker.
  const dz = world.dropZone;
  const dx = wx(r, dz.x);
  const dy = wy(r, dz.y);
  if (dx > -60 && dx < VIEW.width + 60 && !dz.hit) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dx - 34, dy - 4);
    ctx.lineTo(dx + 34, dy - 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DROP ZONE — click to drop cargo', dx, dy - 14);
    ctx.restore();
  }
}

// The seaplane, drawn in side view facing the mission direction.
function drawPlane(r, plane, world) {
  const { ctx } = r;
  const cx = wx(r, plane.x);
  const cy = wy(r, plane.y);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(world.dir, 1);
  ctx.rotate((-plane.pitch * Math.PI) / 180);
  // Fuselage.
  ctx.fillStyle = '#e8543d';
  ctx.beginPath();
  ctx.moveTo(-34, 2);
  ctx.quadraticCurveTo(-30, -12, -8, -14);
  ctx.lineTo(26, -12);
  ctx.quadraticCurveTo(40, -8, 40, -2);
  ctx.quadraticCurveTo(38, 6, 24, 8);
  ctx.lineTo(-20, 8);
  ctx.quadraticCurveTo(-32, 6, -34, 2);
  ctx.closePath();
  ctx.fill();
  // Cream stripe.
  ctx.fillStyle = '#f7ead0';
  ctx.fillRect(-26, -6, 52, 5);
  // Cabin windows, lit.
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(8, -9, 4.5, 0, Math.PI * 2);
  ctx.arc(20, -9, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a2d1d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(8, -9, 4.5, 0, Math.PI * 2);
  ctx.arc(20, -9, 4.5, 0, Math.PI * 2);
  ctx.stroke();
  // Wing.
  ctx.fillStyle = '#c7432c';
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.lineTo(10, -34);
  ctx.lineTo(18, -34);
  ctx.lineTo(8, -10);
  ctx.closePath();
  ctx.fill();
  // Tail.
  ctx.fillStyle = '#c7432c';
  ctx.beginPath();
  ctx.moveTo(-30, -10);
  ctx.lineTo(-40, -26);
  ctx.lineTo(-33, -26);
  ctx.lineTo(-22, -10);
  ctx.closePath();
  ctx.fill();
  // Floats.
  ctx.fillStyle = '#2f5d7c';
  ctx.fillRect(-24, 10, 52, 6);
  ctx.fillRect(-24, 10, 6, 10);
  ctx.fillRect(22, 10, 6, 10);
  // Propeller.
  ctx.save();
  ctx.translate(42, -2);
  ctx.rotate(plane.propAngle);
  ctx.strokeStyle = 'rgba(40, 40, 40, 0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(0, 14);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.arc(42, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHud(r, game) {
  const { ctx } = r;
  const plane = game.plane;
  const altFt = Math.max(0, Math.round(plane.y * METRES_TO_FEET));
  const speedKt = Math.round(plane.speed * MS_TO_KNOTS);
  const heading = game.world.dir > 0 ? '090' : '270';
  const compass = game.world.dir > 0 ? 'E' : 'W';

  // Top instrument bar.
  ctx.save();
  ctx.fillStyle = 'rgba(8, 16, 30, 0.72)';
  roundRect(ctx, 16, 14, VIEW.width - 32, 64, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 215, 106, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const items = [
    { label: 'ALT', value: `${altFt} ft`, x: 40 },
    { label: 'SPD', value: `${speedKt} kt`, x: 220 },
    { label: 'HDG', value: `${heading}° ${compass}`, x: 400 },
    { label: 'V/S', value: `${plane.vy >= 0 ? '+' : ''}${(plane.vy * METRES_TO_FEET).toFixed(0)} fpm`, x: 580 },
    { label: 'FUEL', value: `${Math.round(plane.fuel)}%`, x: 760 },
    { label: 'SCORE', value: `${game.score}`, x: 940 },
  ];
  for (const item of items) {
    ctx.fillStyle = '#9fb4c8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(item.label, item.x, 32);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(item.value, item.x, 56);
  }
  // Fuel bar.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  roundRect(ctx, 760, 66, 110, 6, 3);
  ctx.fill();
  ctx.fillStyle = plane.fuel > 25 ? '#7ddc8a' : '#ff6b5e';
  roundRect(ctx, 760, 66, 110 * Math.max(0, plane.fuel / 100), 6, 3);
  ctx.fill();

  // Mission + rings, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(game.mission.name, VIEW.width - 40, 32);
  ctx.fillStyle = '#cfe0ee';
  ctx.font = '13px system-ui, sans-serif';
  const passed = game.world.rings.filter((ring) => ring.passed).length;
  ctx.fillText(`Rings ${passed}/${game.world.rings.length}`, VIEW.width - 40, 54);

  // Attitude indicator, bottom left: a lit dial with a moving horizon.
  const ax = 78;
  const ay = VIEW.height - 78;
  const ar = 52;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#274b73';
  ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate((-plane.pitch * Math.PI) / 180);
  ctx.translate(0, plane.pitch * 0.9);
  ctx.fillStyle = '#7fa8c9';
  ctx.fillRect(-ar, -ar, ar * 2, ar);
  ctx.fillStyle = '#5d6b3a';
  ctx.fillRect(-ar, 0, ar * 2, ar);
  ctx.fillStyle = '#f5f0dc';
  ctx.fillRect(-ar, -1.5, ar * 2, 3);
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker.
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax - 26, ay);
  ctx.lineTo(ax - 8, ay);
  ctx.moveTo(ax + 8, ay);
  ctx.lineTo(ax + 26, ay);
  ctx.stroke();
  ctx.fillStyle = '#9fb4c8';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', ax, ay + ar + 14);

  // Stall warning.
  if (plane.airborne && plane.speed < 17 && !plane.crashed && !plane.landed) {
    ctx.fillStyle = '#ff6b5e';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STALL — NOSE DOWN, ADD POWER', VIEW.width / 2, 130);
  }
  // Low fuel warning.
  if (plane.fuel < 20 && plane.fuel > 0 && !plane.crashed && !plane.landed) {
    ctx.fillStyle = '#ffcf5e';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOW FUEL', VIEW.width / 2, 160);
  }
  ctx.restore();
}

function drawTitle(r, game) {
  const { ctx } = r;
  ctx.save();
  ctx.fillStyle = 'rgba(6, 12, 26, 0.45)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 72px Georgia, serif';
  ctx.fillText('SKY COURIER', VIEW.width / 2, 210);
  ctx.fillStyle = '#f5f0dc';
  ctx.font = '22px Georgia, serif';
  ctx.fillText('A bush-plane delivery run across the islands', VIEW.width / 2, 256);
  ctx.fillStyle = '#cfe0ee';
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Fly the rings, mind your fuel, and put her down gentle on the strip.', VIEW.width / 2, 300);
  // Mission card.
  ctx.fillStyle = 'rgba(8, 16, 30, 0.78)';
  roundRect(ctx, VIEW.width / 2 - 300, 340, 600, 150, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 215, 106, 0.6)';
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`MISSION ${game.missionIndex + 1} OF 3 — ${game.mission.name}`, VIEW.width / 2, 378);
  ctx.fillStyle = '#e8eef4';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(game.mission.brief, VIEW.width / 2, 410);
  ctx.fillStyle = '#9fb4c8';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(`${game.world.rings.length} rings  •  Fuel ${game.mission.fuel}%  •  ${game.mission.wind ? 'Gusty wind' : 'Calm air'}`, VIEW.width / 2, 442);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('ENTER — take off      P — pause      M — mute', VIEW.width / 2, 530);
  ctx.fillStyle = '#9fb4c8';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('↑ / ↓ pitch    ← / → throttle    Click — drop cargo over the drop zone', VIEW.width / 2, 560);
  ctx.restore();
}

function drawEndCard(r, game, title, lines) {
  const { ctx } = r;
  ctx.save();
  ctx.fillStyle = 'rgba(6, 12, 26, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = 'rgba(8, 16, 30, 0.85)';
  roundRect(ctx, VIEW.width / 2 - 320, 180, 640, 300, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 215, 106, 0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText(title, VIEW.width / 2, 250);
  ctx.fillStyle = '#e8eef4';
  ctx.font = '18px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW.width / 2, 300 + i * 32);
  });
  ctx.fillStyle = '#9fb4c8';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('ENTER — next mission      R — fly it again', VIEW.width / 2, 440);
  ctx.restore();
}

export function render(r, game, time) {
  const { ctx } = r;
  const palette = PALETTES[game.mission.palette];
  const night = game.mission.palette === 'night';
  r.cam = cameraFor(game.plane, game.world);
  drawSky(r, palette, night);
  drawClouds(r, game.world, palette, time);
  drawSeaAndIslands(r, game.world, palette, night);
  drawRunways(r, game.world, night);
  drawRings(r, game.world);
  drawPlane(r, game.plane, game.world);
  drawHud(r, game);

  if (game.state === 'title') drawTitle(r, game);
  if (game.state === 'paused') {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 12, 26, 0.5)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2);
    ctx.restore();
  }
  if (game.state === 'landed') {
    drawEndCard(r, game, 'DELIVERED!', [
      `${game.mission.name} complete — ${game.score} points`,
      `Rings ${game.world.rings.filter((ring) => ring.passed).length}/${game.world.rings.length}   •   Fuel left ${Math.round(game.plane.fuel)}%`,
      game.plane.fuel > 40 ? 'A textbook landing. The mail is on time.' : 'Down safe, tanks nearly dry — that was close.',
    ]);
  }
  if (game.state === 'crashed') {
    drawEndCard(r, game, 'DOWN IN THE DRINK', [
      game.plane.crashReason || 'The courier is down.',
      `Score ${game.score} — the rings you made still count.`,
      'The islands will wait. Try the leg again.',
    ]);
  }
}
