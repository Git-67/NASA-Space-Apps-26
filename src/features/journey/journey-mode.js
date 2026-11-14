// @ts-check
/**
 * "Begin journey": a full-screen, simulated walk of the current plan.
 *
 * The page hides its top bar and side panel (fewer things to press by mistake,
 * more map to see through a dusty visor), zooms in close on the walker and
 * moves them from the start to the end of the plan at NASA's planning pace
 * (2 km/h), sped up so a walk takes a few minutes.
 * - The map keeps the walker centred and turns so the way they face is up,
 *   until the walker drags it; "Re-centre" brings both back.
 * - Only the leg being walked is drawn solid; the rest are dotted and faint
 *   until the walker reaches the stop where they begin.
 * - At each stop the walk waits for the stop's tasks to be submitted (two
 *   presses). Ending the walk takes three (journey-dialogs.js).
 * - "Simulate alert" plays a random space weather alert, labelled as a drill.
 * The walker faces the way the device's compass points, where it has one,
 * or else the direction of travel.
 *
 * SIMULATION: there is no real astronaut position; the overlay says so.
 */
import { startCompass } from '../../lib/compass.js';
import { formatDuration } from '../../lib/mars.js';
import { buildJourney, headingAhead, positionAt, turnToward, walkOn } from './journey-model.js';
import { createJourneyHud } from './journey-hud.js';

/** @typedef {import('../plan/plan-model.js').Plan} Plan */
/** @typedef {import('../map/map-view.js').MapViewApi} MapViewApi */
/** @typedef {import('./journey-hud.js').WeatherSummary} WeatherSummary */
/** @typedef {import('../conditions/space-weather-drill.js').Drill} Drill */

/** How much faster than real walking the simulation runs; the button cycles through these. */
const SPEEDS = [60, 120, 30];
/** Zoom while walking: one step past the sharpest real imagery (HiRISE, zoom 16), so the ground near the walker is large. */
const WALK_ZOOM = 17;
/** Under reduced motion, the walker moves in steps this far apart in time, in milliseconds. */
const STEP_MS = 1000;
/** Longest time one frame may advance the walk, in milliseconds: after the tab was hidden, the walker must not jump past stops. */
const MAX_FRAME_MS = 1500;
/** The status text changes at most this often, in milliseconds: no need to rewrite it every frame. */
const STATUS_EVERY_MS = 250;
/** How often live space weather is read again during a walk, in milliseconds (15 minutes). */
const WEATHER_REFRESH_MS = 15 * 60 * 1000;
/** The map's heading looks this far ahead along the path, in metres, so it does not swing at every small bend. */
const LOOK_AHEAD_M = 25;
/** The map turns most of the way to a new heading in about this long, in milliseconds. */
const TURN_TIME_MS = 600;

/**
 * Set up journey mode.
 * @param {object} options
 * @param {MapViewApi} options.map
 * @param {number} options.walkingSpeedKmh Real walking pace to simulate.
 * @param {{ current: () => WeatherSummary, refresh: () => Promise<void>, drill: () => Drill }} options.weather
 *   Space weather for now, how to read it again, and how to draw a simulated alert.
 * @param {() => void} options.onEnd Called after the journey closes, so the page can redraw its own view.
 * @returns {{ begin: (plan: Plan) => Promise<void>, isActive: () => boolean }}
 */
export function createJourneyMode({ map, walkingSpeedKmh, weather, onEnd }) {
  const metresPerMs = (walkingSpeedKmh * 1000) / 3_600_000;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** @type {ReturnType<typeof buildJourney> | null} */
  let journey = null;
  /** @type {Plan | null} */
  let plan = null;
  /** Metres walked, and the index of the next stop not yet reached. */
  let progress = { walkedM: 0, nextIndex: 0 };
  let isPlaying = false;
  let speedIndex = 0;
  /** @type {number | null} */
  let compassHeading = null;
  /** Heading the map is turned to (compass degrees); eases towards the walker's. */
  let mapHeading = /** @type {number | null} */ (null);
  /** @type {(() => void) | null} */
  let stopCompass = null;
  /** @type {number | null} */
  let frame = null;
  /** @type {number | null} */
  let weatherTimer = null;
  let lastTime = 0;
  /** Simulated time since the walk began, in milliseconds: real time times the speed. */
  let simulatedMs = 0;
  /** @type {{ drill: Drill, endsAtMs: number } | null} A simulated alert under way. */
  let drill = null;
  /** @type {Element | null} */
  let returnFocusTo = null;
  /** Whether the map keeps the walker centred. Dragging the map stops this until "Re-centre". */
  let isFollowing = true;
  let lastStatusAt = 0;
  let insets = { top: 0, bottom: 0 };

  const hud = createJourneyHud({
    onEnd: () => askToEnd(),
    onTogglePlay: () => { isPlaying = !isPlaying; render(0); },
    onSpeed: () => { speedIndex = (speedIndex + 1) % SPEEDS.length; render(0); },
    onRecentre: () => { isFollowing = true; hud.setFollowing(true); render(0, true); },
    onDrill: () => startDrill(),
  });
  map.onUserPan(() => {
    if (!journey) return;
    isFollowing = false;
    hud.setFollowing(false);
  });

  /** Draw the leg being walked solid and the rest faint, and mark the stop it leads to. */
  function showLeg() {
    if (!journey || !plan) return;
    const leg = plan.sections[progress.nextIndex];
    map.showPlan(plan, leg ? leg.fromId : null);
    map.highlightStop(leg ? leg.toId : null);
  }

  /**
   * Draw the walker, keep them centred with the map turned their way, and refresh the status text.
   * @param {number} elapsedMs Time since the last frame, for easing the map's turn.
   * @param {boolean} [isSnap] Turn and centre at once (starting, or "Re-centre").
   */
  function render(elapsedMs, isSnap = false) {
    if (!journey || !plan) return;
    const now = performance.now();
    const isStatusDue = isSnap || now - lastStatusAt >= STATUS_EVERY_MS;
    if (isStatusDue) insets = hud.insets();
    const position = positionAt(journey, progress.walkedM);
    const next = journey.arrivals[progress.nextIndex] ?? null;
    const travel = headingAhead(journey, progress.walkedM, LOOK_AHEAD_M, next ? next.alongM : journey.totalM);
    const facing = compassHeading ?? travel;
    map.showAstronaut(position.lat, position.lon, facing);
    if (isFollowing) {
      mapHeading = isSnap || prefersReducedMotion || mapHeading === null
        ? facing
        : turnToward(mapHeading, facing, 1 - Math.exp(-elapsedMs / TURN_TIME_MS));
      map.setHeading(mapHeading);
      hud.setNorth(-mapHeading);
      map.keepCentred(position.lat, position.lon, insets);
    }
    if (!isStatusDue) return;
    lastStatusAt = now;
    const metresToGo = next ? next.alongM - progress.walkedM : 0;
    hud.setStatus({
      nextName: next ? next.name : null,
      metresToGo,
      minutesToGo: metresToGo / metresPerMs / 60_000,
      facingFrom: compassHeading === null ? 'travel' : 'compass',
      enlargement: map.imageryEnlargement(),
    });
    hud.setControls(isPlaying, SPEEDS[speedIndex]);
    if (drill) showWeather();
  }

  /** @param {import('./journey-model.js').Arrival} arrival */
  function arrive(arrival) {
    if (!plan) return;
    isPlaying = false;
    showLeg();
    const stop = plan.stops.find((item) => item.id === arrival.stopId);
    hud.dialogs.showArrival(arrival, stop, plan.stops.length, () => {
      if (arrival.isFinish) { end(); return; }
      isPlaying = true;
      render(0);
    });
  }

  /** @param {number} now performance.now() */
  function tick(now) {
    if (!journey) return;
    const elapsedMs = Math.min(now - lastTime, MAX_FRAME_MS);
    lastTime = now;
    const speed = SPEEDS[speedIndex];
    simulatedMs += elapsedMs * speed;
    if (drill && simulatedMs >= drill.endsAtMs) { drill = null; showWeather(); }
    if (isPlaying && !hud.dialogs.isOpen()) {
      const step = walkOn(journey, progress, elapsedMs * metresPerMs * speed);
      progress = { walkedM: step.walkedM, nextIndex: step.nextIndex };
      if (step.arrival) arrive(step.arrival);
    }
    render(elapsedMs);
    schedule();
  }

  function schedule() {
    if (!journey) return;
    if (prefersReducedMotion) frame = window.setTimeout(() => tick(performance.now()), STEP_MS);
    else frame = window.requestAnimationFrame(tick);
  }

  function showWeather() {
    if (!drill) { hud.setWeather(weather.current()); return; }
    const minutesLeft = Math.max(0, (drill.endsAtMs - simulatedMs) / 60_000);
    hud.setWeather({
      level: drill.drill.level,
      text: `${drill.drill.title}. ${drill.drill.text}`,
      source: 'drill',
      asOf: `Drill ends in ${formatDuration(Math.ceil(minutesLeft))} (simulated time)`,
    });
  }

  /** Play a random simulated alert. A no-go alert pauses the walk, as a real one would. */
  function startDrill() {
    const next = weather.drill();
    const isPausing = isPlaying && next.level === 'no-go';
    if (isPausing) isPlaying = false;
    drill = { drill: next, endsAtMs: simulatedMs + next.durationMinutes * 60_000 };
    showWeather();
    hud.dialogs.showDrill(next, isPausing, () => render(0));
    render(0);
  }

  function askToEnd() {
    if (!journey || hud.dialogs.isOpen()) return;
    hud.dialogs.askToEnd(() => end(), () => render(0));
  }

  /** @param {KeyboardEvent} event */
  function onKey(event) {
    // Escape asks, like the End button; it never ends the walk at once.
    if (event.key === 'Escape' && !hud.dialogs.isOpen()) askToEnd();
  }

  function onResize() {
    map.resize();
    render(0, true);
  }

  /** @param {Plan} nextPlan */
  async function begin(nextPlan) {
    if (journey || nextPlan.sections.length === 0) return;
    returnFocusTo = document.activeElement;
    plan = nextPlan;
    journey = buildJourney(nextPlan);
    progress = { walkedM: 0, nextIndex: 0 };
    isPlaying = true;
    compassHeading = null;
    mapHeading = null;
    simulatedMs = 0;
    drill = null;
    isFollowing = true;
    hud.setFollowing(true);
    document.body.classList.add('is-journey');
    map.setJourneyView(true);
    const start = positionAt(journey, 0);
    map.follow(start.lat, start.lon, WALK_ZOOM, false);
    showLeg();
    hud.setShown(true);
    showWeather();
    weather.refresh().then(showWeather, showWeather);
    weatherTimer = window.setInterval(() => { weather.refresh().then(showWeather, showWeather); }, WEATHER_REFRESH_MS);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    render(0, true);
    lastTime = performance.now();
    schedule();
    stopCompass = await startCompass((heading) => { compassHeading = heading; });
  }

  function end() {
    if (!journey) return;
    journey = null;
    plan = null;
    drill = null;
    if (frame !== null) { window.cancelAnimationFrame(frame); window.clearTimeout(frame); }
    if (weatherTimer !== null) window.clearInterval(weatherTimer);
    stopCompass?.();
    stopCompass = null;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    hud.setShown(false);
    map.hideAstronaut();
    document.body.classList.remove('is-journey');
    map.setJourneyView(false);
    onEnd();
    if (returnFocusTo instanceof HTMLElement) returnFocusTo.focus();
  }

  return { begin, isActive: () => journey !== null };
}
