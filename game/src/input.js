// Keyboard, mouse and touch input. Held keys give a steering direction; one-shot presses
// (start, dash, pause, mute, restart, buy) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice. The mouse
// steers the comet by a target point in field coordinates; a click on an upgrade button
// buys it, a click anywhere else dashes (or confirms on a panel screen).

import { FIELD, UI, UPGRADES } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_MUTE = 8;
export const ACTION_RESTART = 16;
export const ACTION_BUY_NET = 32;
export const ACTION_BUY_WINGS = 64;
export const ACTION_BUY_SHIELD = 128;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const RESTART = new Set(['KeyR']);
const BUY = { Digit1: 'net', Digit2: 'wings', Digit3: 'shield', Numpad1: 'net', Numpad2: 'wings', Numpad3: 'shield' };
const BUY_ACTION = { net: ACTION_BUY_NET, wings: ACTION_BUY_WINGS, shield: ACTION_BUY_SHIELD };

export function createInput(canvas) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let mouse = { x: null, y: null, inside: false };
  let actions = 0;
  let buyId = '';

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * FIELD.width,
      y: ((clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  function buttonAt(x, y) {
    for (const b of UI.buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
    }
    return '';
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM | ACTION_DASH;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (BUY[event.code]) {
      if (!event.repeat) {
        buyId = BUY[event.code];
        actions |= BUY_ACTION[buyId];
      }
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    const p = toField(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.inside = true;
  });
  canvas.addEventListener('pointerleave', () => {
    mouse.inside = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = toField(event.clientX, event.clientY);
    const button = buttonAt(p.x, p.y);
    if (button) {
      buyId = button;
      actions |= BUY_ACTION[button];
    } else {
      actions |= ACTION_CONFIRM | ACTION_DASH;
    }
  });

  return {
    /** Keyboard steering: -1, 0 or 1 on each axis. */
    direction() {
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    /** Mouse target in field coordinates, or nulls when the mouse is not steering. */
    mouseTarget() {
      return mouse.inside ? { x: mouse.x, y: mouse.y } : { x: null, y: null };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The upgrade id queued by the last buy press or button click, '' when none. */
    takeBuy() {
      const id = buyId;
      buyId = '';
      return id;
    },
    /** Upgrade definitions, for the HUD hint text. */
    upgrades: UPGRADES,
  };
}
