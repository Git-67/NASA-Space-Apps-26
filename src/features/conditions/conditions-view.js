// @ts-check
/**
 * The "when" side of the panel: the verdict and the conditions on the chosen
 * sol. Presentation only; the logic is in conditions-model.js.
 */
import { el } from '../../lib/dom.js';
import { formatDuration, formatMarsClock, marsMinutesToEarthMinutes } from '../../lib/mars.js';

/** @typedef {import('./conditions-model.js').Verdict} Verdict */
/** @typedef {import('./conditions-model.js').WeatherRecord} WeatherRecord */
/** @typedef {import('./conditions-model.js').SeasonComparison} SeasonComparison */

const VERDICT_LABEL = { go: 'Go', caution: 'Caution', 'no-go': 'No-go', unknown: 'No verdict' };
/** A symbol beside each level, so the verdict never depends on colour alone. */
const VERDICT_SYMBOL = { go: '✓', caution: '!', 'no-go': '✕', unknown: '?' };
const UV_LABEL = { Low: 'Low', Moderate: 'Moderate', High: 'High', Very_High: 'Very high' };
const MISSING = 'not recorded';

/**
 * Draw the verdict and the reasons behind it.
 * @param {HTMLElement} container
 * @param {Verdict} verdict
 */
export function renderVerdict(container, verdict) {
  container.dataset.level = verdict.level;
  container.replaceChildren(
    el('p', { className: 'verdict-level' }, [
      el('span', { className: 'verdict-symbol', text: VERDICT_SYMBOL[verdict.level], attrs: { 'aria-hidden': 'true' } }),
      VERDICT_LABEL[verdict.level],
    ]),
    el('ul', { className: 'reason-list' }, verdict.reasons.map((reason) => el('li', { attrs: { 'data-level': reason.level } }, [
      el('span', { className: 'reason-symbol', text: VERDICT_SYMBOL[reason.level], attrs: { 'aria-hidden': 'true' } }),
      el('div', {}, [
        el('p', { text: reason.text }),
        el('p', { className: 'basis', text: `Basis: ${reason.basis}` }),
      ]),
    ]))),
  );
}

/**
 * Draw the measured conditions for a sol.
 * @param {HTMLElement} container
 * @param {number} sol The chosen sol number.
 * @param {WeatherRecord | undefined} record The sol's record, if Curiosity made one.
 * @param {SeasonComparison | null} comparison How the sol compares with its season.
 */
export function renderConditions(container, sol, record, comparison) {
  if (!record) {
    container.replaceChildren(el('p', { className: 'chart-state', text: `Curiosity recorded no weather on sol ${sol}. Try a nearby sol.` }));
    return;
  }
  const degrees = (/** @type {number | null} */ value) => (value === null ? MISSING : `${value} °C`);
  const daylight = record.sunriseMin !== null && record.sunsetMin !== null
    ? `${formatMarsClock(record.sunriseMin)} to ${formatMarsClock(record.sunsetMin)} local · ${formatDuration(marsMinutesToEarthMinutes(record.sunsetMin - record.sunriseMin))}`
    : MISSING;
  const row = (/** @type {string} */ label, /** @type {string} */ value) => el('div', { className: 'reading' }, [
    el('dt', { text: label }),
    el('dd', { text: value }),
  ]);

  container.replaceChildren(
    el('p', { className: 'telemetry', text: `Sol ${record.sol} · ${record.earthDate} (Earth date) · solar longitude ${record.ls ?? '?'}°` }),
    el('dl', { className: 'reading-list' }, [
      row('Daylight', daylight),
      row('Air, high / low', `${degrees(record.airMaxC)} / ${degrees(record.airMinC)}`),
      row('Ground, high / low', `${degrees(record.groundMaxC)} / ${degrees(record.groundMinC)}`),
      row('Typical high this season', comparison ? `${comparison.medianAirMaxC} °C (${comparison.sampleSize} sols)` : 'too few sols to say'),
      row('Ultraviolet', record.uv ? UV_LABEL[/** @type {keyof typeof UV_LABEL} */ (record.uv)] : MISSING),
      row('Pressure', record.pressurePa === null ? MISSING : `${record.pressurePa} Pa`),
    ]),
  );
}
