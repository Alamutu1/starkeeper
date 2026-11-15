// Drawing only: the world's state and the current screen in, pixels out. The 1280x880
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. A warm twilight sky (violet to amber), a low moon, drifting parallax clouds,
// twinkling stars, a shimmering aurora, the constellation at top centre, the Keeper Comet
// with its ribbon trail, and the full HUD. Every animated value is driven by
// state.frame, never the wall clock, so a staged scene paints identically every time.

import { CONSTELLATIONS, FIELD, FONT, LIGHTS, PALETTE, TOTAL_WAVES, UI, UPGRADES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const LIFE_R = 13;
const STAR_POINTS = 4;

function starPath(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < STAR_POINTS * 2; i += 1) {
    const a = rot + (i * Math.PI) / STAR_POINTS;
    const rr = i % 2 === 0 ? r : r * 0.32;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function glowCircle(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  let skyGrad = null;
  let skyH = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
    skyGrad = null;
    skyH = 0;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''}${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(value, x, y);
  }

  function drawSky(state) {
    if (!skyGrad || skyH !== FIELD.height) {
      skyGrad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
      skyGrad.addColorStop(0, PALETTE.skyTop);
      skyGrad.addColorStop(0.45, PALETTE.skyMid);
      skyGrad.addColorStop(0.78, PALETTE.skyLow);
      skyGrad.addColorStop(1, PALETTE.ground);
      skyH = FIELD.height;
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Aurora band: three sine ribbons whose phase comes from the frame count.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let band = 0; band < 3; band += 1) {
      const baseY = 150 + band * 46;
      const amp = 26 + band * 10;
      const phase = state.frame * 0.006 + band * 1.7;
      const grad = ctx.createLinearGradient(0, baseY - 40, 0, baseY + 40);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, band === 0 ? 'rgba(125,255,176,0.20)' : band === 1 ? 'rgba(183,156,255,0.16)' : 'rgba(255,214,106,0.12)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= FIELD.width; x += 32) {
        ctx.lineTo(x, baseY + Math.sin(x * 0.004 + phase) * amp);
      }
      for (let x = FIELD.width; x >= 0; x -= 32) {
        ctx.lineTo(x, baseY + 44 + Math.sin(x * 0.004 + phase) * amp);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Background stars, twinkling on the frame count.
    for (const s of state.bgStars) {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(state.frame * 0.02 * s.speed + s.phase));
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The low moon, bottom-right, with a warm halo.
    glowCircle(ctx, 1060, 640, 190, PALETTE.moonGlow, 0.35);
    ctx.fillStyle = PALETTE.moon;
    ctx.beginPath();
    ctx.arc(1060, 640, 74, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(214,164,92,0.5)';
    ctx.beginPath();
    ctx.arc(1022, 610, 9, 0, Math.PI * 2);
    ctx.arc(1098, 664, 13, 0, Math.PI * 2);
    ctx.arc(1054, 596, 6, 0, Math.PI * 2);
    ctx.fill();

    // Parallax clouds, drifting with the frame count, wrapped around the field.
    for (const c of state.clouds) {
      const span = FIELD.width + c.w * 2;
      const x = (((c.x + state.frame * c.speed * c.depth) % span) + span) % span - c.w;
      ctx.globalAlpha = 0.5 + c.depth * 0.3;
      ctx.fillStyle = PALETTE.cloud;
      ctx.beginPath();
      ctx.ellipse(x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
      ctx.ellipse(x + c.w * 0.22, c.y + 8, c.w * 0.32, c.h * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.cloudShade;
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.ellipse(x, c.y + c.h * 0.3, c.w * 0.42, c.h * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Horizon glow and rolling hills.
    glowCircle(ctx, 640, FIELD.groundY, 420, PALETTE.horizonGlow, 0.22);
    ctx.fillStyle = PALETTE.hillFar;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 64) {
      ctx.lineTo(x, FIELD.groundY - 26 - 18 * Math.sin(x * 0.006 + 1.3));
    }
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.hillNear;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.groundY + 18);
    for (let x = 0; x <= FIELD.width; x += 64) {
      ctx.lineTo(x, FIELD.groundY + 8 - 12 * Math.sin(x * 0.009 + 4.1));
    }
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.horizonGlow;
    ctx.fillRect(0, FIELD.groundY - 2, FIELD.width, 3);
  }

  function drawConstellation(state, big) {
    const def = CONSTELLATIONS[state.wave - 1];
    const cx = big ? 640 : 640;
    const cy = big ? 470 : 0;
    const scale = big ? 1.35 : 1;
    const ox = big ? cx - 640 * scale : 0;
    const oy = big ? cy - 108 * scale : 0;
    const px = (x) => ox + x * scale;
    const py = (y) => oy + y * scale;
    ctx.save();
    ctx.lineWidth = big ? 3 : 2;
    ctx.strokeStyle = 'rgba(255,246,216,0.4)';
    ctx.beginPath();
    for (let i = 0; i < def.slots.length; i += 1) {
      const [sx, sy] = def.slots[i];
      if (i === 0) ctx.moveTo(px(sx), py(sy));
      else ctx.lineTo(px(sx), py(sy));
    }
    ctx.stroke();
    for (let i = 0; i < def.slots.length; i += 1) {
      const [sx, sy] = def.slots[i];
      const filled = big ? i < 3 : i < state.slotsFilled;
      const x = px(sx);
      const y = py(sy);
      if (filled) {
        const pulse = 1 + 0.12 * Math.sin(state.frame * 0.08 + i);
        glowCircle(ctx, x, y, 34 * scale * pulse, PALETTE.star, 0.55);
        ctx.fillStyle = PALETTE.starCore;
        starPath(ctx, x, y, 13 * scale * pulse, state.frame * 0.01 + i);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,246,216,0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 10 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,246,216,0.5)';
        ctx.beginPath();
        ctx.arc(x, y, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawStars(state) {
    for (const s of state.stars) {
      if (!s.active) continue;
      // Trail: a fading line from where it was a moment ago.
      ctx.strokeStyle = 'rgba(255,214,106,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.px, s.py);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      const tw = 1 + 0.18 * Math.sin(state.frame * 0.12 + s.phase);
      glowCircle(ctx, s.x, s.y, s.r * 3.4, PALETTE.star, 0.5);
      ctx.fillStyle = PALETTE.starCore;
      starPath(ctx, s.x, s.y, s.r * tw, state.frame * 0.02 + s.phase);
      ctx.fill();
    }
  }

  function drawWisps(state) {
    for (const w of state.wisps) {
      if (!w.active) continue;
      const wob = Math.sin(state.frame * 0.06 + w.phase) * 4;
      const r = w.r;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = w.storm ? PALETTE.wispDark : PALETTE.wisp;
      ctx.beginPath();
      ctx.arc(w.x + wob, w.y, r, 0, Math.PI * 2);
      ctx.arc(w.x - r * 0.55, w.y + r * 0.3, r * 0.62, 0, Math.PI * 2);
      ctx.arc(w.x + r * 0.55, w.y + r * 0.28, r * 0.62, 0, Math.PI * 2);
      ctx.arc(w.x, w.y - r * 0.5, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#c4b5fd';
      ctx.beginPath();
      ctx.arc(w.x + wob * 0.5, w.y - r * 0.2, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Two glowing eyes, always looking up toward the constellation.
      const blink = Math.sin(state.frame * 0.05 + w.phase) > -0.92 ? 1 : 0.15;
      ctx.fillStyle = w.storm ? '#ff9d9d' : '#fff6d8';
      ctx.beginPath();
      ctx.ellipse(w.x - r * 0.32, w.y - r * 0.12, 3.4, 4.6 * blink, 0, 0, Math.PI * 2);
      ctx.ellipse(w.x + r * 0.32, w.y - r * 0.12, 3.4, 4.6 * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      if (w.storm) {
        ctx.strokeStyle = 'rgba(255,107,107,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w.x - r * 0.5, w.y + r * 0.55);
        ctx.lineTo(w.x - r * 0.15, w.y + r * 0.85);
        ctx.lineTo(w.x + r * 0.15, w.y + r * 0.5);
        ctx.lineTo(w.x + r * 0.5, w.y + r * 0.8);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawComet(state) {
    const p = state.player;
    // Ribbon trail: tapering golden ribbon through the stored points.
    const trail = p.trail;
    for (let i = trail.length - 1; i >= 1; i -= 1) {
      const a = trail[i];
      const b = trail[i - 1];
      const f = 1 - i / trail.length;
      ctx.strokeStyle = `rgba(255,207,77,${(0.55 * f).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, 16 * f);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    const dashing = p.dashT > 0;
    glowCircle(ctx, p.x, p.y, p.radius * (dashing ? 3.4 : 2.6), PALETTE.comet, dashing ? 0.75 : 0.5);
    // Catch radius hint: a faint ring, so the player can feel the net.
    ctx.strokeStyle = 'rgba(255,246,216,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.comet;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.cometCore;
    ctx.beginPath();
    ctx.arc(p.x - p.radius * 0.12, p.y - p.radius * 0.12, p.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    // Combo badge floating beside the comet.
    if (state.combo >= 2 && state.comboTimer > 0) {
      const mult = Math.min(4, state.combo);
      text(`x${mult} COMBO`, p.x + p.radius + 14, p.y - p.radius - 6, 26, PALETTE.gold, 'left', 'bold ');
      text(`${state.combo} in a row`, p.x + p.radius + 14, p.y - p.radius + 22, 16, PALETTE.muted, 'left');
    }
    if (state.chain >= 2 && state.chainTimer > 0) {
      text(`CHAIN x${state.chain}`, p.x - p.radius - 14, p.y + p.radius + 26, 22, '#c4b5fd', 'right', 'bold ');
    }
  }

  function drawHud(state, best, screen) {
    ctx.textBaseline = 'top';
    // Top-left: wave, constellation name, slot progress.
    const def = CONSTELLATIONS[state.wave - 1];
    text(`WAVE ${state.wave} / ${TOTAL_WAVES}`, 24, 18, 24, PALETTE.text, 'left', 'bold ');
    text(def.name, 24, 48, 30, PALETTE.gold, 'left', 'bold ');
    for (let i = 0; i < def.slots.length; i += 1) {
      const x = 34 + i * 26;
      const y = 92;
      if (i < state.slotsFilled) {
        ctx.fillStyle = PALETTE.starCore;
        starPath(ctx, x, y, 9, 0);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,246,216,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Constellation name above the outline, top-centre.
    text(def.name.toUpperCase(), 640, 26, 22, 'rgba(255,246,216,0.85)', 'center', 'bold ');
    // Top-centre lights, under the constellation.
    for (let i = 0; i < LIGHTS; i += 1) {
      const x = 640 + (i - 1) * 44;
      const y = 196;
      if (i < state.lights) {
        glowCircle(ctx, x, y, LIFE_R * 2.2, PALETTE.horizonGlow, 0.5);
        ctx.fillStyle = PALETTE.horizonGlow;
        ctx.beginPath();
        ctx.arc(x, y, LIFE_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff6d8';
        ctx.beginPath();
        ctx.arc(x, y - 3, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,246,216,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, LIFE_R, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Top-right: score, best, shards.
    text(`SCORE ${state.score}`, 1256, 18, 26, PALETTE.text, 'right', 'bold ');
    text(`BEST ${best}`, 1256, 50, 18, PALETTE.muted, 'right');
    text(`◆ ${state.shards} shards`, 1256, 76, 22, PALETTE.gold, 'right', 'bold ');
    // Completed-constellation gallery: small gold stars under the score.
    for (let i = 0; i < state.gallery.length; i += 1) {
      ctx.fillStyle = PALETTE.gold;
      starPath(ctx, 1256 - i * 26, 116, 9, 0);
      ctx.fill();
    }
    // Wind hint from wave 3.
    if (state.wave >= 3) {
      const dir = state.wind >= 0 ? '→' : '←';
      text(`WIND ${dir} ${Math.abs(Math.round(state.wind))}`, 24, 122, 18, 'rgba(255,246,216,0.75)', 'left');
    }
    // Dash cooldown bar, with its label to the left (clear of the horizon line).
    const bar = UI.dashBar;
    const frac = state.player.dashCd <= 0 ? 1 : 1 - state.player.dashCd / 2.5;
    ctx.fillStyle = 'rgba(20,10,36,0.75)';
    ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
    ctx.fillStyle = frac >= 1 ? PALETTE.gold : '#b79cff';
    ctx.fillRect(bar.x, bar.y, bar.w * frac, bar.h);
    text(frac >= 1 ? 'DASH READY — click or Space' : 'DASH …', bar.x - 12, bar.y - 2, 15, PALETTE.muted, 'right');
    // Upgrade buttons.
    const ids = ['net', 'wings', 'shield'];
    for (let i = 0; i < UI.buttons.length; i += 1) {
      const b = UI.buttons[i];
      const id = ids[i];
      const defUp = UPGRADES[id];
      const owned = state.upgrades[id];
      const afford = !owned && state.shards >= defUp.cost;
      ctx.fillStyle = owned ? 'rgba(125,255,176,0.28)' : afford ? 'rgba(255,214,106,0.30)' : 'rgba(20,10,36,0.72)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = owned ? PALETTE.ok : afford ? PALETTE.gold : PALETTE.panelEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      const label = owned ? `✓ ${defUp.name}` : `[${defUp.key}] ${defUp.name} — ${defUp.cost}◆`;
      text(label, b.x + b.w / 2, b.y + 11, 16, owned ? PALETTE.ok : afford ? PALETTE.text : PALETTE.muted, 'center', 'bold ');
    }
    // Centre banners (shower, wave complete). The shower banner stays up for the whole
    // shower; no banner draws over the game-over / victory panel.
    if (screen !== SCREEN_OVER) {
      const showerBanner = state.shower.active ? 'METEOR SHOWER — DOUBLE POINTS' : '';
      const text_ = showerBanner || state.banner.text;
      const alpha = showerBanner ? 0.85 + 0.15 * Math.sin(state.frame * 0.1) : Math.min(1, state.banner.t);
      if (text_ && (showerBanner || state.banner.t > 0)) {
        ctx.globalAlpha = alpha;
        const bw = 720;
        const bx = (FIELD.width - bw) / 2;
        ctx.fillStyle = 'rgba(20,10,36,0.72)';
        ctx.fillRect(bx, 330, bw, 64);
        ctx.strokeStyle = PALETTE.gold;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, 330, bw, 64);
        text(text_, FIELD.width / 2, 348, 30, PALETTE.gold, 'center', 'bold ');
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawPanel(title, lines, prompt, accent, titleSize) {
    const width = 680;
    const lineH = 34;
    const height = 170 + lines.length * lineH + 70;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    ctx.fillStyle = 'rgba(20,10,36,0.82)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    ctx.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 84, titleSize || 52, accent || PALETTE.text, 'center', 'bold ');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 138 + i * lineH, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 36, 24, PALETTE.gold, 'center');
  }

  /** Paint one frame: the sky, the field, then the HUD or a panel for the screen. */
  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1d0f2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(state);
    if (screen === SCREEN_TITLE) {
      drawConstellation(state, true);
      drawParticles(state);
      // Title panel over the preview constellation.
      ctx.fillStyle = 'rgba(20,10,36,0.45)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.textBaseline = 'alphabetic';
      const pulse = 1 + 0.03 * Math.sin(state.frame * 0.05);
      ctx.save();
      ctx.translate(640, 250);
      ctx.scale(pulse, pulse);
      text('STARKEEPER', 0, 0, 96, PALETTE.text, 'center', 'bold ');
      ctx.restore();
      text('Catch the falling stars. Keep the constellations lit.', 640, 300, 28, PALETTE.gold, 'center');
      text('Mouse or arrows steer the comet · Click or Space dashes · Burst the void wisps', 640, 340, 20, PALETTE.muted, 'center');
      text('A falling star that touches the ground costs a light — you have three.', 640, 372, 20, PALETTE.muted, 'center');
      text('Click or press Space to begin', 640, 560, 30, PALETTE.gold, 'center', 'bold ');
      if (best > 0) text(`BEST ${best}`, 640, 606, 22, PALETTE.muted, 'center');
      text('8 constellations · meteor showers · upgrades with shards', 640, 660, 18, PALETTE.muted, 'center');
      return;
    }
    drawConstellation(state, false);
    drawParticles(state);
    if (screen !== SCREEN_OVER) {
      drawStars(state);
      drawWisps(state);
      drawComet(state);
    }
    drawHud(state, best, screen);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(20,10,36,0.55)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      drawPanel('Paused', ['The stars will wait for you.', 'M mutes · R restarts'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(20,10,36,0.6)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      if (state.victory) {
        const lines = [
          `Score ${state.score} · Best ${best}`,
          `${state.gallery.length} of 8 constellations lit: ${state.gallery.join(', ')}`,
          `Lights left: ${state.lights}`,
        ];
        drawPanel('THE SKY IS YOURS, STARKEEPER', lines, 'Press R to play again', PALETTE.gold, 40);
        // Victory stars above the panel.
        for (let i = 0; i < 3; i += 1) {
          const x = 640 + (i - 1) * 90;
          const y = 190;
          const lit = i < state.starsEarned;
          const pulse = lit ? 1 + 0.1 * Math.sin(state.frame * 0.08 + i) : 1;
          if (lit) glowCircle(ctx, x, y, 60 * pulse, PALETTE.star, 0.6);
          ctx.fillStyle = lit ? PALETTE.starCore : 'rgba(255,246,216,0.25)';
          starPath(ctx, x, y, 34 * pulse, 0);
          ctx.fill();
        }
      } else {
        const lines = [
          `Score ${state.score} · Best ${best}`,
          `${state.gallery.length} of 8 constellations lit: ${state.gallery.join(', ') || 'none yet'}`,
          `You reached wave ${state.wave} — the ${CONSTELLATIONS[state.wave - 1].name}`,
        ];
        drawPanel('The sky went dark', lines, 'Press R to try again');
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
