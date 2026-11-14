// @ts-check
/**
 * Page script for the briefing page. It loads the prepared data, keeps the
 * page's state (the stops in visiting order, the chosen stop, the sol) and
 * asks the feature modules to redraw. No planning logic lives here.
 */
import { el, requireElement } from '../lib/dom.js';
import { earthDateOfSol, solOnEarthDate } from '../lib/mars.js';
import { initThemeToggle } from '../features/theme/theme-toggle.js';
import { createMapView } from '../features/map/map-view.js';
import { buildPlan, DEFAULT_WALKING_SPEED_KMH, recommendedOrder } from '../features/plan/plan-model.js';
import { renderPlan, renderTasks } from '../features/plan/plan-view.js';
import { createStopPicker } from '../features/plan/stop-picker.js';
import { compareWithSeason, decideVerdict } from '../features/conditions/conditions-model.js';
import { renderConditions, renderSpaceWeather, renderVerdict } from '../features/conditions/conditions-view.js';
import { assessSpaceWeather } from '../features/conditions/space-weather-model.js';
import { refreshSpaceWeather } from '../features/conditions/space-weather-live.js';
import { renderConnection } from '../features/connection/connection-view.js';
import { canReachNasa, detectMode, setPrefersOffline } from '../lib/connection.js';
import { loadBriefingData } from './load-briefing-data.js';

/** @typedef {import('./load-briefing-data.js').BriefingData} BriefingData */

/** Sol the page opens on: the sol Curiosity reached the last stop, in the boxwork itself. */
const DEFAULT_SOL = 4711;

/**
 * Start the page once the data has loaded.
 * @param {BriefingData} data
 * @param {import('../lib/connection.js').ConnectionMode} startMode Online (live NASA data) or offline (stored data).
 */
function start({ route, records, places, calibration, spaceWeather: bundledSpaceWeather }, startMode) {
  const recordBySol = new Map(records.map((record) => [record.sol, record]));
  const firstSol = records[0].sol;
  const reference = records[records.length - 1];
  const today = new Date();
  const presentSol = solOnEarthDate(today.toISOString().slice(0, 10), reference);

  const recommended = recommendedOrder(route);
  const state = {
    /** Stops to visit after the start, in visiting order. Opens on the recommended plan. */
    visitOrder: recommended,
    /** The chosen stop: its leg is brought forward on the map and its tasks highlighted. Null shows the whole walk. */
    activeStopId: /** @type {string | null} */ (null),
    sol: DEFAULT_SOL,
    mode: startMode,
    /** Space weather in use: the bundled record, extended to today when online. */
    spaceWeather: bundledSpaceWeather,
    /** Why the page is offline when it was not the visitor's choice, if so. */
    connectionNote: /** @type {string | undefined} */ (undefined),
  };
  const connection = {
    status: requireElement('connection-status'),
    toggle: /** @type {HTMLButtonElement} */ (requireElement('connection-toggle')),
  };

  const solInput = /** @type {HTMLInputElement} */ (requireElement('sol-input'));
  const solSlider = /** @type {HTMLInputElement} */ (requireElement('sol-slider'));
  const presentButton = requireElement('present-button');
  const presentNote = requireElement('present-note');
  for (const input of [solInput, solSlider]) {
    input.min = String(firstSol);
    input.max = String(presentSol);
  }

  /** @param {string} stopId */
  const focusStop = (stopId) => {
    state.activeStopId = state.activeStopId === stopId ? null : stopId;
    redraw();
    document.getElementById(`tasks-${stopId}`)?.scrollIntoView({ block: 'nearest' });
  };
  const mapView = createMapView(requireElement('map'), route, { places, calibration }, state.mode, focusStop);
  const recommendedKm = (buildPlan(route, recommended, DEFAULT_WALKING_SPEED_KMH).distanceM / 1000).toFixed(1);
  const picker = createStopPicker(requireElement('stop-picker'), route, `All ${route.stops.length} stops, safest order (${recommendedKm} km)`, {
    onAdd: (stopId) => { state.visitOrder = [...state.visitOrder, stopId]; redraw(); },
    onRecommended: () => { state.visitOrder = recommended; redraw(); },
    onRemove: (stopId) => {
      state.visitOrder = state.visitOrder.filter((id) => id !== stopId);
      if (state.activeStopId === stopId) state.activeStopId = null;
      redraw();
    },
    onMove: (stopId, step) => {
      const from = state.visitOrder.indexOf(stopId);
      const to = from + step;
      if (from < 0 || to < 0 || to >= state.visitOrder.length) return;
      const order = [...state.visitOrder];
      [order[from], order[to]] = [order[to], order[from]];
      state.visitOrder = order;
      redraw();
      const name = route.stops.find((stop) => stop.id === stopId)?.name;
      /** @type {HTMLElement | null} */ (requireElement('stop-picker').querySelector(`[aria-label="${step < 0 ? 'Visit earlier' : 'Visit later'}: ${name}"]:not(:disabled)`))?.focus();
    },
    onFocus: focusStop,
  });

  /** Redraw everything that depends on the state. */
  function redraw() {
    const plan = buildPlan(route, state.visitOrder, DEFAULT_WALKING_SPEED_KMH);
    const record = recordBySol.get(state.sol);
    const comparison = record ? compareWithSeason(record, records) : null;
    const isPresent = state.sol === presentSol;
    const date = isPresent ? today.toISOString().slice(0, 10) : record?.earthDate ?? earthDateOfSol(state.sol, reference);
    // Without a live update, today's space weather is the newest day on board; the note says how old it is.
    const spaceWeather = state.spaceWeather;
    const latest = spaceWeather instanceof Error ? null : spaceWeather.coverageEnd;
    const weatherDate = isPresent && latest !== null && latest < date ? latest : date;

    solInput.value = String(state.sol);
    solSlider.value = String(state.sol);
    presentButton.setAttribute('aria-pressed', String(isPresent));
    presentNote.hidden = !isPresent;
    presentNote.textContent = `Today, ${date} (about sol ${presentSol}). No rover weather after sol ${reference.sol}. `
      + (state.mode === 'online' && latest === date ? 'Space weather is live from NASA.' : `Space weather is the latest stored: ${latest ?? 'none'}.`);
    renderConnection(connection, { mode: state.mode, dataTo: latest, note: state.connectionNote });

    renderVerdict(requireElement('verdict'), decideVerdict({
      planMinutes: plan.totalMinutes, furthestM: plan.furthestM, record, comparison,
      spaceWeather: assessSpaceWeather(spaceWeather, weatherDate),
    }));
    renderConditions(requireElement('conditions'), state.sol, record, comparison);
    renderSpaceWeather(requireElement('space-weather'), spaceWeather, weatherDate);
    picker.update(state.visitOrder, state.activeStopId);
    renderPlan({
      sections: requireElement('sections'),
      totals: requireElement('totals'),
      profile: requireElement('profile'),
      dangers: requireElement('dangers'),
      kit: requireElement('kit'),
    }, route, plan);
    renderTasks(requireElement('tasks'), plan, state.activeStopId);
    mapView.showPlan(plan, state.activeStopId);
    mapView.highlightStop(state.activeStopId);
  }

  /** @param {string} value */
  const setSol = (value) => {
    const sol = Math.round(Number(value));
    if (!Number.isFinite(sol)) return;
    state.sol = Math.min(presentSol, Math.max(firstSol, sol));
    redraw();
  };
  /** Online: extend the space weather to today. Falls back to the bundle, with a note, if NASA does not answer. */
  const goLive = () => {
    if (bundledSpaceWeather instanceof Error) return;
    refreshSpaceWeather(bundledSpaceWeather, today)
      .then((fresh) => { if (state.mode === 'online') state.spaceWeather = fresh; })
      .catch((error) => { state.connectionNote = `Live space weather failed: ${error instanceof Error ? error.message : error}`; })
      .finally(redraw);
  };
  /** @param {import('../lib/connection.js').ConnectionMode} mode */
  const setMode = (mode) => {
    state.mode = mode;
    mapView.setMode(mode);
    if (mode === 'online') goLive();
    else state.spaceWeather = bundledSpaceWeather;
    redraw();
  };
  connection.toggle.addEventListener('click', async () => {
    if (state.mode === 'online') {
      setPrefersOffline(true);
      state.connectionNote = 'You chose offline.';
      setMode('offline');
      return;
    }
    setPrefersOffline(false);
    renderConnection(connection, { mode: 'checking', dataTo: null });
    const isReachable = await canReachNasa();
    state.connectionNote = isReachable ? undefined : 'NASA could not be reached. Showing the data stored with the site.';
    setMode(isReachable ? 'online' : 'offline');
  });
  if (state.mode === 'online') goLive();

  solInput.addEventListener('change', () => setSol(solInput.value));
  solSlider.addEventListener('input', () => setSol(solSlider.value));
  presentButton.addEventListener('click', () => setSol(String(presentSol)));

  redraw();
}

/** Load the data, then start the page or show why it could not start. */
async function main() {
  initThemeToggle(requireElement('theme-toggle'));
  const status = requireElement('load-status');
  try {
    // Check the link to NASA while the stored data loads; neither waits for the other.
    const [data, mode] = await Promise.all([loadBriefingData(), detectMode()]);
    status.remove();
    requireElement('briefing').hidden = false;
    start(data, mode);
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
