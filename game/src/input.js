// Sky Courier — keyboard and mouse input. The plane flies on the keyboard
// (arrows or WASD), the mouse drops cargo, and the usual keys drive the
// menus. The module only records what is held or was just pressed; the game
// loop asks it each frame.

const keys = new Set();
const pressed = new Set();
let mouseClick = null;

export function bindInput() {
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.key.toLowerCase());
    keys.add(event.key.toLowerCase());
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });
  window.addEventListener('pointerdown', (event) => {
    mouseClick = { x: event.clientX, y: event.clientY, at: performance.now() };
  });
}

export function isHeld(...names) {
  return names.some((name) => keys.has(name));
}

// True once for the frame after the key went down, then cleared by the loop.
export function wasPressed(...names) {
  return names.some((name) => pressed.has(name));
}

export function consumeClick() {
  const click = mouseClick;
  mouseClick = null;
  return click;
}

export function endFrame() {
  pressed.clear();
}

// Pitch input: -1 is nose down, +1 is nose up.
export function pitchInput() {
  let value = 0;
  if (isHeld('arrowup', 'w')) value += 1;
  if (isHeld('arrowdown', 's')) value -= 1;
  return value;
}

// Throttle input: -1 is throttle back, +1 is throttle forward.
export function throttleInput() {
  let value = 0;
  if (isHeld('arrowright', 'd')) value += 1;
  if (isHeld('arrowleft', 'a')) value -= 1;
  return value;
}
