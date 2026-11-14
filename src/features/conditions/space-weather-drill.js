// @ts-check
/**
 * "Simulate space weather alert": a practice alert during a simulated walk.
 *
 * SIMULATED, NOT DATA. The alert is drawn at random from the three kinds of
 * event the verdict's space weather rule knows (space-weather-model.js), and
 * judged by that same rule, so the drill says exactly what a real alert of
 * that kind would. The duration is random too, chosen only so the drill ends:
 * it is not a forecast of how long such an event lasts.
 */
import { assessSpaceWeather } from './space-weather-model.js';

/** @typedef {import('./space-weather-model.js').SpaceEvent} SpaceEvent */
/**
 * @typedef {object} Drill
 * @property {string} title What happened, in a few words.
 * @property {'no-go' | 'caution'} level What our rule says to do.
 * @property {string} text The rule's advice, as the verdict words it.
 * @property {number} durationMinutes How long the drill lasts, in simulated minutes.
 */

/** Date given to the drill's made-up event, so the rule can be asked about it. Never shown. */
const DRILL_DATE = '2000-01-01';
/** The drill lasts between these many simulated minutes, in steps of DURATION_STEP_MINUTES. */
const MIN_DURATION_MINUTES = 20;
const MAX_DURATION_MINUTES = 240;
const DURATION_STEP_MINUTES = 5;

/** The kinds of alert a drill can be, each as the event DONKI would report. */
const DRILL_KINDS = /** @type {{ title: string, event: SpaceEvent }[]} */ ([
  { title: 'Solar storm: direct hit on Mars', event: { type: 'CME-MARS', time: `${DRILL_DATE}T12:00Z`, detail: '', observedAt: '', isGlancingBlow: false } },
  { title: 'Solar storm: glancing blow at Mars', event: { type: 'CME-MARS', time: `${DRILL_DATE}T12:00Z`, detail: '', observedAt: '', isGlancingBlow: true } },
  { title: 'Solar particle event', event: { type: 'SEP', time: `${DRILL_DATE}T12:00Z`, detail: '', observedAt: '', isGlancingBlow: false } },
]);

/**
 * Draw a random drill alert.
 * @param {() => number} random Returns a number from 0 (inclusive) to 1 (exclusive), like Math.random.
 * @returns {Drill}
 */
export function drawDrill(random) {
  const kind = DRILL_KINDS[Math.floor(random() * DRILL_KINDS.length)];
  const steps = (MAX_DURATION_MINUTES - MIN_DURATION_MINUTES) / DURATION_STEP_MINUTES;
  const durationMinutes = MIN_DURATION_MINUTES + Math.floor(random() * (steps + 1)) * DURATION_STEP_MINUTES;
  const reason = assessSpaceWeather({ coverageStart: DRILL_DATE, coverageEnd: DRILL_DATE, unavailable: [], events: [kind.event] }, DRILL_DATE);
  // The text's time is the made-up event's; a drill has none worth showing.
  const text = reason.text.replace(/ \(\d\d:\d\d UTC\)/, '');
  return { title: kind.title, level: reason.level === 'no-go' ? 'no-go' : 'caution', text, durationMinutes };
}
