// @ts-check
/**
 * Pure planning logic: turns the stops a visitor selects into walking sections
 * with distance, climb, time and difficulty.
 *
 * Datasets: data/processed/route.json (stops at Curiosity waypoints) and
 * data/processed/safe_paths.json (the safest path between each pair of stops,
 * over ground Curiosity drove; see scripts/safe_paths.py).
 * Distances are in metres, elevations in metres, tilt in degrees.
 * Everything returned here is DERIVED, and the times rest on assumptions
 * that the interface must show next to the numbers.
 */

/**
 * @typedef {{ sol: number, lat: number, lon: number, elevationM: number, tiltDeg: number, alongM: number }} RoutePoint
 * @typedef {{ id: string, name: string, summary: string, terrain: 'transition' | 'ridge' | 'hollow', found: string,
 *   tasksOurs: string[], kitOurs: string[], workMinutesOurs: number, sourceLabel: string, sourceUrl: string,
 *   pointIndex: number }} Stop
 * @typedef {'easier' | 'moderate' | 'hard'} Difficulty
 * @typedef {{ difficulty: Difficulty, points: number[][] }} PathRun A stretch of one difficulty, as [lat, lon] pairs.
 * @typedef {{ distanceM: number, ascentM: number, descentM: number, costM: number, maxTiltDeg: number,
 *   steepest: number[], middle: number[], runs: PathRun[], profile: number[][] }} SafePath
 *   One safest path, in walking direction. `profile` is [metres walked, elevation m] pairs; `costM` is
 *   length weighted by difficulty (scripts/safe_paths.py).
 * @typedef {{ points: RoutePoint[], stops: Stop[], safePaths: Record<string, SafePath> }} Route
 *   `safePaths` is keyed "fromId|toId", stored for one direction of each pair.
 * @typedef {{ fromId: string, toId: string, fromName: string, toName: string, path: SafePath,
 *   distanceM: number, ascentM: number, descentM: number, maxRoverTiltDeg: number, difficulty: Difficulty,
 *   walkMinutes: number, isReturn: boolean }} Section
 * @typedef {{ stops: Stop[], sections: Section[], walkMinutes: number, workMinutes: number, totalMinutes: number,
 *   distanceM: number, ascentM: number }} Plan
 */

/**
 * Default suited walking speed in km/h.
 * Basis: NASA's Exploration EVA System Concept of Operations (EVA-EXP-0042
 * Rev B, section 4.2.1.3.1) plans lunar traverses at "an ~2 km/hr walking
 * pace over relatively level regolith". That is a LUNAR planning figure:
 * the same document says Mars walk-back ranges are "forward work". So for
 * Mars it is an assumption the visitor can change, not a NASA limit.
 */
export const DEFAULT_WALKING_SPEED_KMH = 2;

/**
 * Rover tilt, in degrees, at which a section is called "hard".
 * Basis: EVA-EXP-0042 Rev B, section 4.2.1.3, lists "walking up/down/across
 * a slope of up to 20 degrees" as a capability of the lunar surface suit.
 * Lunar, not Mars; and we apply it to rover tilt, which only hints at slope.
 */
export const HARD_TILT_DEG = 20;

/** Rover tilt, in degrees, at which a section is called "moderate". Our own choice: half the hard limit. */
export const MODERATE_TILT_DEG = 10;

/**
 * Rate a section from the steepest attitude the rover recorded on it.
 * Rover tilt hints at slope but is not a slope measurement.
 * @param {number} maxRoverTiltDeg Largest rover tilt on the section, in degrees.
 * @returns {Difficulty}
 */
export function rateDifficulty(maxRoverTiltDeg) {
  if (maxRoverTiltDeg >= HARD_TILT_DEG) return 'hard';
  if (maxRoverTiltDeg >= MODERATE_TILT_DEG) return 'moderate';
  return 'easier';
}

/**
 * The safest path between two stops, in walking direction. Paths are stored
 * one way; walking the other way reverses the line and swaps climb and descent.
 * @param {Route} route
 * @param {string} fromId
 * @param {string} toId
 * @returns {SafePath}
 * @throws {Error} When the pair is missing from the prepared file.
 */
export function orientedPath(route, fromId, toId) {
  const forward = route.safePaths[`${fromId}|${toId}`];
  if (forward) return forward;
  const back = route.safePaths[`${toId}|${fromId}`];
  if (!back) throw new Error(`No safe path between ${fromId} and ${toId}. Run scripts/prepare_safe_paths.py again.`);
  return {
    ...back,
    ascentM: back.descentM,
    descentM: back.ascentM,
    runs: back.runs.map((run) => ({ difficulty: run.difficulty, points: [...run.points].reverse() })).reverse(),
    profile: back.profile.map(([walked, height]) => [back.distanceM - walked, height]).reverse(),
  };
}

/**
 * Build a walk that visits the chosen stops in the chosen order, each leg on
 * its safest path. The walk starts at the first stop on the route (assumed to
 * be where the crew parks) and returns there at the end.
 * @param {Route} route The prepared route.
 * @param {string[]} visitOrder Ids of the stops to visit, in visiting order. The start is added if missing and always comes first.
 * @param {number} walkingSpeedKmh Walking speed in km/h. Must be greater than zero.
 * @returns {Plan}
 */
export function buildPlan(route, visitOrder, walkingSpeedKmh) {
  const start = route.stops[0];
  const byId = new Map(route.stops.map((stop) => [stop.id, stop]));
  /** @type {Stop[]} */
  const stops = [start];
  for (const id of visitOrder) {
    const stop = byId.get(id);
    if (stop && !stops.includes(stop)) stops.push(stop);
  }
  const metresPerMinute = (walkingSpeedKmh * 1000) / 60;

  /** @type {(from: Stop, to: Stop, isReturn: boolean) => Section} */
  const section = (from, to, isReturn) => {
    const path = orientedPath(route, from.id, to.id);
    return {
      fromId: from.id,
      toId: to.id,
      fromName: from.name,
      toName: to.name,
      path,
      distanceM: path.distanceM,
      ascentM: path.ascentM,
      descentM: path.descentM,
      maxRoverTiltDeg: path.maxTiltDeg,
      difficulty: rateDifficulty(path.maxTiltDeg),
      walkMinutes: path.distanceM / metresPerMinute,
      isReturn,
    };
  };

  const sections = stops.slice(1).map((stop, index) => section(stops[index], stop, false));
  const last = stops[stops.length - 1];
  if (last !== start) sections.push(section(last, start, true));

  const walkMinutes = sections.reduce((sum, item) => sum + item.walkMinutes, 0);
  const workMinutes = stops.reduce((sum, stop) => sum + stop.workMinutesOurs, 0);
  return {
    stops,
    sections,
    walkMinutes,
    workMinutes,
    totalMinutes: walkMinutes + workMinutes,
    distanceM: sections.reduce((sum, item) => sum + item.distanceM, 0),
    ascentM: sections.reduce((sum, item) => sum + item.ascentM, 0),
  };
}

/**
 * Every ordering of a list.
 * @template T
 * @param {T[]} items
 * @returns {T[][]}
 */
function permutations(items) {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]));
}

/**
 * Total risk of visiting stops in an order and returning to the start: the sum
 * of each leg's difficulty-weighted length (`costM`).
 * @param {Route} route
 * @param {string[]} order Stop ids after the start.
 * @returns {number}
 */
export function planRisk(route, order) {
  const ids = [route.stops[0].id, ...order, route.stops[0].id];
  return ids.slice(1).reduce((sum, id, index) => sum + orientedPath(route, ids[index], id).costM, 0);
}

/**
 * The recommended plan: every stop, in the order with the lowest total risk.
 * Tries every order; with four stops after the start that is 24 orders, which
 * is instant even on a slow computer. Beyond about 8 stops this grows too fast
 * and a smarter search would be needed.
 * @param {Route} route
 * @returns {string[]} Stop ids after the start, in the safest order.
 */
export function recommendedOrder(route) {
  const others = route.stops.slice(1).map((stop) => stop.id);
  return permutations(others).reduce((best, order) => (planRisk(route, order) < planRisk(route, best) ? order : best));
}

/**
 * @typedef {{ title: string, detail: string, basis: string }} Danger
 */

/**
 * List the hazards a walker should expect on this plan.
 * Each entry states its basis, so a reader can tell a NASA finding from our reasoning.
 * @param {Plan} plan The plan to assess.
 * @returns {Danger[]}
 */
export function listDangers(plan) {
  /** @type {Danger[]} */
  const dangers = [];

  const hollows = plan.stops.filter((stop) => stop.terrain === 'hollow');
  dangers.push({
    title: 'Loose sand',
    detail: hollows.length > 0
      ? `You enter a sandy hollow at ${hollows.map((stop) => stop.name).join(' and ')}. Otherwise keep to the ridgetops.`
      : 'The hollows are sandy. Keep to the ridgetops.',
    basis: 'NASA/JPL release 2026-013: sand in the hollows made the rover slip.',
  });

  const steep = plan.sections.filter((section) => !section.isReturn && section.difficulty !== 'easier');
  if (steep.length > 0) {
    const worst = Math.max(...steep.map((section) => section.maxRoverTiltDeg));
    dangers.push({
      title: 'Steep ground',
      detail: `The rover tilted up to ${worst.toFixed(1)}° on ${steep.length === 1 ? 'one leg' : `${steep.length} legs`}. Marked on the map.`,
      basis: 'Derived from Curiosity\'s recorded tilt, a hint at slope, not a measurement.',
    });
  }

  dangers.push({
    title: 'Narrow ridges',
    detail: 'Ridges are 1 to 2 m high and about rover-wide. Watch the edges.',
    basis: 'NASA/JPL release 2026-013.',
  });

  dangers.push({
    title: 'Solar storms',
    detail: 'A normal walk adds little radiation. During a solar storm, stay inside. The verdict checks this for you.',
    basis: 'Studies report 2 to 3 times normal dose in the Sept 2017 storm (Zeitlin 2018; Hassler 2018). Not yet checked by the team.',
  });

  return dangers;
}

/** Items every walk needs, whatever the stops. Our own suggestion, not a NASA list. */
const BASE_KIT = ['This briefing, printed', 'Spare sample bags', 'Marker flags for the way back'];

/**
 * Collect the kit suggested for the selected stops, without repeats.
 * This is the team's suggestion, derived from the task at each stop.
 * @param {Plan} plan The plan to pack for.
 * @returns {{ item: string, forStops: string[] }[]} Each item with the stops that need it. Base items have no stops.
 */
export function listKit(plan) {
  /** @type {Map<string, string[]>} */
  const stopsByItem = new Map(BASE_KIT.map((item) => [item, []]));
  for (const stop of plan.stops) {
    for (const item of stop.kitOurs) {
      stopsByItem.set(item, [...(stopsByItem.get(item) ?? []), stop.name]);
    }
  }
  return [...stopsByItem].map(([item, forStops]) => ({ item, forStops }));
}
