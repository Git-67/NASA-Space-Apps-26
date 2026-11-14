// @ts-check
/**
 * Confirmations a stray tap cannot pass, for journey mode: grit on a screen,
 * a thick glove or a stumble can press a button nobody meant to press.
 *
 * - A confirm button cannot be pressed until ARM_MS after it appears, so a
 *   second tap meant for the previous button does nothing.
 * - Each step can put its confirm button on the other side from the last
 *   step's, so tapping the same spot twice never confirms twice.
 * - A step can ask for a press and hold of HOLD_MS instead of a tap: a grain
 *   of dust touches the screen for a moment, not two seconds.
 * The safe choice ("Keep walking", "Back to tasks") gets the focus.
 */
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';
import { playCue } from '../../lib/sound.js';

/** A confirm button ignores presses for this long after it appears, in milliseconds. */
export const ARM_MS = 800;
/** A hold-to-confirm button must be held this long, in milliseconds. */
export const HOLD_MS = 2000;
/** Id of the title of whatever the journey dialog shows; the dialog is labelled by it. */
export const DIALOG_TITLE_ID = 'journey-dialog-title';

/**
 * @typedef {object} ConfirmStep
 * @property {string} title
 * @property {string} text
 * @property {string} confirmLabel
 * @property {string} confirmIcon Material Symbols name.
 * @property {string} cancelLabel
 * @property {'left' | 'right'} confirmSide Where the confirm button sits.
 * @property {boolean} [isHold] Confirm by pressing and holding for HOLD_MS, not by a tap.
 */

/**
 * A button that cannot be pressed for ARM_MS.
 * @param {HTMLButtonElement} button
 * @param {(timer: number) => void} keep Called with the timer, so it can be cleared.
 */
export function armLater(button, keep) {
  button.disabled = true;
  keep(window.setTimeout(() => { button.disabled = false; }, ARM_MS));
}

/**
 * Make a button confirm only when pressed and held for HOLD_MS (pointer, or Space / Enter).
 * @param {HTMLButtonElement} button
 * @param {() => void} onHeld
 * @param {(timer: number) => void} keep Called with the timer, so it can be cleared.
 */
function confirmOnHold(button, onHeld, keep) {
  /** @type {number | null} */
  let timer = null;
  button.style.setProperty('--hold-ms', `${HOLD_MS}ms`);
  const start = () => {
    if (button.disabled || timer !== null) return;
    button.classList.add('is-holding');
    timer = window.setTimeout(() => { timer = null; button.classList.remove('is-holding'); onHeld(); }, HOLD_MS);
    keep(timer);
  };
  const stop = () => {
    if (timer === null) return;
    window.clearTimeout(timer);
    timer = null;
    button.classList.remove('is-holding');
  };
  button.addEventListener('pointerdown', start);
  for (const type of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) button.addEventListener(type, stop);
  /** @param {KeyboardEvent} event */
  const isPress = (event) => event.key === ' ' || event.key === 'Enter';
  button.addEventListener('keydown', (event) => {
    if (!isPress(event)) return;
    event.preventDefault();
    if (!event.repeat) start();
  });
  button.addEventListener('keyup', (event) => { if (isPress(event)) stop(); });
  // A long press on a tablet would otherwise open the browser's menu.
  button.addEventListener('contextmenu', (event) => event.preventDefault());
}

/**
 * Ask for one or more confirmations in a row, inside the journey dialog.
 * @param {HTMLDialogElement} dialog Where to show them; its contents are replaced.
 * @param {ConfirmStep[]} steps Asked in order; all must be confirmed.
 * @param {{ onConfirmed: () => void, onCancelled: () => void }} handlers Cancelling at any step stops.
 * @returns {() => void} Stops any pending timers, for when the dialog is closed from elsewhere.
 */
export function askInSteps(dialog, steps, { onConfirmed, onCancelled }) {
  /** @type {number[]} */
  let timers = [];
  const keep = (/** @type {number} */ timer) => { timers.push(timer); };
  const stopTimers = () => {
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
  };

  /** @param {number} index */
  const show = (index) => {
    stopTimers();
    const step = steps[index];
    const confirm = /** @type {HTMLButtonElement} */ (el('button', {
      className: `button-primary button-large journey-confirm${step.isHold ? ' is-hold' : ''}`,
      attrs: { type: 'button' },
    }, [icon(step.confirmIcon), step.confirmLabel]));
    const cancel = el('button', { className: 'button-secondary button-large', text: step.cancelLabel, attrs: { type: 'button' } });
    cancel.addEventListener('click', () => { stopTimers(); onCancelled(); });
    const next = () => {
      stopTimers();
      if (index + 1 < steps.length) { playCue('step'); show(index + 1); } else onConfirmed();
    };
    if (step.isHold) confirmOnHold(confirm, next, keep);
    else confirm.addEventListener('click', next);
    armLater(confirm, keep);
    const buttons = step.confirmSide === 'left' ? [confirm, cancel] : [cancel, confirm];
    dialog.replaceChildren(
      el('p', { className: 'eyebrow', text: steps.length > 1 ? `Check ${index + 1} of ${steps.length}` : 'Check' }),
      el('h2', { className: 'journey-dialog-title', text: step.title, attrs: { id: DIALOG_TITLE_ID } }),
      el('p', { className: 'journey-dialog-text', text: step.text }),
      el('div', { className: 'journey-choice' }, buttons),
    );
    cancel.focus();
  };
  show(0);
  return stopTimers;
}
