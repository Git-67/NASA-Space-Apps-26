// @ts-check
/**
 * Page script for the briefing page. It loads the prepared data, keeps the
 * page's state (stops and their order, the chosen leg, the sol, walking
 * speed) and asks the feature modules to redraw. No planning logic lives here.
 */
import { el, requireElement } from '../lib/dom.js';
import { earthDateOfSol, solOnEarthDate } from '../lib/mars.js';
import { initThemeToggle } from '../features/theme/theme-toggle.js';
import { createMapView } from '../features/map/map-view.js';
import { buildPlan, DEFAULT_WALKING_SPEED_KMH } from '../features/plan/plan-model.js';
import { renderPlan, renderStopDetails, renderStopList } from '../features/plan/plan-view.js';
import { compareWithSeason, decideVerdict } from '../features/conditions/conditions-model.js';
import { renderConditions, renderSpaceWeather, renderVerdict } from '../features/conditions/conditions-view.js';
import { assessSpaceWeather } from '../features/conditions/space-weather-model.js';
import { fetchLiveSpaceWeather } from '../features/conditions/space-weather-live.js';
import { loadBriefingData } from './load-briefing-data.js';

/** @typedef {import('./load-briefing-data.js').BriefingData} BriefingData */
/** @typedef {import('../features/conditions/space-weather-model.js').SpaceWeather} SpaceWeather */

/** Sol the page opens on: the sol Curiosity reached the last stop, in the boxwork itself. */
const DEFAULT_SOL = 4711;
const MIN_SPEED_KMH = 0.5;
const MAX_SPEED_KMH = 5;

/**
 * Start the page once the data has loaded.
 * @param {BriefingData} data
 */
function start({ route, records, places, calibration, spaceWeather }) {
  const recordBySol = new Map(records.map((record) => [record.sol, record]));
  const firstSol = records[0].sol;
  const reference = records[records.length - 1];
  const today = new Date();
  const presentSol = solOnEarthDate(today.toISOString().slice(0, 10), reference);

  const state = {
    /** Every stop id in visiting order; the start stays first. */
    stopOrder: route.stops.map((stop) => stop.id),
    selectedStopIds: route.stops.map((stop) => stop.id),
    /** The stop whose leg is brought forward on the map, or null to show the whole walk equally. */
    activeStopId: /** @type {string | null} */ (null),
    detailStopId: route.stops[0].id,
    sol: DEFAULT_SOL,
    walkingSpeedKmh: DEFAULT_WALKING_SPEED_KMH,
    /** Live space weather for the present sol: undefined until asked for, null while loading. */
    liveSpaceWeather: /** @type {SpaceWeather | Error | null | undefined} */ (undefined),
  };

  const solInput = /** @type {HTMLInputElement} */ (requireElement('sol-input'));
  const solSlider = /** @type {HTMLInputElement} */ (requireElement('sol-slider'));
  const presentButton = requireElement('present-button');
  const presentNote = requireElement('present-note');
  const speedInput = /** @type {HTMLInputElement} */ (requireElement('speed-input'));
  for (const input of [solInput, solSlider]) {
    input.min = String(firstSol);
    input.max = String(presentSol);
  }
  speedInput.min = String(MIN_SPEED_KMH);
  speedInput.max = String(MAX_SPEED_KMH);
  speedInput.value = String(state.walkingSpeedKmh);

  const mapView = createMapView(requireElement('map'), route, { places, calibration }, (stopId) => {
    state.activeStopId = state.activeStopId === stopId ? null : stopId;
    state.detailStopId = stopId;
    redraw();
    requireElement('stop-details').scrollIntoView({ block: 'nearest' });
  });

  /** Redraw everything that depends on the state. */
  function redraw() {
    const visitOrder = state.stopOrder.filter((id) => state.selectedStopIds.includes(id));
    const plan = buildPlan(route, visitOrder, state.walkingSpeedKmh);
    const record = recordBySol.get(state.sol);
    const comparison = record ? compareWithSeason(record, records) : null;
    const isPresent = state.sol === presentSol;
    const date = isPresent ? today.toISOString().slice(0, 10) : record?.earthDate ?? earthDateOfSol(state.sol, reference);
    const weatherForDate = isPresent ? state.liveSpaceWeather : spaceWeather;

    solInput.value = String(state.sol);
    solSlider.value = String(state.sol);
    presentButton.setAttribute('aria-pressed', String(isPresent));
    presentNote.hidden = !isPresent;
    presentNote.textContent = `Present: ${date}, about sol ${presentSol} (counted from the date). Curiosity's weather feed ends at sol ${reference.sol}, so only space weather is read for today.`;

    renderVerdict(requireElement('verdict'), decideVerdict({
      planMinutes: plan.totalMinutes, record, comparison,
      spaceWeather: weatherForDate === null || weatherForDate === undefined
        ? { level: 'unknown', text: "Reading today's space weather from NASA…", basis: 'NASA DONKI, read live.' }
        : assessSpaceWeather(weatherForDate, date),
    }));
    renderConditions(requireElement('conditions'), state.sol, record, comparison);
    renderSpaceWeather(requireElement('space-weather'), weatherForDate ?? null, date);
    renderStopList(requireElement('stop-list'), route, { order: state.stopOrder, selectedIds: state.selectedStopIds }, {
      onToggle: (stopId, isSelected) => {
        state.selectedStopIds = isSelected ? [...state.selectedStopIds, stopId] : state.selectedStopIds.filter((id) => id !== stopId);
        redraw();
      },
      onMove: (stopId, step) => {
        const from = state.stopOrder.indexOf(stopId);
        const to = from + step;
        if (from < 1 || to < 1 || to >= state.stopOrder.length) return; // the start stays first
        const order = [...state.stopOrder];
        [order[from], order[to]] = [order[to], order[from]];
        state.stopOrder = order;
        redraw();
        requireElement('stop-list').querySelector(`[aria-label$=": ${route.stops.find((stop) => stop.id === stopId)?.name}"]:not(:disabled)`)?.focus();
      },
      onShowDetails: (stopId) => {
        state.detailStopId = stopId;
        state.activeStopId = stopId;
        redraw();
      },
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
    mapView.showPlan(plan, state.activeStopId);
    mapView.highlightStop(detailStop.id);
  }

  /** @param {string} value */
  const setSol = (value) => {
    const sol = Math.round(Number(value));
    if (!Number.isFinite(sol)) return;
    state.sol = Math.min(presentSol, Math.max(firstSol, sol));
    if (state.sol === presentSol && state.liveSpaceWeather === undefined) {
      state.liveSpaceWeather = null;
      fetchLiveSpaceWeather(today)
        .then((weather) => { state.liveSpaceWeather = weather; })
        .catch((error) => { state.liveSpaceWeather = error instanceof Error ? error : new Error(String(error)); })
        .finally(redraw);
    }
    redraw();
  };
  solInput.addEventListener('change', () => setSol(solInput.value));
  solSlider.addEventListener('input', () => setSol(solSlider.value));
  presentButton.addEventListener('click', () => setSol(String(presentSol)));
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
    const data = await loadBriefingData();
    status.remove();
    requireElement('briefing').hidden = false;
    start(data);
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
