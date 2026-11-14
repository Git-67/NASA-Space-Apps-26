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
 * @typedef {{ sol: number, lat: number, lon: number, elevationM: number, tiltDeg: number, alongM: number }} RoutePoint
 * @typedef {{ id: string, name: string, summary: string, terrain: 'transition' | 'ridge' | 'hollow', found: string,
 *   taskOurs: string, kitOurs: string[], workMinutesOurs: number, sourceLabel: string, sourceUrl: string,
 *   pointIndex: number }} Stop
 * @typedef {{ points: RoutePoint[], stops: Stop[] }} Route
 * @typedef {'easier' | 'moderate' | 'hard'} Difficulty
 * @typedef {{ fromName: string, toName: string, distanceM: number, ascentM: number, descentM: number,
 *   maxRoverTiltDeg: number, difficulty: Difficulty, walkMinutes: number, isReturn: boolean }} Section
 * @typedef {{ stops: Stop[], sections: Section[], walkMinutes: number, workMinutes: number, totalMinutes: number,
 *   distanceM: number, ascentM: number }} Plan
 */

/**
 * Assumed suited walking speed in km/h.
 * Basis: NASA's Exploration EVA concept of operations (EVA-EXP-0042) pairs a
 * 6-hour walk with a 12 km walk-back distance, which is 2 km/h. That figure
 * is not Mars-specific and was taken from a search summary, so it is an
 * ASSUMPTION the visitor can change, not a NASA limit.
 */
export const DEFAULT_WALKING_SPEED_KMH = 2;

/**
 * Rover tilt, in degrees, at which a section is called "hard".
 * Basis: a NASA lunar surface document (EVA-EXP-0075) describes suited
 * walking on slopes of up to 20 degrees. Lunar, not Mars, and unverified.
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
 * Build an out-and-back walk along the rover's path.
 * The walk starts at the first stop on the route (assumed to be where the
 * crew parks), visits the selected stops in order, then returns the same way.
 * @param {Route} route The prepared route.
 * @param {string[]} selectedStopIds Ids of the stops to visit. The first stop is always included.
 * @param {number} walkingSpeedKmh Walking speed in km/h. Must be greater than zero.
 * @returns {Plan}
 */
export function buildPlan(route, selectedStopIds, walkingSpeedKmh) {
  const start = route.stops[0];
  const stops = route.stops.filter((stop) => stop === start || selectedStopIds.includes(stop.id));
  const metresPerMinute = (walkingSpeedKmh * 1000) / 60;

  /** @type {Section[]} */
  const sections = [];
  for (let i = 1; i < stops.length; i += 1) {
    const measured = measurePath(route.points, stops[i - 1].pointIndex, stops[i].pointIndex);
    sections.push({
      ...measured,
      fromName: stops[i - 1].name,
      toName: stops[i].name,
      difficulty: rateDifficulty(measured.maxRoverTiltDeg),
      walkMinutes: measured.distanceM / metresPerMinute,
      isReturn: false,
    });
  }

  const last = stops[stops.length - 1];
  if (last !== start) {
    const out = measurePath(route.points, start.pointIndex, last.pointIndex);
    sections.push({
      distanceM: out.distanceM,
      // Walking back, every climb becomes a descent and the reverse.
      ascentM: out.descentM,
      descentM: out.ascentM,
      maxRoverTiltDeg: out.maxRoverTiltDeg,
      fromName: last.name,
      toName: start.name,
      difficulty: rateDifficulty(out.maxRoverTiltDeg),
      walkMinutes: out.distanceM / metresPerMinute,
      isReturn: true,
    });
  }

  const walkMinutes = sections.reduce((sum, section) => sum + section.walkMinutes, 0);
  const workMinutes = stops.reduce((sum, stop) => sum + stop.workMinutesOurs, 0);
  return {
    stops,
    sections,
    walkMinutes,
    workMinutes,
    totalMinutes: walkMinutes + workMinutes,
    distanceM: sections.reduce((sum, section) => sum + section.distanceM, 0),
    ascentM: sections.reduce((sum, section) => sum + section.ascentM, 0),
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
      detail: `Curiosity was tilted by up to ${worst.toFixed(1)}° on ${steep.length === 1 ? 'one section' : `${steep.length} sections`} of this plan. You climb it going out and descend it coming back.`,
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
