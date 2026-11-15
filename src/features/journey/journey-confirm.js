// @ts-check
/**
 * Confirmations a stray tap cannot pass, for journey mode: grit on a screen,
 * a thick glove or a stumble can press a button nobody meant to press.
 *
 * - A confirm button cannot be pressed until ARM_MS after it appears, so a
 *   second tap meant for the previous button does nothing.
 * - Each step can put its confirm button on the other side from the last
 *   step's, so tapping the same spot twice never confirms twice.
 * Ending a walk asks for more than a button: a hold and a slide (slide-to-confirm.js).
 * The safe choice ("Keep walking", "Back to tasks") gets the focus.
 */
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';
import { playCue } from '../../lib/sound.js';

/** A confirm button ignores presses for this long after it appears, in milliseconds. */
export const ARM_MS = 800;
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
 * Ask for one or more confirmations in a row, inside the journey dialog.
 * @param {HTMLElement} dialog Where to show them; its contents are replaced.
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
      className: 'button-primary button-large journey-confirm',
      attrs: { type: 'button' },
    }, [icon(step.confirmIcon), step.confirmLabel]));
    const cancel = el('button', { className: 'button-secondary button-large', text: step.cancelLabel, attrs: { type: 'button' } });
    cancel.addEventListener('click', () => { stopTimers(); onCancelled(); });
    const next = () => {
      stopTimers();
      if (index + 1 < steps.length) { playCue('step'); show(index + 1); } else onConfirmed();
    };
    confirm.addEventListener('click', next);
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
