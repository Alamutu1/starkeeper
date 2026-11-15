// The screenshot scenes behind ?shot=start|play|shower|win. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by an autopilot, so the
// frame is what a short game really looks like and the same seed always gives the same frame.
//
// The strong autopilot is a good player: it chases the star that will hit the ground soonest,
// bursts wisps that are closing on the constellation, dashes to save a star that is about
// to be lost, and buys upgrades as soon as it can afford them. The weak autopilot is a
// hurried player: it only ever chases the lowest star, moves slowly, never dashes and never
// buys — it is used by the headless verification to prove the game can be lost.

import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_LIMIT_SECONDS = 120;
const SHOWER_LIMIT_SECONDS = 150;
const WIN_LIMIT_SECONDS = 900;

function buyChoice(state) {
  if (state.shards >= 15 && !state.upgrades.net) return 'net';
  if (state.shards >= 15 && !state.upgrades.wings) return 'wings';
  if (state.shards >= 20 && !state.upgrades.shield) return 'shield';
  return '';
}

/** The good player: urgent star, threatening wisp, nearest star, in that order. */
export function strongAutopilot(state) {
  const p = state.player;
  const speed = p.speed * 1.5;
  let urgent = null;
  let urgentT = Infinity;
  let nearest = null;
  let nearestT = Infinity;
  for (const s of state.stars) {
    if (!s.active) continue;
    const tGround = (FIELD.groundY - s.y) / s.vy;
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (tGround < nearestT) {
      nearestT = tGround;
      nearest = s;
    }
    // The star that will hit the ground soonest AND can still be reached wins.
    if (d / speed < tGround - 0.05 && tGround < urgentT) {
      urgentT = tGround;
      urgent = s;
    }
  }
  let wisp = null;
  let wispY = Infinity;
  for (const w of state.wisps) {
    if (!w.active) continue;
    if (w.y < 480 && w.y < wispY) {
      wispY = w.y;
      wisp = w;
    }
  }

  let tx = 640;
  let ty = 520;
  let dash = false;
  let target = null;
  if (urgent) target = urgent;
  else if (wisp) target = wisp;
  else if (nearest) target = nearest;
  if (target) {
    const d = Math.hypot(target.x - p.x, target.y - p.y);
    // Lead the target: aim where it will be when the comet gets there.
    const t = d / speed;
    const vy = target.vy !== undefined ? target.vy : 0;
    tx = target.x;
    ty = target.y + (target === wisp ? -vy * t * 0.6 : vy * t * 0.8);
    if (d > 320 && p.dashCd <= 0) dash = true;
  }
  return { tx, ty, kx: 0, ky: 0, dash, buy: buyChoice(state) };
}

/** The patient player: only ever chases the lowest star, at full speed with dash, so the
 * sky fills up while the game still plays by the real rules. Used for the play scene. */
export function patientAutopilot(state) {
  const p = state.player;
  let lowest = null;
  for (const s of state.stars) {
    if (s.active && (lowest === null || s.y > lowest.y)) lowest = s;
  }
  let tx = 640;
  let ty = 520;
  let dash = false;
  if (lowest) {
    const d = Math.hypot(lowest.x - p.x, lowest.y - p.y);
    const t = d / (p.speed * 1.5);
    tx = lowest.x;
    ty = lowest.y + lowest.vy * t * 0.8;
    if (d > 320 && p.dashCd <= 0) dash = true;
  }
  return { tx, ty, kx: 0, ky: 0, dash, buy: buyChoice(state) };
}

/** The hurried player: slow, one star at a time, no dash, no upgrades, no wisps. */
export function weakAutopilot(state, memory) {
  const p = state.player;
  memory.tick += 1;
  if (memory.tick % 30 === 1 || !memory.target || !memory.target.active) {
    let lowest = null;
    for (const s of state.stars) {
      if (s.active && (lowest === null || s.y > lowest.y)) lowest = s;
    }
    memory.target = lowest;
  }
  let tx = 640;
  let ty = 520;
  if (memory.target) {
    const dx = memory.target.x - p.x;
    const dy = memory.target.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    // A short target point keeps the mouse-seek slow: the comet only ever hurries a little.
    tx = p.x + (dx / d) * 28;
    ty = p.y + (dy / d) * 28;
  }
  return { tx, ty, kx: 0, ky: 0, dash: false, buy: '' };
}

/**
 * Set `world` to the named scene (start, play, shower or win; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const showerMem = { tick: 0, target: null };
  if (name !== 'play' && name !== 'shower' && name !== 'win') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { tx: null, ty: null, kx: 0, ky: 0, dash: false, buy: '' }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let i = 0; i < PLAY_LIMIT_SECONDS / STEP; i += 1) {
      const s = world.state;
      // Mid wave 3: the Ship half-lit, the comet mid-action, wisps closing in.
      if (s.wave === 3 && s.slotsFilled >= 3 && s.waveElapsed >= 4) break;
      if (s.wave > 3) break;
      const input = s.wave === 3 ? patientAutopilot(s) : strongAutopilot(s);
      if (world.step(STEP, input, false) & EVENT_OVER) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'shower') {
    // The shower pilot is deliberately slow — it only ever chases the lowest star and
    // never dashes — so the rain piles up on screen while the game still plays by the
    // real rules. Three lights of slack cover the stars it lets hit the ground.
    for (let i = 0; i < SHOWER_LIMIT_SECONDS / STEP; i += 1) {
      const s = world.state;
      const dense = s.stars.filter((star) => star.active).length >= 6;
      if (s.wave === 3 && s.shower.active && s.shower.t >= 3 && dense) break;
      if (s.wave === 3 && s.shower.active && s.shower.t >= 8) break;
      if (s.wave > 3) break;
      // Strong play until the shower starts, then the slow pilot lets the rain pile up.
      const input = s.shower.active ? weakAutopilot(s, showerMem) : strongAutopilot(s);
      input.buy = buyChoice(s);
      if (world.step(STEP, input, false) & EVENT_OVER) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // win: play all eight waves to victory.
  for (let i = 0; i < WIN_LIMIT_SECONDS / STEP; i += 1) {
    if (world.step(STEP, strongAutopilot(world.state), false) & (EVENT_OVER | EVENT_WIN)) break;
  }
  return { screen: SCREEN_OVER, best: world.state.score };
}
