// STARKEEPER's rules and state, with no drawing and no browser in it: the Keeper Comet, the
// falling stars, the void wisps, the eight constellations, shards, upgrades, lights, the
// meteor showers and the wind. step() advances one fixed step and returns what happened as
// bit flags, so the caller can react without the world knowing about screens or sound.
// Nothing here allocates after createWorld returns, and nothing reads the wall clock or
// Math.random — every number comes from the seeded generator, so the same seed and the
// same inputs always give the same game.

import {
  CHAIN_WINDOW,
  COMBO_WINDOW,
  COMET,
  CONSTELLATIONS,
  FIELD,
  LIGHTS,
  POOL_SIZE,
  SHOWER,
  STAR,
  TOTAL_WAVES,
  UPGRADES,
  WISP,
} from './config.js';

export const EVENT_CATCH = 1;
export const EVENT_GROUND = 2;
export const EVENT_WISP = 4;
export const EVENT_WAVE = 8;
export const EVENT_OVER = 16;
export const EVENT_WIN = 32;
export const EVENT_SHOWER = 64;
export const EVENT_BUY = 128;
export const EVENT_SNUFF = 256;

const CONSTELLATION_HEART = { x: 640, y: 108 };

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2,
    y: FIELD.height * 0.62,
    vx: 0,
    vy: 0,
    dashT: 0,
    dashCd: 0,
    radius: COMET.radius,
    speed: COMET.speed,
    trail: [],
  };
  for (let i = 0; i < 18; i += 1) player.trail.push({ x: player.x, y: player.y });

  const stars = [];
  for (let i = 0; i < POOL_SIZE.stars; i += 1) {
    stars.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: STAR.radius, phase: 0, px: 0, py: 0 });
  }
  const wisps = [];
  for (let i = 0; i < POOL_SIZE.wisps; i += 1) {
    wisps.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: WISP.radius, storm: false, phase: 0 });
  }
  const particles = [];
  for (let i = 0; i < POOL_SIZE.particles; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 3, color: '#ffd76a' });
  }

  // Fixed twilight decor, drawn from the same seed: background stars and drifting clouds.
  const bgStars = [];
  for (let i = 0; i < 90; i += 1) {
    bgStars.push({
      x: random() * FIELD.width,
      y: random() * 560,
      r: 0.8 + random() * 1.8,
      phase: random() * Math.PI * 2,
      speed: 0.4 + random() * 1.4,
    });
  }
  const clouds = [];
  for (let i = 0; i < 7; i += 1) {
    clouds.push({
      x: random() * FIELD.width,
      y: 60 + random() * 420,
      w: 180 + random() * 260,
      h: 26 + random() * 26,
      speed: 6 + random() * 14,
      depth: 0.35 + random() * 0.65,
    });
  }

  const state = {
    player,
    stars,
    wisps,
    particles,
    bgStars,
    clouds,
    score: 0,
    shards: 0,
    lights: LIGHTS,
    wave: 1,
    waveElapsed: 0,
    elapsed: 0,
    frame: 0,
    slotsFilled: 0,
    combo: 0,
    comboTimer: 0,
    chain: 0,
    chainTimer: 0,
    shower: { active: false, t: 0 },
    banner: { text: '', t: 0 },
    wind: 0,
    windPhase: 0,
    upgrades: { net: false, wings: false, shield: false },
    shieldUsed: false,
    gallery: [],
    victory: false,
    over: false,
    starsEarned: 0,
    starTimer: STAR.interval,
    wispTimer: WISP.interval,
  };

  function constellation() {
    return CONSTELLATIONS[state.wave - 1];
  }

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height * 0.62;
    player.vx = 0;
    player.vy = 0;
    player.dashT = 0;
    player.dashCd = 0;
    player.radius = COMET.radius;
    player.speed = COMET.speed;
    for (const p of player.trail) {
      p.x = player.x;
      p.y = player.y;
    }
    for (const s of stars) s.active = false;
    for (const w of wisps) w.active = false;
    for (const p of particles) p.active = false;
    state.score = 0;
    state.shards = 0;
    state.lights = LIGHTS;
    state.wave = 1;
    state.waveElapsed = 0;
    state.elapsed = 0;
    state.frame = 0;
    state.slotsFilled = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.chain = 0;
    state.chainTimer = 0;
    state.shower.active = false;
    state.shower.t = 0;
    state.banner.text = '';
    state.banner.t = 0;
    state.wind = 0;
    state.windPhase = 0;
    state.upgrades.net = false;
    state.upgrades.wings = false;
    state.upgrades.shield = false;
    state.shieldUsed = false;
    state.gallery.length = 0;
    state.victory = false;
    state.over = false;
    state.starsEarned = 0;
    state.starTimer = 0.6;
    state.wispTimer = 2.2;
    beginWave();
  }

  function freeStar() {
    for (let i = 0; i < stars.length; i += 1) if (!stars[i].active) return stars[i];
    return null;
  }

  function freeWisp() {
    for (let i = 0; i < wisps.length; i += 1) if (!wisps[i].active) return wisps[i];
    return null;
  }

  function freeParticle() {
    for (let i = 0; i < particles.length; i += 1) if (!particles[i].active) return particles[i];
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const p = freeParticle();
      if (p === null) return;
      const a = random() * Math.PI * 2;
      const v = speed * (0.3 + random() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v - 30;
      p.max = 0.5 + random() * 0.5;
      p.life = p.max;
      p.size = 2 + random() * 4;
      p.color = color;
    }
  }

  function starInterval() {
    let iv = Math.max(STAR.minInterval, STAR.interval * STAR.intervalScale ** (state.wave - 1));
    if (state.shower.active) iv *= SHOWER.spawnScale;
    return iv;
  }

  function wispInterval() {
    return Math.max(WISP.minInterval, WISP.interval * WISP.intervalScale ** (state.wave - 1));
  }

  function spawnStar() {
    const s = freeStar();
    if (s === null) return;
    s.active = true;
    s.x = 40 + random() * (FIELD.width - 80);
    s.y = -20;
    s.px = s.x;
    s.py = s.y;
    s.vx = (random() - 0.5) * STAR.drift;
    s.vy = STAR.speed + STAR.speedPerWave * (state.wave - 1) + random() * STAR.speedJitter;
    s.r = STAR.radius * (0.85 + random() * 0.3);
    s.phase = random() * Math.PI * 2;
  }

  function spawnWisp() {
    const w = freeWisp();
    if (w === null) return;
    const storm = state.wave >= 5 && random() < 0.35;
    w.active = true;
    w.storm = storm;
    w.x = 60 + random() * (FIELD.width - 120);
    w.y = FIELD.height + 30;
    w.vx = 0;
    w.vy = storm
      ? WISP.stormSpeed + random() * 20
      : WISP.speed + WISP.speedPerWave * (state.wave - 1) + random() * WISP.speedJitter;
    w.r = storm ? WISP.stormRadius : WISP.radius * (0.85 + random() * 0.3);
    w.phase = random() * Math.PI * 2;
  }

  function beginWave() {
    state.slotsFilled = 0;
    state.waveElapsed = 0;
    state.shieldUsed = false;
    state.starTimer = 0.5;
    state.wispTimer = 1.6 + random() * 1.2;
    if (SHOWER.waves.indexOf(state.wave) !== -1) {
      state.shower.active = true;
      state.shower.t = 0;
      state.banner.text = 'METEOR SHOWER — DOUBLE POINTS';
      state.banner.t = 3;
      state.starTimer = 0.15;
    } else {
      state.shower.active = false;
      state.shower.t = 0;
    }
  }

  function completeWave() {
    const bonus = 100 * state.lights;
    state.score += bonus;
    state.gallery.push(constellation().name);
    burst(640, 108, '#ffd76a', 40, 260);
    burst(640, 108, '#fff6d8', 24, 180);
    if (state.wave >= TOTAL_WAVES) {
      state.victory = true;
      state.over = true;
      state.starsEarned = state.lights === 3 ? 3 : state.lights === 2 ? 2 : 1;
      state.banner.text = 'THE SKY IS YOURS, STARKEEPER';
      state.banner.t = 4;
      return EVENT_WAVE | EVENT_WIN;
    }
    state.wave += 1;
    state.banner.text = `${constellation().name} LIT — WAVE ${state.wave}`;
    state.banner.t = 2.5;
    beginWave();
    return EVENT_WAVE;
  }

  function buyUpgrade(id) {
    const def = UPGRADES[id];
    if (!def || state.upgrades[id] || state.shards < def.cost) return 0;
    state.shards -= def.cost;
    state.upgrades[id] = true;
    if (id === 'net') player.radius = COMET.radius * 1.4;
    if (id === 'wings') player.speed = COMET.speed * 1.25;
    burst(player.x, player.y, '#7dffb0', 24, 200);
    return EVENT_BUY;
  }

  /**
   * One fixed step. `input` is { tx, ty, kx, ky, dash, buy } — tx/ty is the mouse target in
   * field coordinates (null when the mouse is not steering), kx/ky is the keyboard direction,
   * dash requests a dash, buy is an upgrade id or ''. With `harmless` set (the title screen's
   * backdrop) things fall and wisps drift but nothing scores, nothing is lost and no wave
   * completes.
   */
  function step(dt, input, harmless) {
    let events = 0;
    if (state.over) return events;
    state.elapsed += dt;
    state.waveElapsed += dt;
    state.frame += 1;

    if (state.banner.t > 0) state.banner.t -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.chainTimer > 0) {
      state.chainTimer -= dt;
      if (state.chainTimer <= 0) state.chain = 0;
    }

    // Wind gusts from wave 3 on: a slow sine that pushes the comet sideways.
    if (state.wave >= 3) {
      state.windPhase += dt;
      state.wind = Math.sin(state.windPhase * 0.9) * 46;
    } else {
      state.wind = 0;
    }

    if (state.shower.active) {
      state.shower.t += dt;
      if (state.shower.t >= SHOWER.duration) state.shower.active = false;
    }

    // --- comet movement: keyboard velocity plus a mouse seek with smooth lag ---
    let vx = (input.kx || 0) * player.speed;
    let vy = (input.ky || 0) * player.speed;
    if (input.tx !== null && input.tx !== undefined && input.ty !== null && input.ty !== undefined) {
      const dx = input.tx - player.x;
      const dy = input.ty - player.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 4) {
        const pull = Math.min(1, d / COMET.seekRange);
        vx += (dx / d) * player.speed * pull;
        vy += (dy / d) * player.speed * pull;
      }
    }
    vx += state.wind;
    const mag = Math.sqrt(vx * vx + vy * vy);
    const maxSpeed = player.speed * (player.dashT > 0 ? COMET.dashSpeed : 1);
    if (mag > maxSpeed) {
      vx = (vx / mag) * maxSpeed;
      vy = (vy / mag) * maxSpeed;
    }
    if (input.dash && player.dashCd <= 0) {
      player.dashT = COMET.dashTime;
      player.dashCd = COMET.dashCooldown;
    }
    if (player.dashT > 0) player.dashT -= dt;
    if (player.dashCd > 0) player.dashCd -= dt;
    player.vx = vx;
    player.vy = vy;
    player.x = Math.min(FIELD.width - 20, Math.max(20, player.x + vx * dt));
    player.y = Math.min(FIELD.groundY - 14, Math.max(190, player.y + vy * dt));
    // Ribbon trail: newest first, each point following the one ahead of it.
    for (let i = player.trail.length - 1; i > 0; i -= 1) {
      player.trail[i].x = player.trail[i - 1].x;
      player.trail[i].y = player.trail[i - 1].y;
    }
    player.trail[0].x = player.x;
    player.trail[0].y = player.y;

    if (input.buy) events |= buyUpgrade(input.buy);

    // --- spawning ---
    state.starTimer -= dt;
    if (state.starTimer <= 0) {
      spawnStar();
      state.starTimer += starInterval();
    }
    state.wispTimer -= dt;
    if (state.wispTimer <= 0) {
      spawnWisp();
      state.wispTimer += wispInterval() * (0.7 + random() * 0.6);
    }

    const catchR = player.radius + STAR.radius + 6;
    const catchR2 = catchR * catchR;

    // --- falling stars ---
    for (let i = 0; i < stars.length; i += 1) {
      const s = stars[i];
      if (!s.active) continue;
      s.px = s.x;
      s.py = s.y;
      s.x += (s.vx + state.wind * 0.35) * dt;
      s.y += s.vy * dt;
      if (s.y >= FIELD.groundY) {
        s.active = false;
        if (!harmless) {
          if (state.upgrades.shield && !state.shieldUsed) {
            state.shieldUsed = true;
            burst(s.x, FIELD.groundY, '#7dffb0', 18, 160);
          } else {
            state.lights -= 1;
            state.combo = 0;
            state.comboTimer = 0;
            burst(s.x, FIELD.groundY, '#ff6b6b', 16, 180);
            events |= EVENT_GROUND;
            if (state.lights <= 0) {
              state.over = true;
              events |= EVENT_OVER;
              return events;
            }
          }
        }
        continue;
      }
      if (harmless) continue;
      if (dist2(s.x, s.y, player.x, player.y) <= catchR2) {
        s.active = false;
        state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
        state.comboTimer = COMBO_WINDOW;
        const mult = Math.min(4, state.combo);
        const pts = STAR.points * mult * (state.shower.active ? SHOWER.pointsScale : 1);
        state.score += pts;
        state.shards += 1;
        state.slotsFilled += 1;
        burst(s.x, s.y, '#ffd76a', 14, 200);
        burst(s.x, s.y, '#fff6d8', 6, 120);
        events |= EVENT_CATCH;
        if (state.slotsFilled >= constellation().slots.length) {
          events |= completeWave();
          if (state.over) return events;
        }
      }
    }

    // --- void wisps: drift up toward the constellation's heart ---
    const burstR = player.radius + WISP.radius + 10;
    const burstR2 = burstR * burstR;
    for (let i = 0; i < wisps.length; i += 1) {
      const w = wisps[i];
      if (!w.active) continue;
      const dx = CONSTELLATION_HEART.x - w.x;
      const dy = CONSTELLATION_HEART.y - w.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      w.vx = (dx / d) * w.vy * 0.45;
      w.x += w.vx * dt;
      w.y -= w.vy * dt;
      if (w.y < -40) {
        w.active = false;
        continue;
      }
      if (!harmless && dist2(w.x, w.y, CONSTELLATION_HEART.x, CONSTELLATION_HEART.y) <= WISP.snuffRange * WISP.snuffRange) {
        w.active = false;
        if (state.slotsFilled > 0) state.slotsFilled -= 1;
        burst(CONSTELLATION_HEART.x, CONSTELLATION_HEART.y, '#8b5cf6', 18, 160);
        events |= EVENT_SNUFF;
        continue;
      }
      if (harmless) continue;
      const rr = w.storm ? burstR + 12 : burstR;
      if (dist2(w.x, w.y, player.x, player.y) <= rr * rr) {
        w.active = false;
        state.chain = state.chainTimer > 0 ? state.chain + 1 : 1;
        state.chainTimer = CHAIN_WINDOW;
        const pts = WISP.points + (state.chain > 1 ? 15 * (state.chain - 1) : 0);
        state.score += pts;
        burst(w.x, w.y, '#b79cff', 22, 240);
        burst(w.x, w.y, '#fff6d8', 8, 140);
        events |= EVENT_WISP;
      }
    }

    // --- particles ---
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
    }

    return events;
  }

  reset();
  return { state, reset, step, constellation };
}
