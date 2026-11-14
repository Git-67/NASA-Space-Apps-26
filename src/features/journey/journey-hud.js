// @ts-check
/**
 * What the walker sees during "Begin journey", over a full-screen map:
 * a large End button (top left), live space weather (top right), the next
 * stop and walk controls (bottom), and a task checklist on arrival.
 * Large targets and high-contrast panels, for gloved hands and dusty visors.
 * Presentation only; the timing lives in journey-mode.js.
 */
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';

/** @typedef {import('../plan/plan-model.js').Stop} Stop */
/** @typedef {import('./journey-model.js').Arrival} Arrival */
/**
 * @typedef {object} WeatherSummary
 * @property {'go' | 'caution' | 'no-go' | 'unknown'} level
 * @property {string} text One line, from the verdict's space weather rule.
 * @property {boolean} isLive Whether it was read live from NASA.
 * @property {string} asOf When the data was read (live) or how recent it is (stored).
 */

const LEVEL_SYMBOL = { go: '✓', caution: '!', 'no-go': '✕', unknown: '?' };
const LEVEL_LABEL = { go: 'Clear', caution: 'Caution', 'no-go': 'Take shelter', unknown: 'Unknown' };

/**
 * Build the overlay (hidden until a journey starts) and add it to the page.
 * @param {{ onEnd: () => void, onTogglePlay: () => void, onSpeed: () => void }} handlers
 */
export function createJourneyHud(handlers) {
  const endButton = el('button', { className: 'journey-button journey-end', attrs: { type: 'button' } }, [icon('close'), 'End journey']);
  endButton.addEventListener('click', handlers.onEnd);
  const weather = el('section', { className: 'journey-weather', attrs: { 'aria-label': 'Space weather', 'aria-live': 'polite' } });
  const playButton = el('button', { className: 'journey-button', attrs: { type: 'button' } });
  playButton.addEventListener('click', handlers.onTogglePlay);
  const speedButton = el('button', { className: 'journey-button', attrs: { type: 'button' } });
  speedButton.addEventListener('click', handlers.onSpeed);
  const next = el('p', { className: 'journey-next', attrs: { 'aria-live': 'polite' } });
  const facing = el('p', { className: 'journey-facing' });
  const dialog = /** @type {HTMLDialogElement} */ (el('dialog', { className: 'journey-dialog', attrs: { 'aria-labelledby': 'journey-dialog-title' } }));

  const root = el('div', { className: 'journey-hud' }, [
    el('div', { className: 'journey-top' }, [endButton, weather]),
    el('div', { className: 'journey-bottom' }, [
      el('p', { className: 'journey-sim', text: 'Simulation · not a real position' }),
      next,
      facing,
      el('div', { className: 'journey-controls' }, [playButton, speedButton]),
    ]),
    dialog,
  ]);
  root.hidden = true;
  document.body.append(root);

  return {
    /** @param {boolean} isShown */
    setShown(isShown) {
      root.hidden = !isShown;
      if (isShown) endButton.focus();
      else if (dialog.open) dialog.close();
    },
    /** @param {boolean} isPlaying @param {number} speed Times faster than real walking. */
    setControls(isPlaying, speed) {
      playButton.replaceChildren(icon(isPlaying ? 'pause' : 'play_arrow'), isPlaying ? 'Pause' : 'Walk');
      speedButton.replaceChildren(icon('fast_forward'), `${speed}× speed`);
      speedButton.setAttribute('aria-label', `Simulation speed ${speed} times real time. Change speed.`);
    },
    /** @param {{ nextName: string | null, metresToGo: number, minutesToGo: number, facingFrom: 'compass' | 'travel' }} status */
    setStatus({ nextName, metresToGo, minutesToGo, facingFrom }) {
      next.textContent = nextName === null ? 'Walk complete.' : `Next: ${nextName} · ${Math.round(metresToGo)} m · ${Math.ceil(minutesToGo)} min`;
      facing.textContent = facingFrom === 'compass' ? 'Facing: from this device\'s compass' : 'Facing: direction of travel';
    },
    /** @param {WeatherSummary} summary */
    setWeather(summary) {
      weather.dataset.level = summary.level;
      weather.replaceChildren(
        el('p', { className: 'badge-live', text: summary.isLive ? 'LIVE · SPACE WEATHER' : 'STORED · SPACE WEATHER' }),
        el('p', { className: 'journey-weather-level' }, [
          el('span', { className: 'reason-symbol', text: LEVEL_SYMBOL[summary.level], attrs: { 'aria-hidden': 'true' } }),
          LEVEL_LABEL[summary.level],
        ]),
        el('p', { className: 'journey-weather-text', text: summary.text }),
        el('p', { className: 'journey-weather-time', text: summary.asOf }),
      );
    },
    /**
     * Show the tasks for a stop just reached, and wait for the walker.
     * @param {Arrival} arrival
     * @param {Stop | undefined} stop
     * @param {number} stopCount Stops in the walk, the start included.
     * @param {() => void} onContinue Called when the walker is ready to go on (or ends the walk at the finish).
     */
    showArrival(arrival, stop, stopCount, onContinue) {
      const title = arrival.isFinish ? 'Back at the start' : `Arrived: ${arrival.name}`;
      const body = arrival.isFinish || !stop
        ? [el('p', { text: 'Walk complete. Stow the samples and check in with the habitat.' })]
        : [
          el('p', { className: 'eyebrow', text: `Stop ${arrival.visitNumber} of ${stopCount} · about ${stop.workMinutesOurs} min` }),
          el('p', { className: 'task-why' }, [el('strong', { text: 'Why: ' }), stop.found]),
          el('ul', { className: 'journey-tasks' }, stop.tasksOurs.map((task, index) => {
            const id = `journey-task-${stop.id}-${index}`;
            return el('li', { className: 'check-row' }, [
              el('input', { attrs: { type: 'checkbox', id } }),
              el('label', { text: task, attrs: { for: id } }),
            ]);
          })),
          el('p', { className: 'basis', text: 'Tasks are our suggestions, not NASA\'s.' }),
        ];
      const goOn = el('button', { className: 'journey-button journey-primary', attrs: { type: 'button' } }, [
        icon(arrival.isFinish ? 'flag' : 'directions_walk'), arrival.isFinish ? 'End journey' : 'Continue walk',
      ]);
      goOn.addEventListener('click', () => { dialog.close(); onContinue(); });
      dialog.replaceChildren(el('h2', { className: 'card-title', text: title, attrs: { id: 'journey-dialog-title' } }), ...body, goOn);
      dialog.showModal();
      goOn.focus();
    },
    /** @returns {boolean} Whether a task pop-up is open. */
    isDialogOpen() {
      return dialog.open;
    },
  };
}
