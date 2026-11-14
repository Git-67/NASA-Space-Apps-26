// @ts-check
/**
 * Pure logic for "Begin journey": the planned walk as one line from start to
 * end, where a walker is after a given distance, which way they are going,
 * and which stop they reach next.
 *
 * Input: a plan from plan-model.js. Its legs follow the safest paths over
 * rover-driven ground (data/processed/safe_paths.json), as [lat, lon] in
 * degrees. Distances here are great-circle metres on Mars' mean radius.
 *
 * This is a SIMULATION of a walk along the plan. There is no real astronaut
 * position: the page labels it as such.
 */
import { greatCircleM } from '../../lib/mars.js';

/** @typedef {import('../plan/plan-model.js').Plan} Plan */
/**
 * @typedef {object} JourneyPoint
 * @property {number} lat Degrees.
 * @property {number} lon Degrees.
 * @property {number} alongM Metres walked from the start to this point.
 */
/**
 * @typedef {object} Arrival A stop reached during the walk.
 * @property {string} stopId
 * @property {string} name
 * @property {number} alongM Metres walked when it is reached.
 * @property {number} visitNumber Place in the visiting order; the start is 1.
 * @property {boolean} isFinish Whether this is the return to the start.
 */
/** @typedef {{ points: JourneyPoint[], totalM: number, arrivals: Arrival[] }} Journey */

/**
 * Join a plan's legs, return included, into one line with distances along it.
 * @param {Plan} plan
 * @returns {Journey}
 */
export function buildJourney(plan) {
  /** @type {JourneyPoint[]} */
  const points = [];
  /** @type {Arrival[]} */
  const arrivals = [];
  let alongM = 0;
  plan.sections.forEach((section, index) => {
    const line = section.path.runs.flatMap((run, runIndex) => (runIndex === 0 ? run.points : run.points.slice(1)));
    line.forEach(([lat, lon], pointIndex) => {
      const previous = points[points.length - 1];
      if (previous && pointIndex === 0) return; // each leg starts where the last one ended
      if (previous) alongM += greatCircleM(previous.lat, previous.lon, lat, lon);
      points.push({ lat, lon, alongM });
    });
    arrivals.push({ stopId: section.toId, name: section.toName, alongM, visitNumber: index + 2, isFinish: section.isReturn });
  });
  return { points, totalM: alongM, arrivals };
}

/**
 * Compass bearing from one point to another: 0 is north, 90 east (clockwise).
 * @param {number} latA
 * @param {number} lonA
 * @param {number} latB
 * @param {number} lonB
 * @returns {number} Degrees, 0 to 360.
 */
export function bearingDeg(latA, lonA, latB, lonB) {
  const rad = Math.PI / 180;
  const y = Math.sin((lonB - lonA) * rad) * Math.cos(latB * rad);
  const x = Math.cos(latA * rad) * Math.sin(latB * rad) - Math.sin(latA * rad) * Math.cos(latB * rad) * Math.cos((lonB - lonA) * rad);
  return ((Math.atan2(y, x) / rad) + 360) % 360;
}

/**
 * Where the walker is after walking a distance, and which way they are going.
 * @param {Journey} journey
 * @param {number} alongM Metres walked; clamped to the walk.
 * @returns {{ lat: number, lon: number, headingDeg: number }} headingDeg is the direction of travel, compass degrees.
 */
export function positionAt(journey, alongM) {
  const { points } = journey;
  const target = Math.min(Math.max(alongM, 0), journey.totalM);
  let low = 0;
  let high = points.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (points[middle].alongM <= target) low = middle;
    else high = middle;
  }
  const a = points[low];
  const b = points[high];
  const span = b.alongM - a.alongM;
  const share = span === 0 ? 0 : (target - a.alongM) / span;
  return {
    lat: a.lat + (b.lat - a.lat) * share,
    lon: a.lon + (b.lon - a.lon) * share,
    headingDeg: bearingDeg(a.lat, a.lon, b.lat, b.lon),
  };
}

/**
 * The first stop not yet reached.
 * @param {Journey} journey
 * @param {number} alongM Metres walked.
 * @returns {Arrival | null} Null when the walk is over.
 */
export function nextArrival(journey, alongM) {
  return journey.arrivals.find((arrival) => arrival.alongM > alongM) ?? null;
}
