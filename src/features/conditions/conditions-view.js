// @ts-check
/**
 * The "when" side of the panel: the verdict, the conditions on the chosen
 * sol and the space weather on its date. Presentation only; the logic is in conditions-model.js.
 */
import { el } from '../../lib/dom.js';
import { formatDuration, formatMarsClock, marsMinutesToEarthMinutes } from '../../lib/mars.js';
import { EVENT_TYPE_LABEL, eventsOnDate } from './space-weather-model.js';

/** @typedef {import('./conditions-model.js').Verdict} Verdict */
/** @typedef {import('./conditions-model.js').WeatherRecord} WeatherRecord */
/** @typedef {import('./conditions-model.js').SeasonComparison} SeasonComparison */
/** @typedef {import('./space-weather-model.js').SpaceWeather} SpaceWeather */

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
    container.replaceChildren(el('p', { className: 'chart-state', text: `No rover weather for sol ${sol}.` }));
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
      row('Usual high this season', comparison ? `${comparison.medianAirMaxC} °C` : 'not enough data'),
      row('Ultraviolet', record.uv ? UV_LABEL[/** @type {keyof typeof UV_LABEL} */ (record.uv)] : MISSING),
      row('Pressure', record.pressurePa === null ? MISSING : `${record.pressurePa} Pa`),
    ]),
  );
}

/**
 * List the space weather events on the chosen date, by type, with where each was seen.
 * @param {HTMLElement} container
 * @param {SpaceWeather | Error} weather The bundled record, or why it could not be loaded.
 * @param {string | null} date Earth date of the chosen sol.
 */
export function renderSpaceWeather(container, weather, date) {
  if (weather instanceof Error) {
    container.replaceChildren(el('p', { className: 'chart-state', text: `Space weather unavailable. ${weather.message}` }));
    return;
  }
  const events = date ? eventsOnDate(weather, date) : [];
  const heading = el('h4', { text: `Space weather, ${date ?? 'this date'}` });
  const missing = [
    ...(weather.unavailable.length > 0 ? [el('p', { className: 'basis', text: `Missing from NASA's data: ${weather.unavailable.join(', ')}.` })] : []),
    ...((weather.gaps ?? []).length > 0 ? [el('p', { className: 'basis', text: `No data for ${(weather.gaps ?? []).join(', ')}.` })] : []),
  ];
  if (events.length === 0) {
    container.replaceChildren(heading, el('p', { className: 'chart-state', text: 'Quiet: no storms or particle events.' }), ...missing);
    return;
  }
  container.replaceChildren(heading, el('ul', { className: 'event-list' }, events.map((event) => el('li', {}, [
    el('span', { className: 'event-type', text: EVENT_TYPE_LABEL[event.type] }),
    el('span', { className: 'telemetry', text: `${event.time.slice(11, 16)} UTC · ${event.detail}${event.observedAt ? ` · ${event.observedAt}` : ''}` }),
  ]))), ...missing);
}
