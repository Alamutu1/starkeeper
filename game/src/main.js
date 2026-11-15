// STARKEEPER — boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the renderer paints
// what is there. The game moves between five screens: title, play, paused, game over and
// victory. Sounds fire on the world's event flags; the status line announces screen
// changes for screen readers.
//
// ?seed=N fixes the falling pattern. ?shot=start|play|shower|win (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot.

import { BEST_KEY, LIGHTS, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_BUY,
  EVENT_CATCH,
  EVENT_GROUND,
  EVENT_OVER,
  EVENT_SNUFF,
  EVENT_WAVE,
  EVENT_WIN,
  EVENT_WISP,
} from './world.js';
import {
  ACTION_BUY_NET,
  ACTION_BUY_SHIELD,
  ACTION_BUY_WINGS,
  ACTION_CONFIRM,
  ACTION_DASH,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import {
  isMuted,
  setMuted,
  sfxBuy,
  sfxCatch,
  sfxDash,
  sfxGround,
  sfxSnuff,
  sfxWave,
  sfxWin,
  sfxWisp,
  unlockAudio,
} from './audio.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
window.__starkeeper = world; // for play-testing and debugging

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let dashQueued = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIGHTS} lights. Catch the falling stars.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(
      world.state.victory
        ? `Victory. The sky is yours. Score ${world.state.score}. Best ${best}.`
        : `Game over. Score ${world.state.score}. Best ${best}.`,
    );
  }

  function handleActions() {
    const actions = input.takeActions();
    const buyId = input.takeBuy();
    if (actions & ACTION_DASH) dashQueued = true;
    if (actions & ACTION_MUTE) {
      setMuted(!isMuted());
      announce(isMuted() ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
      unlockAudio();
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      unlockAudio();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    return buyId;
  }

  function step(buyId) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { tx: null, ty: null, kx: 0, ky: 0, dash: false, buy: '' }, true);
      return;
    }
    const dir = input.direction();
    const mouse = input.mouseTarget();
    const dash = dashQueued;
    dashQueued = false;
    if (dash) sfxDash();
    const events = world.step(
      STEP,
      { tx: mouse.x, ty: mouse.y, kx: dir.x, ky: dir.y, dash, buy: buyId || '' },
      false,
    );
    if (events & EVENT_CATCH) sfxCatch(world.state.combo);
    if (events & EVENT_GROUND) {
      sfxGround();
      announce(world.state.lights === 1 ? 'A star hit the ground. 1 light left.' : `A star hit the ground. ${world.state.lights} lights left.`);
    }
    if (events & EVENT_WISP) sfxWisp();
    if (events & EVENT_SNUFF) sfxSnuff();
    if (events & EVENT_BUY) sfxBuy();
    if (events & EVENT_WAVE) sfxWave();
    if (events & EVENT_WIN) sfxWin();
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_WAVE) {
      announce(`Wave ${world.state.wave}: the ${world.state.gallery[world.state.gallery.length - 1]} is lit.`);
    }
    if (events & EVENT_WISP && !(events & EVENT_OVER)) {
      // A burst is silent in the status line; the chime carries it.
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const buyId = handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(buyId);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting stars fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Starkeeper. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
