# Sky Courier

![competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)
![rank](https://make.fun/badge/best-flight-game-20261126-0057/mietrea519-cyber/best-flight-game-20261126-0057/rank.svg)
![reward](https://make.fun/badge/best-flight-game-20261126-0057/mietrea519-cyber/best-flight-game-20261126-0057/reward.svg)

A bush-plane delivery game for [Make the best flight game](https://make.fun/c/best-flight-game-20261126-0057) on make.fun.

## The game

You fly a seaplane courier between island airstrips. Three legs, three skies:

1. **Dawn Run** — first light over the lagoon. Rings to the far strip.
2. **Storm Crossing** — a squall rolls in. Gusts, rings, and less fuel.
3. **Night Mail** — last mail of the day under the moon. Rings and runway lights.

Fly the glowing rings, watch your fuel, and put her down gentle on the strip — a hard touchdown wrecks the floats. Click over the marked drop zone to drop cargo for bonus points.

## How to fly

- **↑ / ↓** (or W / S) — pitch up / down
- **← / →** (or A / D) — throttle back / forward
- **Click** — drop cargo over the drop zone
- **Enter** — take off / next mission
- **P** — pause, **M** — mute, **R** — refly the leg

The HUD shows altitude, airspeed, heading, vertical speed, fuel and score, with a lit attitude indicator. All sound is synthesised live with the Web Audio API — no audio files.

## Play it

Open `game/index.html` in a desktop browser, or run `node serve.ts` and open http://localhost:8080. No build step, no network requests: every file the game loads lives under `game/`.

## Layout

- `game/` — the game: `index.html`, `style.css`, `src/` (config, audio, input, terrain, plane physics, rendering, missions, main loop)
- `screenshots/` — real renders of the game's own code (cover first)
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
