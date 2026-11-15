// @ts-check
/**
 * slide-to-confirm (DESIGN.md): a handle that must be held, then slid along
 * its track, to confirm something that cannot be undone. It ends a walk.
 *
 * Why not a button: dust on a screen, a thick glove or a stumble can press a
 * button, even twice. They do not hold a handle still and then drag it the
 * width of a dialog.
 *
 * - Press the handle and keep still for HOLD_BEFORE_SLIDE_MS: it turns ready.
 * - Slide it to the far end and it confirms. Let go sooner and it springs back.
 * - Keyboard: hold the right arrow key; letting go before the end springs back.
 * - It ignores presses for ARM_MS after it appears (journey-confirm.js), so a
 *   tap meant for the last button does nothing.
 */
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';
import { ARM_MS } from './journey-confirm.js';
import { HOLD_BEFORE_SLIDE_MS, isSlideComplete, KEY_STEP, slideProgress } from './slide-model.js';

/**
 * @param {string} label What sliding does, for example "Hold, then slide to end".
 * @param {() => void} onConfirmed Called once, when the handle reaches the far end.
 * @param {'danger' | 'confirm'} [tone] 'danger' (red) for something that cannot be undone; 'confirm' (blue) for a check.
 * @returns {{ element: HTMLElement, stop: () => void }} The control, and a way to clear its timers when it is removed.
 */
export function createSlideToConfirm(label, onConfirmed, tone = 'danger') {
  const handle = el('span', {
    className: 'slide-handle',
    attrs: { role: 'slider', tabindex: '0', 'aria-label': `${label}. Hold the right arrow key.`, 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' },
  }, [icon('arrow_forward')]);
  const text = el('span', { className: 'slide-label', text: label });
  const track = el('div', { className: `slide-track is-${tone}` }, [el('span', { className: 'slide-fill' }), text, handle]);

  /** Whether presses count yet. */
  let isArmed = false;
  /** Whether the hold is done and the handle may move. */
  let isReady = false;
  let isDone = false;
  let progress = 0;
  /** Pointer position when the handle became free to move. */
  let startX = 0;
  /** Latest pointer position, so the hold can end wherever the finger has settled. */
  let pointerX = 0;
  /** @type {number | null} */
  let holdTimer = null;
  const armTimer = window.setTimeout(() => { isArmed = true; track.classList.add('is-armed'); }, ARM_MS);

  /** How far the handle can travel, in pixels. */
  const travel = () => track.clientWidth - handle.offsetWidth;
  /** @param {number} next From 0 to 1. */
  const setProgress = (next) => {
    progress = next;
    track.style.setProperty('--slide-progress', String(next));
    handle.setAttribute('aria-valuenow', String(Math.round(next * 100)));
    if (isSlideComplete(next) && !isDone) {
      isDone = true;
      track.classList.add('is-done');
      onConfirmed();
    }
  };
  /** Let go: back to the start, unless it already confirmed. */
  const release = () => {
    if (holdTimer !== null) { window.clearTimeout(holdTimer); holdTimer = null; }
    isReady = false;
    track.classList.remove('is-holding', 'is-ready');
    if (!isDone) setProgress(0);
  };

  handle.addEventListener('pointerdown', (event) => {
    if (!isArmed || isDone) return;
    handle.setPointerCapture(event.pointerId);
    pointerX = event.clientX;
    track.classList.add('is-holding');
    holdTimer = window.setTimeout(() => {
      holdTimer = null;
      isReady = true;
      // Measure the slide from where the finger is now: it may have crept during the hold.
      startX = pointerX;
      track.classList.add('is-ready');
    }, HOLD_BEFORE_SLIDE_MS);
  });
  handle.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    if (isReady && !isDone) setProgress(slideProgress(startX, event.clientX, travel()));
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(type, release);
  // A long press on a tablet would otherwise open the browser's menu.
  handle.addEventListener('contextmenu', (event) => event.preventDefault());

  handle.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' || !isArmed || isDone) return;
    event.preventDefault();
    track.classList.add('is-holding', 'is-ready');
    setProgress(Math.min(1, progress + KEY_STEP));
  });
  handle.addEventListener('keyup', (event) => { if (event.key === 'ArrowRight') release(); });
  handle.addEventListener('blur', release);

  return {
    element: track,
    stop() {
      window.clearTimeout(armTimer);
      if (holdTimer !== null) window.clearTimeout(holdTimer);
    },
  };
}
