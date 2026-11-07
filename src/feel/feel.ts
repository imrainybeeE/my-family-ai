// Sound and touch for the app's moments. Every sound is synthesised with Web Audio, so there are no
// files to load: soft, felt-and-wood sounds, quiet enough to sit under a conversation. Haptics use
// the Vibration API where it exists (Android) and the system switch haptic on iOS Safari.

export type Feel = 'tap' | 'select' | 'stitch' | 'bead' | 'bloom' | 'flip' | 'land' | 'send' | 'arrive' | 'page' | 'error';

const SOUND_KEY = 'mfa:sound';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

export function soundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // Without storage the choice lasts for this visit only.
  }
  muted = !on;
}

let muted = !soundOn();

/** The audio context starts on the first tap, as browsers require a gesture. */
function audio(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** One soft tone: a pitch that can glide, with a quick attack and an exponential fade. */
function tone(c: AudioContext, { freq, to, at = 0, dur = 0.12, gain = 0.12, type = 'sine' as OscillatorType }: { freq: number; to?: number; at?: number; dur?: number; gain?: number; type?: OscillatorType }) {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** A breath of filtered noise: thread pulled through felt, paper sliding, a whoosh. */
function hiss(c: AudioContext, { at = 0, dur = 0.08, freq = 2400, to, q = 1.2, gain = 0.1 }: { at?: number; dur?: number; freq?: number; to?: number; q?: number; gain?: number }) {
  if (!noise) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noise;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t);
  if (to) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(master!);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const SOUNDS: Record<Feel, (c: AudioContext) => void> = {
  // A felt button pressed down.
  tap: (c) => tone(c, { freq: 420, to: 300, dur: 0.07, gain: 0.08 }),
  // Picking an answer: a small wooden click with a lift.
  select: (c) => {
    tone(c, { freq: 660, to: 880, dur: 0.09, gain: 0.07, type: 'triangle' });
    hiss(c, { dur: 0.03, freq: 5000, gain: 0.03 });
  },
  // A petal sewn on: two short pulls of thread.
  stitch: (c) => {
    hiss(c, { dur: 0.07, freq: 1800, to: 3600, q: 2, gain: 0.08 });
    hiss(c, { at: 0.09, dur: 0.06, freq: 2200, to: 4200, q: 2, gain: 0.06 });
  },
  // A bead sliding down the yarn at the end of a section.
  bead: (c) => {
    tone(c, { freq: 1046, dur: 0.16, gain: 0.07, type: 'triangle' });
    tone(c, { freq: 1568, at: 0.06, dur: 0.2, gain: 0.05 });
  },
  // The flower opens: a soft rising arpeggio with a shimmer.
  bloom: (c) => {
    [523, 659, 784, 1046].forEach((f, i) => tone(c, { freq: f, at: i * 0.09, dur: 0.6, gain: 0.07 }));
    hiss(c, { at: 0.3, dur: 0.5, freq: 6000, to: 9000, q: 0.8, gain: 0.025 });
  },
  // The sewing-button coin tossed.
  flip: (c) => {
    for (let i = 0; i < 5; i++) tone(c, { freq: 900 + i * 120, at: i * 0.06, dur: 0.05, gain: 0.04, type: 'triangle' });
  },
  // It lands.
  land: (c) => {
    tone(c, { freq: 220, to: 160, dur: 0.12, gain: 0.12 });
    tone(c, { freq: 1320, at: 0.02, dur: 0.18, gain: 0.05, type: 'triangle' });
  },
  // A question sent off: paper sliding.
  send: (c) => hiss(c, { dur: 0.18, freq: 900, to: 3200, q: 0.9, gain: 0.07 }),
  // The answer arrives.
  arrive: (c) => {
    tone(c, { freq: 784, dur: 0.18, gain: 0.05 });
    tone(c, { freq: 1175, at: 0.08, dur: 0.24, gain: 0.04 });
  },
  // Turning a page or a ticket.
  page: (c) => hiss(c, { dur: 0.12, freq: 1400, to: 700, q: 1, gain: 0.05 }),
  error: (c) => tone(c, { freq: 300, to: 220, dur: 0.18, gain: 0.07, type: 'triangle' }),
};

const VIBRATION: Partial<Record<Feel, number | number[]>> = {
  tap: 8,
  select: 10,
  stitch: [6, 40, 6],
  bead: 14,
  bloom: [10, 60, 14, 60, 24],
  land: 22,
  error: [18, 50, 18],
};

let iosSwitch: HTMLLabelElement | null = null;

/** iOS Safari has no Vibration API, but toggling a native switch plays the system haptic. */
function iosHaptic() {
  if (typeof document === 'undefined') return;
  if (!iosSwitch) {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

const isIOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent);

/** Plays a moment's sound and haptic. Safe to call anywhere; it does nothing when unavailable. */
export function feel(kind: Feel) {
  try {
    const c = audio();
    if (c) SOUNDS[kind](c);
  } catch {
    // Sound is a nicety; never let it break an action.
  }
  const pattern = VIBRATION[kind];
  // One switch in Settings covers both: "Sounds and haptics".
  if (!pattern || muted) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
    else if (isIOS) iosHaptic();
  } catch {
    // Same as above.
  }
}
