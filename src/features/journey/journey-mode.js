// @ts-check
/**
 * "Begin journey": a full-screen, simulated walk of the current plan.
 *
 * The page hides its top bar and side panel (fewer things to press by mistake,
 * more map to see through a dusty visor), zooms in on the walker and moves
 * them from the start to the end of the plan at NASA's planning pace (2 km/h),
 * sped up so a walk takes about a minute. At each stop the walk pauses and the
 * stop's tasks pop up. The walker faces the way the device's compass points,
 * where it has one, or else the direction of travel.
 *
 * SIMULATION: there is no real astronaut position; the overlay says so.
 */
import { startCompass } from '../../lib/compass.js';
import { buildJourney, nextArrival, positionAt } from './journey-model.js';
import { createJourneyHud } from './journey-hud.js';

/** @typedef {import('../plan/plan-model.js').Plan} Plan */
/** @typedef {import('../map/map-view.js').MapViewApi} MapViewApi */
/** @typedef {import('./journey-hud.js').WeatherSummary} WeatherSummary */

/** How much faster than real walking the simulation runs; the button cycles through these. */
const SPEEDS = [60, 120, 30];
/** Zoom while walking: the sharpest real imagery (HiRISE is published to zoom 16), close enough to see the ground. */
const WALK_ZOOM = 16;
/** Under reduced motion, the walker moves in steps this far apart in time, in milliseconds. */
const STEP_MS = 1000;
/** How often live space weather is read again during a walk, in milliseconds (15 minutes). */
const WEATHER_REFRESH_MS = 15 * 60 * 1000;

/**
 * Set up journey mode.
 * @param {object} options
 * @param {MapViewApi} options.map
 * @param {number} options.walkingSpeedKmh Real walking pace to simulate.
 * @param {{ current: () => WeatherSummary, refresh: () => Promise<void> }} options.weather Space weather for now.
 * @returns {{ begin: (plan: Plan) => Promise<void>, end: () => void, isActive: () => boolean }}
 */
export function createJourneyMode({ map, walkingSpeedKmh, weather }) {
  const metresPerMs = (walkingSpeedKmh * 1000) / 3_600_000;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** @type {ReturnType<typeof buildJourney> | null} */
  let journey = null;
  /** @type {Plan | null} */
  let plan = null;
  let walkedM = 0;
  let isPlaying = false;
  let speedIndex = 0;
  /** @type {number | null} */
  let compassHeading = null;
  /** @type {(() => void) | null} */
  let stopCompass = null;
  /** @type {number | null} */
  let frame = null;
  /** @type {number | null} */
  let weatherTimer = null;
  let lastTime = 0;
  /** @type {Element | null} */
  let returnFocusTo = null;

  const hud = createJourneyHud({
    onEnd: () => end(),
    onTogglePlay: () => { isPlaying = !isPlaying; lastTime = performance.now(); render(); },
    onSpeed: () => { speedIndex = (speedIndex + 1) % SPEEDS.length; render(); },
  });

  /** Draw the walker and the status for the current distance. */
  function render() {
    if (!journey || !plan) return;
    const position = positionAt(journey, walkedM);
    const heading = compassHeading ?? position.headingDeg;
    map.showAstronaut(position.lat, position.lon, heading);
    map.follow(position.lat, position.lon, null, false);
    const next = nextArrival(journey, walkedM);
    const metresToGo = next ? next.alongM - walkedM : 0;
    hud.setStatus({
      nextName: next ? next.name : null,
      metresToGo,
      minutesToGo: metresToGo / metresPerMs / 60_000,
      facingFrom: compassHeading === null ? 'travel' : 'compass',
    });
    hud.setControls(isPlaying, SPEEDS[speedIndex]);
  }

  /** @param {number} now performance.now() */
  function tick(now) {
    if (journey && plan && isPlaying && !hud.isDialogOpen()) {
      const next = nextArrival(journey, walkedM);
      walkedM += (now - lastTime) * metresPerMs * SPEEDS[speedIndex];
      if (next && walkedM >= next.alongM) {
        walkedM = next.alongM;
        isPlaying = false;
        const stop = plan.stops.find((item) => item.id === next.stopId);
        hud.showArrival(next, stop, plan.stops.length, () => {
          if (next.isFinish) { end(); return; }
          isPlaying = true;
          lastTime = performance.now();
          render();
        });
      }
      render();
    }
    lastTime = now;
    schedule();
  }

  function schedule() {
    if (!journey) return;
    if (prefersReducedMotion) frame = window.setTimeout(() => tick(performance.now()), STEP_MS);
    else frame = window.requestAnimationFrame(tick);
  }

  function showWeather() {
    hud.setWeather(weather.current());
  }

  /** @param {KeyboardEvent} event */
  function onKey(event) {
    if (event.key === 'Escape' && !hud.isDialogOpen()) end();
  }

  /** @param {Plan} nextPlan */
  async function begin(nextPlan) {
    if (journey || nextPlan.sections.length === 0) return;
    returnFocusTo = document.activeElement;
    plan = nextPlan;
    journey = buildJourney(nextPlan);
    walkedM = 0;
    isPlaying = true;
    compassHeading = null;
    document.body.classList.add('is-journey');
    map.resize();
    const start = positionAt(journey, 0);
    map.follow(start.lat, start.lon, WALK_ZOOM, false);
    hud.setShown(true);
    showWeather();
    weather.refresh().then(showWeather, showWeather);
    weatherTimer = window.setInterval(() => { weather.refresh().then(showWeather, showWeather); }, WEATHER_REFRESH_MS);
    document.addEventListener('keydown', onKey);
    render();
    lastTime = performance.now();
    schedule();
    stopCompass = await startCompass((heading) => { compassHeading = heading; });
  }

  function end() {
    if (!journey) return;
    journey = null;
    plan = null;
    if (frame !== null) { window.cancelAnimationFrame(frame); window.clearTimeout(frame); }
    if (weatherTimer !== null) window.clearInterval(weatherTimer);
    stopCompass?.();
    stopCompass = null;
    document.removeEventListener('keydown', onKey);
    hud.setShown(false);
    map.hideAstronaut();
    document.body.classList.remove('is-journey');
    map.resize();
    if (returnFocusTo instanceof HTMLElement) returnFocusTo.focus();
  }

  return { begin, end, isActive: () => journey !== null };
}
