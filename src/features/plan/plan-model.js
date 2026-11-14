// @ts-check
/**
 * Pure planning logic: turns Curiosity's path and the stops a visitor selects
 * into walking sections with distance, climb, time and difficulty.
 *
 * Dataset: data/processed/route.json (Curiosity waypoints, NASA/JPL-Caltech).
 * Distances are in metres, elevations in metres, tilt in degrees.
 * Everything returned here is DERIVED, and the times rest on assumptions
 * that the interface must show next to the numbers.
 */

/**
 * @typedef {{ sol: number, lat: number, lon: number, elevationM: number, tiltDeg: number, alongM: number,
 *   track: number[][] }} RoutePoint `track` is the path the rover drove from the previous point, as [lat, lon] pairs.
 * @typedef {{ id: string, name: string, summary: string, terrain: 'transition' | 'ridge' | 'hollow', found: string,
 *   taskOurs: string, kitOurs: string[], workMinutesOurs: number, sourceLabel: string, sourceUrl: string,
 *   pointIndex: number }} Stop
 * @typedef {{ points: RoutePoint[], stops: Stop[] }} Route
 * @typedef {'easier' | 'moderate' | 'hard'} Difficulty
 * @typedef {{ fromId: string, toId: string, fromName: string, toName: string, fromIndex: number, toIndex: number,
 *   distanceM: number, ascentM: number, descentM: number, maxRoverTiltDeg: number, difficulty: Difficulty,
 *   walkMinutes: number, isReturn: boolean }} Section `fromIndex` and `toIndex` are route point indexes, in walking direction.
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
 * Measure the rover's path between two points.
 * @param {RoutePoint[]} points The whole path.
 * @param {number} fromIndex Index of the first point.
 * @param {number} toIndex Index of the last point (must not be before fromIndex).
 * @returns {{ distanceM: number, ascentM: number, descentM: number, maxRoverTiltDeg: number }}
 */
export function measurePath(points, fromIndex, toIndex) {
  let ascentM = 0;
  let descentM = 0;
  let maxRoverTiltDeg = points[fromIndex].tiltDeg;
  for (let i = fromIndex + 1; i <= toIndex; i += 1) {
    const change = points[i].elevationM - points[i - 1].elevationM;
    if (change > 0) ascentM += change;
    else descentM -= change;
    maxRoverTiltDeg = Math.max(maxRoverTiltDeg, points[i].tiltDeg);
  }
  return { distanceM: points[toIndex].alongM - points[fromIndex].alongM, ascentM, descentM, maxRoverTiltDeg };
}

/**
 * Measure one section in walking direction, which may run against the rover's direction.
 * Walking the rover's path backwards turns every climb into a descent and the reverse.
 * @param {RoutePoint[]} points The whole path.
 * @param {number} fromIndex Point the walker starts from.
 * @param {number} toIndex Point the walker walks to.
 * @returns {{ distanceM: number, ascentM: number, descentM: number, maxRoverTiltDeg: number }}
 */
export function measureLeg(points, fromIndex, toIndex) {
  if (fromIndex <= toIndex) return measurePath(points, fromIndex, toIndex);
  const forward = measurePath(points, toIndex, fromIndex);
  return { ...forward, ascentM: forward.descentM, descentM: forward.ascentM };
}

/**
 * Build a walk along the rover's path that visits the chosen stops in the chosen order.
 * There is no route finding: every section follows Curiosity's own path between
 * two stops, forwards or backwards. The walk starts at the first stop on the
 * route (assumed to be where the crew parks) and returns there at the end.
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
    const measured = measureLeg(route.points, from.pointIndex, to.pointIndex);
    return {
      ...measured,
      fromId: from.id,
      toId: to.id,
      fromName: from.name,
      toName: to.name,
      fromIndex: from.pointIndex,
      toIndex: to.pointIndex,
      difficulty: rateDifficulty(measured.maxRoverTiltDeg),
      walkMinutes: measured.distanceM / metresPerMinute,
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
    title: 'Loose sand between the ridges',
    detail: hollows.length > 0
      ? `This plan enters a sandy hollow at ${hollows.map((stop) => stop.name).join(' and ')}. Keep to the ridgetops between stops.`
      : 'The hollows beside this route are sandy. Keep to the ridgetops.',
    basis: 'NASA/JPL-Caltech release 2026-013: ridgetops were easy to drive, and sand in the hollows could cause wheel slip.',
  });

  const steep = plan.sections.filter((section) => !section.isReturn && section.difficulty !== 'easier');
  if (steep.length > 0) {
    const worst = Math.max(...steep.map((section) => section.maxRoverTiltDeg));
    dangers.push({
      title: 'Steep ground',
      detail: `Curiosity was tilted by up to ${worst.toFixed(1)}° on ${steep.length === 1 ? 'one section' : `${steep.length} sections`} of this plan. Steep sections are marked on the map.`,
      basis: 'Derived from the rover tilt recorded in the Curiosity waypoint file. Tilt hints at slope; it is not a slope measurement.',
    });
  }

  dangers.push({
    title: 'Ridges about as wide as the rover',
    detail: 'The ridges stand 1 to 2 m above the hollows and are not much wider than Curiosity. Watch your footing near the edges.',
    basis: 'NASA/JPL-Caltech release 2026-013.',
  });

  dangers.push({
    title: 'Radiation during a solar storm',
    detail: 'A normal walk adds little dose. A solar particle event is different: do not start a walk while an alert is in effect.',
    basis: 'Published studies report surface dose rates two to three times background during the September 2017 event (Zeitlin et al. 2018; Hassler et al. 2018). Not yet verified by the team against the papers.',
  });

  return dangers;
}

/** Items every walk needs, whatever the stops. Our own suggestion, not a NASA list. */
const BASE_KIT = ['Printed copy of this briefing', 'Spare sample bags', 'Marker flags for the return route'];

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
