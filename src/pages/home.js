// @ts-check
/**
 * Page script for the briefing page. It loads the prepared data, keeps the
 * page's state (which stops, which sol, storm alert, walking speed) and asks
 * the feature modules to redraw. No planning logic lives here.
 */
import { loadJson } from '../lib/load-json.js';
import { el, requireElement } from '../lib/dom.js';
import { initThemeToggle } from '../features/theme/theme-toggle.js';
import { createMapView } from '../features/map/map-view.js';
import { parseDemCalibration, parseLandmarks } from '../features/map/map-layer-data.js';
import { buildPlan, DEFAULT_WALKING_SPEED_KMH } from '../features/plan/plan-model.js';
import { renderPlan, renderStopDetails, renderStopList } from '../features/plan/plan-view.js';
import { compareWithSeason, decideVerdict } from '../features/conditions/conditions-model.js';
import { renderConditions, renderVerdict } from '../features/conditions/conditions-view.js';

/** @typedef {import('../features/plan/plan-model.js').Route} Route */
/** @typedef {import('../features/conditions/conditions-model.js').WeatherRecord} WeatherRecord */

const ROUTE_FILE = 'data/processed/route.json';
const WEATHER_FILE = 'data/processed/weather.json';
const LANDMARKS_FILE = 'data/processed/landmarks.json';
const DEM_CALIBRATION_FILE = 'data/processed/dem_calibration.json';
/** Sol the page opens on: the sol Curiosity reached the last stop, in the boxwork itself. */
const DEFAULT_SOL = 4711;
const MIN_SPEED_KMH = 0.5;
const MAX_SPEED_KMH = 5;

/**
 * Check the route file has the shape the page relies on.
 * @param {any} data
 * @returns {Route}
 */
function parseRoute(data) {
  if (!Array.isArray(data?.points) || !Array.isArray(data?.stops) || data.points.length < 2 || data.stops.length < 1) {
    throw new Error('The route file is empty or damaged. Run scripts/prepare_route.py again.');
  }
  return data;
}

/**
 * Check the weather file has the shape the page relies on.
 * @param {any} data
 * @returns {WeatherRecord[]}
 */
function parseWeather(data) {
  if (!Array.isArray(data?.records) || data.records.length === 0) {
    throw new Error('The weather file is empty or damaged. Run scripts/prepare_weather.py again.');
  }
  return data.records;
}

/**
 * Load and check an optional file. Failure is returned, not thrown, so that
 * one missing map layer never stops the briefing from opening.
 * @template T
 * @param {string} path File to load.
 * @param {(data: any) => T} parse Checks the file's shape and returns typed data.
 * @returns {Promise<T | Error>}
 */
async function loadOptional(path, parse) {
  try {
    return parse(await loadJson(path));
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Start the page once the data has loaded.
 * @param {Route} route
 * @param {WeatherRecord[]} records
 * @param {{ places: import('../features/map/map-layer-data.js').Place[] | Error, calibration: import('../features/map/map-layer-data.js').DemCalibration | Error }} mapExtras
 */
function start(route, records, mapExtras) {
  const recordBySol = new Map(records.map((record) => [record.sol, record]));
  const firstSol = records[0].sol;
  const lastSol = records[records.length - 1].sol;

  const state = {
    selectedStopIds: route.stops.map((stop) => stop.id),
    sol: DEFAULT_SOL,
    isSolarStormAlert: false,
    walkingSpeedKmh: DEFAULT_WALKING_SPEED_KMH,
    detailStopId: route.stops[0].id,
  };

  const solInput = /** @type {HTMLInputElement} */ (requireElement('sol-input'));
  const solSlider = /** @type {HTMLInputElement} */ (requireElement('sol-slider'));
  const stormInput = /** @type {HTMLInputElement} */ (requireElement('storm-input'));
  const speedInput = /** @type {HTMLInputElement} */ (requireElement('speed-input'));
  for (const input of [solInput, solSlider]) {
    input.min = String(firstSol);
    input.max = String(lastSol);
  }
  speedInput.min = String(MIN_SPEED_KMH);
  speedInput.max = String(MAX_SPEED_KMH);
  speedInput.value = String(state.walkingSpeedKmh);

  const mapView = createMapView(requireElement('map'), route, mapExtras, (stopId) => {
    state.detailStopId = stopId;
    redraw();
    requireElement('stop-details').scrollIntoView({ block: 'nearest' });
  });

  /** Redraw everything that depends on the state. */
  function redraw() {
    const plan = buildPlan(route, state.selectedStopIds, state.walkingSpeedKmh);
    const record = recordBySol.get(state.sol);
    const comparison = record ? compareWithSeason(record, records) : null;

    solInput.value = String(state.sol);
    solSlider.value = String(state.sol);
    renderVerdict(requireElement('verdict'), decideVerdict({
      planMinutes: plan.totalMinutes, record, comparison, isSolarStormAlert: state.isSolarStormAlert,
    }));
    renderConditions(requireElement('conditions'), state.sol, record, comparison);
    renderStopList(requireElement('stop-list'), route, state.selectedStopIds, (stopId, isSelected) => {
      state.selectedStopIds = isSelected
        ? [...state.selectedStopIds, stopId]
        : state.selectedStopIds.filter((id) => id !== stopId);
      redraw();
    }, (stopId) => {
      state.detailStopId = stopId;
      redraw();
    });
    renderPlan({
      sections: requireElement('sections'),
      totals: requireElement('totals'),
      profile: requireElement('profile'),
      dangers: requireElement('dangers'),
      kit: requireElement('kit'),
    }, route, plan);
    const detailStop = route.stops.find((stop) => stop.id === state.detailStopId) ?? route.stops[0];
    renderStopDetails(requireElement('stop-details'), route, detailStop);
    mapView.setVisitedStops(plan.stops.map((stop) => stop.id));
    mapView.highlightStop(detailStop.id);
  }

  /** @param {string} value */
  const setSol = (value) => {
    const sol = Math.round(Number(value));
    if (!Number.isFinite(sol)) return;
    state.sol = Math.min(lastSol, Math.max(firstSol, sol));
    redraw();
  };
  solInput.addEventListener('change', () => setSol(solInput.value));
  solSlider.addEventListener('input', () => setSol(solSlider.value));
  for (const button of document.querySelectorAll('[data-sol]')) {
    button.addEventListener('click', () => setSol(/** @type {HTMLElement} */ (button).dataset.sol ?? ''));
  }
  stormInput.addEventListener('change', () => {
    state.isSolarStormAlert = stormInput.checked;
    redraw();
  });
  speedInput.addEventListener('change', () => {
    const speed = Number(speedInput.value);
    if (Number.isFinite(speed) && speed >= MIN_SPEED_KMH && speed <= MAX_SPEED_KMH) state.walkingSpeedKmh = speed;
    speedInput.value = String(state.walkingSpeedKmh);
    redraw();
  });

  redraw();
}

/** Load the data, then start the page or show why it could not start. */
async function main() {
  initThemeToggle(requireElement('theme-toggle'));
  const status = requireElement('load-status');
  try {
    const [routeData, weatherData, places, calibration] = await Promise.all([
      loadJson(ROUTE_FILE),
      loadJson(WEATHER_FILE),
      loadOptional(LANDMARKS_FILE, parseLandmarks),
      loadOptional(DEM_CALIBRATION_FILE, parseDemCalibration),
    ]);
    const route = parseRoute(routeData);
    const records = parseWeather(weatherData);
    status.remove();
    requireElement('briefing').hidden = false;
    start(route, records, { places, calibration });
  } catch (error) {
    const retry = el('button', { className: 'button-secondary', text: 'Try again', attrs: { type: 'button' } });
    retry.addEventListener('click', () => window.location.reload());
    status.replaceChildren(
      el('p', { text: `The briefing could not be loaded. ${error instanceof Error ? error.message : ''}` }),
      retry,
    );
    status.setAttribute('role', 'alert');
  }
}

main();
