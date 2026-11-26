// Sky Courier — procedural sound. No audio files are shipped: every sound is
// synthesised with the Web Audio API, so the game loads nothing over the
// network and stays silent until the player first interacts with the page.

let ctx = null;
let engineNodes = null;
let muted = false;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') void c.resume();
}

// A soft two-tone chime for scoring a ring.
export function playChime() {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const now = c.currentTime;
  [660, 990].forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.16, now + i * 0.09 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.5);
    osc.connect(gain).connect(c.destination);
    osc.start(now + i * 0.09);
    osc.stop(now + i * 0.09 + 0.55);
  });
}

// A low thud for a touchdown, softer when the landing is gentle.
export function playThud(gentle) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(gentle ? 140 : 90, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
  gain.gain.setValueAtTime(gentle ? 0.22 : 0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

// A short noise burst for a crash.
export function playCrash() {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const now = c.currentTime;
  const len = c.sampleRate * 0.4;
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(now);
}

// The engine drone: two detuned sawtooth oscillators through a low-pass
// filter, whose pitch and loudness follow the throttle.
export function startEngine() {
  const c = ensureContext();
  if (!c || engineNodes) return;
  const oscA = c.createOscillator();
  const oscB = c.createOscillator();
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  oscA.type = 'sawtooth';
  oscB.type = 'sawtooth';
  oscA.frequency.value = 62;
  oscB.frequency.value = 93;
  filter.type = 'lowpass';
  filter.frequency.value = 420;
  gain.gain.value = 0.0;
  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(gain).connect(c.destination);
  oscA.start();
  oscB.start();
  engineNodes = { oscA, oscB, filter, gain };
}

export function setEngine(throttle, speedNorm) {
  if (!engineNodes || !ctx) return;
  const now = ctx.currentTime;
  const base = 55 + throttle * 55 + speedNorm * 18;
  engineNodes.oscA.frequency.setTargetAtTime(base, now, 0.08);
  engineNodes.oscB.frequency.setTargetAtTime(base * 1.5, now, 0.08);
  engineNodes.gain.gain.setTargetAtTime(muted ? 0 : 0.02 + throttle * 0.05, now, 0.1);
  engineNodes.filter.frequency.setTargetAtTime(320 + throttle * 500, now, 0.1);
}

export function toggleMute() {
  muted = !muted;
  if (engineNodes && ctx) {
    engineNodes.gain.gain.setTargetAtTime(muted ? 0 : 0.05, ctx.currentTime, 0.05);
  }
  return muted;
}

export function bindAudioUnlock() {
  window.addEventListener('keydown', unlockAudio, { once: true });
  window.addEventListener('pointerdown', unlockAudio, { once: true });
}
