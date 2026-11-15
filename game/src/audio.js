// WebAudio synth only, no assets: soft chimes, thuds, whooshes and a sparkle arpeggio,
// all built from oscillators. The context is created lazily on the first user gesture
// (browsers block audio before one) and every call is a no-op while muted or before that.

let context = null;
let muted = false;
let master = null;

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = !!value;
  if (master) master.gain.value = muted ? 0 : 0.5;
}

export function unlockAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    context = new AC();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
  } catch {
    context = null;
  }
}

function tone(freq, dur, type, vol, when, slideTo) {
  if (!context || muted) return;
  const t0 = context.currentTime + (when || 0);
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Catch chime: pitch rises with the combo, so a streak sounds like one. */
export function sfxCatch(combo) {
  const base = 660 * 2 ** (Math.min(combo, 8) / 12);
  tone(base, 0.28, 'sine', 0.32, 0);
  tone(base * 1.5, 0.22, 'sine', 0.16, 0.02);
}

export function sfxGround() {
  tone(120, 0.3, 'triangle', 0.4, 0, 55);
  tone(70, 0.22, 'sine', 0.3, 0, 40);
}

export function sfxDash() {
  tone(320, 0.28, 'sine', 0.22, 0, 980);
}

export function sfxWisp() {
  tone(520, 0.18, 'triangle', 0.22, 0, 180);
  tone(780, 0.14, 'sine', 0.14, 0.05);
}

export function sfxSnuff() {
  tone(220, 0.4, 'sawtooth', 0.14, 0, 90);
}

export function sfxBuy() {
  tone(880, 0.14, 'sine', 0.24, 0);
  tone(1174, 0.2, 'sine', 0.2, 0.08);
}

export function sfxWave() {
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  for (let i = 0; i < notes.length; i += 1) tone(notes[i], 0.5, 'sine', 0.26, i * 0.09);
}

export function sfxWin() {
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1568];
  for (let i = 0; i < notes.length; i += 1) tone(notes[i], 0.55, 'triangle', 0.22, i * 0.12);
}
