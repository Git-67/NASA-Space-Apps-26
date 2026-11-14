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
 * - A warning shows (and sounds) about 30 m before steep ground or a sandy
 *   hollow, with the distance counting down, until the walker is past it.
 * - "Visor view" swaps the panels for a simulated helmet visor (visor-view.js).
 *   The visor never asks for input: a stop reached, an alert or the end of
 *   the walk show as read-only notices at its edge. At a stop the walk waits;
 *   Walk (outside the visor) carries on. Ticking tasks, finishing and ending
 *   the walk happen in the map view, where the task pop-up appears again.
 * - Soft sound cues (lib/sound.js) mark arrivals, submitted tasks, the end of
 *   the walk, and changes in the space weather level; each goes with
 *   something on screen, and sound can be muted.
 * The walker faces the way the device's compass points, where it has one,
 * or else the direction of travel.
 *
 * SIMULATION: there is no real astronaut position; the overlay says so.
 */
import { startCompass } from '../../lib/compass.js';
import { playCue, unlockSound } from '../../lib/sound.js';
import { formatDuration, greatCircleM } from '../../lib/mars.js';
import { bearingDeg, buildJourney, hazardsWithin, headingAhead, positionAt, turnToward, walkOn } from './journey-model.js';
import { createJourneyHud } from './journey-hud.js';

/** @typedef {import('../plan/plan-model.js').Plan} Plan */
/** @typedef {import('../map/map-view.js').MapViewApi} MapViewApi */
/** @typedef {import('./journey-hud.js').WeatherSummary} WeatherSummary */
/** @typedef {import('../conditions/space-weather-drill.js').Drill} Drill */

/** How much faster than real walking the simulation runs; the button cycles through these. */
const SPEEDS = [60, 120, 30];
/** Zoom while walking: one step past the sharpest real imagery (HiRISE, zoom 16), so the ground near the walker is large. */
const WALK_ZOOM = 17;
/** Zoom of the visor's minimap: about 100 m across, close enough to see the ground near the walker. */
const MINIMAP_ZOOM = 16;
/** Under reduced motion, the walker moves in steps this far apart in time, in milliseconds. */
const STEP_MS = 1000;
/**
 * Shortest time between drawn frames, in milliseconds: about 30 a second. Moving and turning a
 * screen-sized map is the heaviest work on a tablet; half the frames halves it, and a walker
 * moves at most a few pixels between frames, which still looks smooth.
 */
const FRAME_MS = 33;
/** Longest time one frame may advance the walk, in milliseconds: after the tab was hidden, the walker must not jump past stops. */
const MAX_FRAME_MS = 1500;
/** The status text changes at most this often, in milliseconds: no need to rewrite it every frame. */
const STATUS_EVERY_MS = 250;
/** How often live space weather is read again during a walk, in milliseconds (15 minutes). */
const WEATHER_REFRESH_MS = 15 * 60 * 1000;
/** The map's heading looks this far ahead along the path, in metres, so it does not swing at every small bend. */
const LOOK_AHEAD_M = 25;
/** Warn of a hazard (steep ground, sand) this many metres before it: about a minute's walk at 2 km/h. */
const HAZARD_WARN_M = 30;
/** A simulated alert's notice on the visor clears itself after this long, in milliseconds. */
const VISOR_NOTICE_MS = 8000;
/** At most this many of a stop's tasks are listed on the visor; the map view lists all. */
const VISOR_TASK_COUNT = 2;
/** Keep the warning shown until this many metres past the hazard's start... */
const HAZARD_CLEAR_M = 10;
/** ...and for at least this long in real time, in milliseconds: sped up, a walker passes 30 m in a second. */
const HAZARD_MIN_SHOW_MS = 4000;
/** The map turns most of the way to a new heading in about this long, in milliseconds. */
const TURN_TIME_MS = 600;
/** The walker's cone turns most of the way to a new heading in about this long, in milliseconds. */
const FACING_TIME_MS = 250;

/**
 * Set up journey mode.
 * @param {object} options
 * @param {MapViewApi} options.map
 * @param {number} options.walkingSpeedKmh Real walking pace to simulate.
 * @param {{ current: () => WeatherSummary, refresh: () => Promise<void>, drill: () => Drill }} options.weather
 *   Space weather for now, how to read it again, and how to draw a simulated alert.
 * @param {{ outMinutes: number, baseM: number }} options.limits NASA's longest walk (minutes) and farthest
 *   straight-line distance from base (metres), shown on the visor's gauges.
 * @param {() => void} options.onEnd Called after the journey closes, so the page can redraw its own view.
 * @returns {{ begin: (plan: Plan) => Promise<void>, isActive: () => boolean }}
 */
export function createJourneyMode({ map, walkingSpeedKmh, weather, limits, onEnd }) {
  const metresPerMs = (walkingSpeedKmh * 1000) / 3_600_000;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** @type {ReturnType<typeof buildJourney> | null} */
  let journey = null;
  /** @type {Plan | null} */
  let plan = null;
  /** Metres walked, and the index of the next stop not yet reached. */
  let progress = { walkedM: 0, nextIndex: 0 };
  /** Hazards warned about so far (journey.hazards, in walking order), and the one shown now. */
  let hazardsWarned = 0;
  /** @type {import('./journey-model.js').Hazard | null} */
  let shownHazard = null;
  /** When the shown hazard may be cleared, from performance.now(). */
  let hazardShownUntil = 0;
  let isPlaying = false;
  let speedIndex = 0;
  /** @type {number | null} */
  let compassHeading = null;
  /** Heading the map is turned to (compass degrees); eases towards the walker's. */
  let mapHeading = /** @type {number | null} */ (null);
  /** Heading the walker's cone shows (compass degrees); eases towards the compass or the path. */
  let facingDeg = /** @type {number | null} */ (null);
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
  let isVisor = false;
  /** @type {WeatherSummary | null} The space weather last shown, for the visor and for alert sounds. */
  let shownWeather = null;
  /**
   * A stop reached whose tasks are not yet submitted. The walk waits while there is one. In the map
   * view its pop-up is open; in the visor, a notice shows instead, until the walker goes on.
   * @type {{ arrival: import('./journey-model.js').Arrival, stop: import('../plan/plan-model.js').Stop | undefined } | null}
   */
  let pendingArrival = null;
  /** @type {number | null} Clears a drill's notice on the visor. */
  let noticeTimer = null;

  const hud = createJourneyHud({
    onEnd: () => askToEnd(),
    onTogglePlay: () => {
      // In the visor, Walk at a stop means "done here, go on": the visor asks for nothing else.
      if (pendingArrival && isVisor) { if (!pendingArrival.arrival.isFinish) finishStop(); return; }
      isPlaying = !isPlaying;
      render(0);
    },
    onSpeed: () => { speedIndex = (speedIndex + 1) % SPEEDS.length; render(0); },
    onRecentre: () => { isFollowing = true; hud.setFollowing(true); render(0, true); },
    onDrill: () => startDrill(),
    onVisor: () => toggleVisor(),
  });

  /** Switch between the map view and the visor; a stop's tasks move to wherever fits. */
  function toggleVisor() {
    if (!journey) return;
    isVisor = !isVisor;
    // The visor asks for nothing: an open pop-up closes, and a stop's tasks wait for the map view.
    if (isVisor) hud.dialogs.close();
    hud.setVisor(isVisor);
    clearNotice();
    map.resize();
    const here = positionAt(journey, progress.walkedM);
    map.follow(here.lat, here.lon, isVisor ? MINIMAP_ZOOM : WALK_ZOOM, false);
    isFollowing = true;
    hud.setFollowing(true);
    presentArrival();
    render(0, true);
  }
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
    const wanted = compassHeading ?? travel;
    // Eased, like the map's turn: a compass jitters, and the path's direction jumps at sharp bends.
    facingDeg = isSnap || prefersReducedMotion || facingDeg === null
      ? wanted
      : turnToward(facingDeg, wanted, 1 - Math.exp(-elapsedMs / FACING_TIME_MS));
    const facing = facingDeg;
    map.showAstronaut(position.lat, position.lon, facing);
    if (isFollowing) {
      mapHeading = isSnap || prefersReducedMotion || mapHeading === null
        ? facing
        : turnToward(mapHeading, facing, 1 - Math.exp(-elapsedMs / TURN_TIME_MS));
      map.setHeading(mapHeading);
      hud.setNorth(-mapHeading);
      map.keepCentred(position.lat, position.lon, insets);
    }
    if (isVisor) {
      const nextPlace = next ? positionAt(journey, next.alongM) : null;
      hud.visor.setHeading(mapHeading ?? facing, nextPlace ? bearingDeg(position.lat, position.lon, nextPlace.lat, nextPlace.lon) : null);
    }
    if (!isStatusDue) return;
    lastStatusAt = now;
    updateHazard();
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
    if (isVisor && shownWeather) {
      const start = journey.points[0];
      hud.visor.setPlaying(isPlaying);
      hud.visor.setStatus({
        nextName: next ? next.name : null,
        metresToGo,
        minutesToGo: metresToGo / metresPerMs / 60_000,
        weather: shownWeather,
        outMinutes: simulatedMs / 60_000,
        outLimitMinutes: limits.outMinutes,
        baseM: greatCircleM(position.lat, position.lon, start.lat, start.lon),
        baseLimitM: limits.baseM,
      });
    }
  }

  /** @param {import('./journey-model.js').Arrival} arrival */
  function arrive(arrival) {
    if (!plan) return;
    isPlaying = false;
    showLeg();
    const stop = plan.stops.find((item) => item.id === arrival.stopId);
    playCue(arrival.isFinish ? 'complete' : 'arrival');
    pendingArrival = { arrival, stop };
    presentArrival();
  }

  /** Show the stop waiting for its tasks: the pop-up in the map view, a read-only notice in the visor. */
  function presentArrival() {
    if (!pendingArrival || !plan) return;
    const { arrival, stop } = pendingArrival;
    if (!isVisor) {
      hud.visor.setNotice(null);
      hud.dialogs.showArrival(arrival, stop, plan.stops.length, () => {
        if (arrival.isFinish) { end(); return; }
        finishStop();
      });
      return;
    }
    if (arrival.isFinish || !stop) {
      hud.visor.setNotice({ eyebrow: 'BACK AT THE START', title: 'Walk complete', lines: ['Stow the samples.', 'Check in with the habitat.', 'Map view to finish'] });
      return;
    }
    const tasks = stop.tasksOurs.slice(0, VISOR_TASK_COUNT).map((task) => `· ${task}`);
    const more = stop.tasksOurs.length - VISOR_TASK_COUNT;
    hud.visor.setNotice({
      eyebrow: `ARRIVED · STOP ${arrival.visitNumber} OF ${plan.stops.length}`,
      title: arrival.name,
      lines: [...tasks, ...(more > 0 ? [`+${more} more in map view`] : []), 'Walk to go on'],
    });
  }

  /** A stop's work is done: walk on to the next. */
  function finishStop() {
    pendingArrival = null;
    hud.visor.setNotice(null);
    playCue('submitted');
    isPlaying = true;
    render(0);
  }

  function clearNotice() {
    if (noticeTimer !== null) window.clearTimeout(noticeTimer);
    noticeTimer = null;
    hud.visor.setNotice(null);
  }

  /** @param {number} now performance.now() */
  function tick(now) {
    if (!journey) return;
    if (now - lastTime < FRAME_MS) { schedule(); return; }
    const elapsedMs = Math.min(now - lastTime, MAX_FRAME_MS);
    lastTime = now;
    const speed = SPEEDS[speedIndex];
    simulatedMs += elapsedMs * speed;
    if (drill && simulatedMs >= drill.endsAtMs) { drill = null; showWeather(); }
    if (isPlaying && !pendingArrival && !hud.dialogs.isOpen()) {
      const step = walkOn(journey, progress, elapsedMs * metresPerMs * speed);
      progress = { walkedM: step.walkedM, nextIndex: step.nextIndex };
      const warned = hazardsWithin(journey, hazardsWarned, progress.walkedM, HAZARD_WARN_M);
      if (warned > hazardsWarned) {
        // The nearest new one is shown; several at once (a steep stretch into a sandy stop) sound once.
        shownHazard = journey.hazards[warned - 1];
        hazardShownUntil = performance.now() + HAZARD_MIN_SHOW_MS;
        hazardsWarned = warned;
        playCue('hazard');
      }
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
    const previousLevel = shownWeather?.level ?? null;
    shownWeather = drill ? drillSummary(drill) : weather.current();
    // A sound when the level changes during the walk (not for the first reading).
    if (previousLevel !== null && shownWeather.level !== previousLevel) {
      if (shownWeather.level === 'no-go' || shownWeather.level === 'caution') playCue(shownWeather.level);
      else if (shownWeather.level === 'go') playCue('clear');
    }
    hud.setWeather(shownWeather);
  }

  /**
   * @param {{ drill: Drill, endsAtMs: number }} active
   * @returns {WeatherSummary}
   */
  function drillSummary({ drill: current, endsAtMs }) {
    const minutesLeft = Math.max(0, (endsAtMs - simulatedMs) / 60_000);
    return {
      level: current.level,
      text: `${current.title}. ${current.text}`,
      source: 'drill',
      asOf: `Drill ends in ${formatDuration(Math.ceil(minutesLeft))} (simulated time)`,
    };
  }

  /** Play a random simulated alert. A no-go alert pauses the walk, as a real one would. */
  /** Show the hazard just ahead with its distance, or clear it once passed. */
  function updateHazard() {
    const isPassed = shownHazard && progress.walkedM > shownHazard.alongM + HAZARD_CLEAR_M;
    if (isPassed && performance.now() >= hazardShownUntil) shownHazard = null;
    if (!shownHazard) { hud.setHazard(null); return; }
    const metres = Math.round(shownHazard.alongM - progress.walkedM);
    hud.setHazard(metres > 0 ? `${shownHazard.text} in ${metres} m` : isPassed ? `${shownHazard.text} · passed` : `${shownHazard.text} · here`);
  }

  function startDrill() {
    // Not over a stop's tasks or the end checks: an alert would replace them.
    if (hud.dialogs.isOpen() || pendingArrival) return;
    const next = weather.drill();
    const isPausing = isPlaying && next.level === 'no-go';
    if (isPausing) isPlaying = false;
    drill = { drill: next, endsAtMs: simulatedMs + next.durationMinutes * 60_000 };
    const levelBefore = shownWeather?.level;
    showWeather();
    // showWeather sounds only a change of level; a second alert of the same level still sounds.
    if (levelBefore === next.level) playCue(next.level);
    if (isVisor) {
      // Read-only on the visor, clearing itself; the weather readout keeps the level and countdown.
      clearNotice();
      // The weather readout above already names the event; the notice gives the rule's message and advice.
      const [message, ...advice] = next.text.split('. ').map((sentence) => sentence.replace(/\.$/, ''));
      hud.visor.setNotice({
        eyebrow: 'SIMULATED ALERT · DRILL',
        title: message,
        lines: [...advice, ...(isPausing ? ['Walk paused · Walk to go on'] : [])],
      });
      noticeTimer = window.setTimeout(clearNotice, VISOR_NOTICE_MS);
    } else {
      hud.dialogs.showDrill(next, isPausing, () => render(0));
    }
    render(0);
  }

  function askToEnd() {
    if (!journey || hud.dialogs.isOpen()) return;
    // The checks need input, so they happen in the map view.
    if (isVisor) toggleVisor();
    if (hud.dialogs.isOpen()) return; // a stop's tasks came back first
    hud.dialogs.askToEnd(() => { playCue('ended'); end(); }, () => render(0));
  }

  /** @param {KeyboardEvent} event */
  function onKey(event) {
    // Escape asks, like the End button; it never ends the walk at once.
    if (event.key === 'Escape' && !hud.dialogs.isOpen()) askToEnd();
  }

  function onResize() {
    hud.placeMinimap();
    map.resize();
    render(0, true);
  }

  /** @param {Plan} nextPlan */
  async function begin(nextPlan) {
    if (journey || nextPlan.sections.length === 0) return;
    returnFocusTo = document.activeElement;
    unlockSound(); // begin() runs from the "Begin journey" press: the one moment browsers allow sound to start
    shownWeather = null;
    plan = nextPlan;
    journey = buildJourney(nextPlan);
    progress = { walkedM: 0, nextIndex: 0 };
    pendingArrival = null;
    hazardsWarned = 0;
    shownHazard = null;
    isPlaying = true;
    compassHeading = null;
    mapHeading = null;
    facingDeg = null;
    simulatedMs = 0;
    drill = null;
    isVisor = false;
    hud.setVisor(false);
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
    pendingArrival = null;
    clearNotice();
    if (frame !== null) { window.cancelAnimationFrame(frame); window.clearTimeout(frame); }
    if (weatherTimer !== null) window.clearInterval(weatherTimer);
    stopCompass?.();
    stopCompass = null;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    isVisor = false;
    hud.setVisor(false);
    hud.setShown(false);
    map.hideAstronaut();
    document.body.classList.remove('is-journey');
    map.setJourneyView(false);
    onEnd();
    if (returnFocusTo instanceof HTMLElement) returnFocusTo.focus();
  }

  return { begin, isActive: () => journey !== null };
}
