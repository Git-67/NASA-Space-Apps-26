// @ts-check
/**
 * Short sound cues for journey mode, synthesised with the Web Audio API.
 *
 * No sound files: each cue is a few soft notes made on the spot, so sound
 * adds nothing to the download and works offline. Sound is never the only
 * signal: every cue goes with something on screen. The visitor can mute it,
 * and the choice is remembered in this browser.
 *
 * Browsers only allow sound after a tap or click, so call `unlockSound` from
 * one (the "Begin journey" press) before any cue can play.
 */

/**
 * @typedef {'arrival' | 'step' | 'submitted' | 'complete' | 'ended' | 'caution' | 'no-go' | 'clear' | 'hazard'} Cue
 * @typedef {{ hz: number, seconds: number }} Note
 */

/** Notes of each cue, played one after another. Rising for good news, falling for endings, repeated for alerts. */
const CUES = /** @type {Record<Cue, { wave: OscillatorType, notes: Note[] }>} */ ({
  // A stop reached: a soft rising chime.
  arrival: { wave: 'sine', notes: [{ hz: 523.25, seconds: 0.12 }, { hz: 783.99, seconds: 0.22 }] },
  // One of several confirmations passed: a short tick.
  step: { wave: 'sine', notes: [{ hz: 880, seconds: 0.06 }] },
  // A stop's tasks submitted: two quick rising notes.
  submitted: { wave: 'sine', notes: [{ hz: 659.25, seconds: 0.08 }, { hz: 880, seconds: 0.14 }] },
  // Back at the start: a rising major arpeggio.
  complete: {
    wave: 'sine',
    notes: [{ hz: 523.25, seconds: 0.12 }, { hz: 659.25, seconds: 0.12 }, { hz: 783.99, seconds: 0.12 }, { hz: 1046.5, seconds: 0.3 }],
  },
  // The walk ended early: two falling notes.
  ended: { wave: 'sine', notes: [{ hz: 659.25, seconds: 0.12 }, { hz: 440, seconds: 0.24 }] },
  // Caution: two even beeps.
  caution: { wave: 'triangle', notes: [{ hz: 698.46, seconds: 0.14 }, { hz: 0, seconds: 0.08 }, { hz: 698.46, seconds: 0.14 }] },
  // No-go: a falling two-tone, twice.
  'no-go': {
    wave: 'triangle',
    notes: [
      { hz: 880, seconds: 0.16 }, { hz: 587.33, seconds: 0.16 }, { hz: 0, seconds: 0.1 },
      { hz: 880, seconds: 0.16 }, { hz: 587.33, seconds: 0.22 },
    ],
  },
  // A hazard just ahead (steep ground, sand): a low double note.
  hazard: { wave: 'triangle', notes: [{ hz: 440, seconds: 0.1 }, { hz: 0, seconds: 0.05 }, { hz: 440, seconds: 0.16 }] },
  // An alert over: one soft rising note.
  clear: { wave: 'sine', notes: [{ hz: 587.33, seconds: 0.1 }, { hz: 783.99, seconds: 0.18 }] },
});

/** Loudness of every cue, 0 to 1: quiet, so it informs rather than startles. */
const VOLUME = 0.12;
/** Fade in and out of each note, in seconds, so notes do not click. */
const FADE_SECONDS = 0.015;
/** Where the mute choice is remembered in this browser. */
const MUTED_KEY = 'sol-stroll-muted';

/** @type {AudioContext | null} */
let context = null;
let isMutedNow = readMuted();

/** @returns {boolean} Whether the visitor muted sound earlier in this browser. */
function readMuted() {
  try {
    return window.localStorage.getItem(MUTED_KEY) === 'true';
  } catch {
    return false; // storage blocked (private window): sound starts on, the visitor can still mute
  }
}

/** Allow sound. Call from a tap or click. Does nothing where the browser has no Web Audio. */
export function unlockSound() {
  if (!('AudioContext' in window)) return;
  context ??= new AudioContext();
  if (context.state === 'suspended') context.resume();
}

/** @returns {boolean} Whether sound is muted. */
export function isSoundMuted() {
  return isMutedNow;
}

/** @param {boolean} isMuted */
export function setSoundMuted(isMuted) {
  isMutedNow = isMuted;
  try {
    window.localStorage.setItem(MUTED_KEY, String(isMuted));
  } catch {
    // Not remembered (storage blocked); the choice still holds for this visit.
  }
}

/**
 * Play a cue, unless muted or sound was never unlocked.
 * @param {Cue} cue
 */
export function playCue(cue) {
  if (isMutedNow || !context || context.state !== 'running') return;
  const { wave, notes } = CUES[cue];
  let start = context.currentTime;
  for (const note of notes) {
    if (note.hz > 0) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = wave;
      oscillator.frequency.value = note.hz;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(VOLUME, start + FADE_SECONDS);
      gain.gain.linearRampToValueAtTime(0, start + note.seconds);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + note.seconds);
    }
    start += note.seconds;
  }
}
