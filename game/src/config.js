// STARKEEPER — every tuning number and colour in one place. The playfield is a fixed
// 1280x880 logical area; the renderer scales it to the window, so no rule below depends on
// the screen size.

export const FIELD = { width: 1280, height: 880, groundY: 800 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const LIGHTS = 3;
export const TOTAL_WAVES = 8;

export const COMET = {
  radius: 40,
  speed: 700,
  dashSpeed: 2.3,
  dashTime: 0.35,
  dashCooldown: 2.5,
  /** Mouse-seek smoothing: the comet covers this fraction of the gap per step at full speed. */
  seekRange: 70,
};

export const STAR = {
  radius: 13,
  speed: 168,
  speedPerWave: 17,
  speedJitter: 45,
  interval: 1.0,
  intervalScale: 0.94,
  minInterval: 0.55,
  points: 10,
  drift: 26,
};

export const WISP = {
  radius: 26,
  speed: 52,
  speedPerWave: 9,
  speedJitter: 18,
  interval: 4.2,
  intervalScale: 0.88,
  minInterval: 1.9,
  points: 25,
  /** How close a wisp must get to the constellation's heart before it snuffs a slot. */
  snuffRange: 46,
  stormSpeed: 118,
  stormRadius: 36,
};

export const SHOWER = { waves: [3, 6], duration: 10, spawnScale: 0.6, pointsScale: 2 };

export const COMBO_WINDOW = 2;
export const CHAIN_WINDOW = 1;

export const UPGRADES = {
  net: { key: '1', name: 'Bigger Net', desc: '+40% catch radius', cost: 15 },
  wings: { key: '2', name: 'Swift Wings', desc: '+25% comet speed', cost: 15 },
  shield: { key: '3', name: 'Star Shield', desc: 'Blocks 1 ground-hit / wave', cost: 20 },
};

/** Upgrade buttons and the dash bar, in field coordinates (shared by render and input). */
export const UI = {
  buttons: [
    { id: 'net', x: 320, y: 828, w: 200, h: 38 },
    { id: 'wings', x: 540, y: 828, w: 200, h: 38 },
    { id: 'shield', x: 760, y: 828, w: 200, h: 38 },
  ],
  dashBar: { x: 440, y: 812, w: 400, h: 8 },
};

/** The eight constellations, one per wave. Slots are field coordinates, joined in order. */
export const CONSTELLATIONS = [
  { name: 'Crown', slots: [[520, 92], [580, 62], [640, 82], [700, 62], [760, 92]] },
  { name: 'Fox', slots: [[500, 140], [560, 84], [620, 118], [680, 76], [740, 122], [790, 88]] },
  { name: 'Ship', slots: [[480, 120], [540, 148], [600, 128], [640, 78], [690, 128], [750, 148], [800, 116]] },
  { name: 'Harp', slots: [[520, 150], [560, 96], [610, 66], [668, 84], [716, 122], [762, 150]] },
  { name: 'Wolf', slots: [[470, 96], [530, 140], [590, 104], [640, 66], [700, 100], [760, 138], [806, 96]] },
  { name: 'Swan', slots: [[486, 150], [540, 110], [590, 138], [640, 82], [686, 62], [730, 96], [776, 132], [812, 152]] },
  { name: 'Key', slots: [[540, 72], [600, 100], [660, 76], [712, 104], [756, 138], [792, 158]] },
  { name: 'Phoenix', slots: [[478, 120], [540, 76], [596, 118], [640, 64], [688, 118], [744, 76], [790, 120], [700, 152]] },
];

/** How many falling things and particles can exist at once; pools are allocated once, at boot. */
export const POOL_SIZE = { stars: 48, wisps: 24, particles: 256 };

export const PALETTE = {
  skyTop: '#3b2a6e',
  skyMid: '#7a4a8f',
  skyLow: '#e08a4e',
  horizonGlow: '#ffc46b',
  moon: '#ffe9b8',
  moonGlow: '#ffdf9e',
  cloud: '#f7c9d8',
  cloudShade: '#8a5a9e',
  hillFar: '#4a2d63',
  hillNear: '#2c1740',
  ground: '#1d0f2e',
  star: '#ffd76a',
  starCore: '#fff6d8',
  wisp: '#8b5cf6',
  wispDark: '#4c1d95',
  comet: '#ffcf4d',
  cometCore: '#fff3c4',
  panel: '#241239',
  panelEdge: '#6d4a9e',
  text: '#fff6e0',
  muted: '#d9b8e8',
  gold: '#ffd76a',
  danger: '#ff6b6b',
  ok: '#7dffb0',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'starkeeper.best';
