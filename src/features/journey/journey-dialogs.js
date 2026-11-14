// @ts-check
/**
 * The journey's pop-ups: a stop's tasks on arrival, the end of the walk,
 * ending it early, and a simulated space weather alert. The walk waits while
 * any of them is open (journey-mode.js).
 * They appear only in the map view, as a modal <dialog>: the visor view never
 * asks for input (journey-mode.js shows read-only notices there instead).
 *
 * Built for gloved hands and dusty screens (journey-confirm.js):
 * - Submitting a stop's tasks takes two presses: "Submit tasks", then a
 *   check on the other side of the screen.
 * - Ending the walk takes three: two taps on opposite sides, then a hold.
 * Escape always means the safe choice: back to the tasks, or keep walking.
 */
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';
import { armLater, askInSteps, DIALOG_TITLE_ID } from './journey-confirm.js';
import { formatDuration } from '../../lib/mars.js';

/** @typedef {import('../plan/plan-model.js').Stop} Stop */
/** @typedef {import('./journey-model.js').Arrival} Arrival */
/** @typedef {import('../conditions/space-weather-drill.js').Drill} Drill */

/** @type {import('./journey-confirm.js').ConfirmStep[]} */
const END_STEPS = [
  { title: 'End the walk?', text: 'The walk is paused.', confirmLabel: 'End journey', confirmIcon: 'close', cancelLabel: 'Keep walking', confirmSide: 'right' },
  { title: 'Are you sure?', text: 'Your place on the walk will be lost.', confirmLabel: 'Yes, end it', confirmIcon: 'close', cancelLabel: 'Keep walking', confirmSide: 'left' },
  { title: 'Hold to end', text: 'Press and hold for 2 seconds.', confirmLabel: 'Hold to end', confirmIcon: 'flag', cancelLabel: 'Keep walking', confirmSide: 'right', isHold: true },
];

/** Create the dialog (not yet on the page) and the ways to fill it. */
export function createJourneyDialogs() {
  const dialog = /** @type {HTMLDialogElement} */ (el('dialog', { className: 'journey-dialog', attrs: { 'aria-labelledby': DIALOG_TITLE_ID } }));
  const isOpen = () => dialog.open;
  /** What Escape does for what is shown now. */
  let onEscape = () => {};
  /** Whether the dialog must stay open (a stop's tasks wait for an answer). */
  let mustStayOpen = false;
  /** Clears the timers of what is shown now. */
  let stopTimers = () => {};

  dialog.addEventListener('cancel', (event) => { event.preventDefault(); onEscape(); });
  // Some browsers close a dialog on a second Escape whatever the page says. Tasks not
  // answered are shown again, rather than lost.
  dialog.addEventListener('close', () => { if (mustStayOpen) dialog.showModal(); });

  /**
   * @param {() => void} escape
   * @param {boolean} isRequired
   */
  const open = (escape, isRequired) => {
    stopTimers();
    onEscape = escape;
    mustStayOpen = isRequired;
    if (!dialog.open) dialog.showModal();
  };
  const close = () => {
    stopTimers();
    mustStayOpen = false;
    onEscape = () => {};
    if (dialog.open) dialog.close();
  };
  /** @type {number[]} */
  let timers = [];
  const keep = (/** @type {number} */ timer) => { timers.push(timer); };
  const own = () => {
    timers = [];
    stopTimers = () => { for (const timer of timers) window.clearTimeout(timer); timers = []; };
  };

  return {
    element: dialog,
    isOpen,
    close,
    /**
     * Three checks before the walk ends.
     * @param {() => void} onEnd
     * @param {() => void} onKeepWalking
     */
    askToEnd(onEnd, onKeepWalking) {
      const keepWalking = () => { close(); onKeepWalking(); };
      open(keepWalking, false);
      stopTimers = askInSteps(dialog, END_STEPS, { onConfirmed: () => { close(); onEnd(); }, onCancelled: keepWalking });
    },
    /**
     * A stop's tasks, then a check before walking on.
     * @param {Arrival} arrival
     * @param {Stop | undefined} stop
     * @param {number} stopCount Stops in the walk, the start included.
     * @param {() => void} onSubmitted Called once the walker has confirmed.
     */
    showArrival(arrival, stop, stopCount, onSubmitted) {
      const isFinish = arrival.isFinish || !stop;
      const tasks = stop && !arrival.isFinish ? stop.tasksOurs : [];
      const boxes = tasks.map((task, index) => {
        const id = `journey-task-${arrival.visitNumber}-${index}`;
        const box = /** @type {HTMLInputElement} */ (el('input', { attrs: { type: 'checkbox', id } }));
        return { task, box, row: el('li', { className: 'check-row' }, [box, el('label', { text: task, attrs: { for: id } })]) };
      });
      const list = el('ul', { className: 'journey-tasks' }, boxes.map((item) => item.row));

      const showTasks = () => {
        own();
        onEscape = () => {};
        const submit = /** @type {HTMLButtonElement} */ (el('button', { className: 'button-primary button-large journey-confirm', attrs: { type: 'button' } }, [
          icon(isFinish ? 'flag' : 'check_circle'), isFinish ? 'Finish walk' : 'Submit tasks',
        ]));
        // Not pressable at once: a double tap on the last pop-up's button must not skip this one.
        armLater(submit, keep);
        submit.addEventListener('click', confirmSubmit);
        const body = isFinish
          ? [el('p', { className: 'journey-dialog-text', text: 'Walk complete. Stow the samples and check in with the habitat.' })]
          : [
            el('p', { className: 'task-why' }, [el('strong', { text: 'Why: ' }), stop?.found ?? '']),
            list,
            el('p', { className: 'basis', text: 'Tasks are our suggestions, not NASA\'s.' }),
          ];
        dialog.replaceChildren(
          el('p', { className: 'eyebrow', text: isFinish ? 'Back at the start' : `Stop ${arrival.visitNumber} of ${stopCount} · about ${formatDuration(stop?.workMinutesOurs ?? 0)}` }),
          el('h2', { className: 'journey-dialog-title', text: isFinish ? 'Walk complete' : arrival.name, attrs: { id: DIALOG_TITLE_ID } }),
          ...body,
          el('div', { className: 'journey-choice' }, [submit]),
        );
        list.querySelector('input')?.focus();
        if (isFinish) submit.focus();
      };

      const confirmSubmit = () => {
        stopTimers();
        const done = boxes.filter((item) => item.box.checked).length;
        const text = isFinish ? 'The journey will close.' : `${done} of ${boxes.length} tasks ticked.${done < boxes.length ? ' Unticked tasks stay undone.' : ''}`;
        onEscape = showTasks;
        stopTimers = askInSteps(dialog, [{
          title: isFinish ? 'End the journey?' : `Leave ${arrival.name}?`,
          text,
          confirmLabel: isFinish ? 'End journey' : 'Submit and walk on',
          confirmIcon: isFinish ? 'flag' : 'directions_walk',
          cancelLabel: 'Back to tasks',
          confirmSide: 'left',
        }], { onConfirmed: () => { close(); onSubmitted(); }, onCancelled: showTasks });
      };

      open(() => {}, true);
      showTasks();
    },
    /**
     * A simulated space weather alert, acknowledged with one (delayed) press.
     * @param {Drill} drill
     * @param {boolean} isWalkPaused Whether the walk was paused for it.
     * @param {() => void} onAcknowledged
     */
    showDrill(drill, isWalkPaused, onAcknowledged) {
      own();
      const acknowledge = () => { close(); onAcknowledged(); };
      open(acknowledge, false);
      const button = /** @type {HTMLButtonElement} */ (el('button', { className: 'button-primary button-large journey-confirm', text: 'Understood', attrs: { type: 'button' } }));
      button.addEventListener('click', acknowledge);
      armLater(button, keep);
      dialog.replaceChildren(
        el('p', { className: 'eyebrow journey-drill-eyebrow', text: 'Simulated alert · a drill, not real data' }),
        el('h2', { className: 'journey-dialog-title', text: drill.title, attrs: { id: DIALOG_TITLE_ID } }),
        el('p', { className: `journey-dialog-level is-${drill.level}` }, [icon('warning'), drill.level === 'no-go' ? 'No-go: take shelter' : 'Caution']),
        el('p', { className: 'journey-dialog-text', text: drill.text }),
        el('p', { className: 'basis', text: `Lasts ${formatDuration(drill.durationMinutes)} of simulated time (random).${isWalkPaused ? ' The walk is paused.' : ''}` }),
        el('div', { className: 'journey-choice' }, [button]),
      );
      button.focus();
    },
  };
}
