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

/** Closer than this, in metres, two points give no reliable direction; the current segment's is used. */
const MIN_LOOK_AHEAD_M = 1;

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
/**
 * @typedef {object} Hazard A harder place on the walk, to warn the walker about before they reach it.
 * @property {'steep' | 'sand'} kind Steep: a stretch the plan rates moderate or hard (from the rover's
 *   tilt there). Sand: a stop in a sandy hollow, where boots can slip.
 * @property {string} text Short, for a visor: "Steep ground (hard)", "Sand: slippery".
 * @property {number} alongM Metres walked when it is reached.
 */
/** @typedef {{ points: JourneyPoint[], totalM: number, arrivals: Arrival[], hazards: Hazard[] }} Journey */

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
  /** @type {Hazard[]} */
  const hazards = [];
  let alongM = 0;
  plan.sections.forEach((section, index) => {
    for (const run of section.path.runs) {
      if (run.difficulty !== 'easier') hazards.push({ kind: 'steep', text: `Steep ground (${run.difficulty})`, alongM });
      run.points.forEach(([lat, lon], pointIndex) => {
        const previous = points[points.length - 1];
        if (previous && pointIndex === 0) return; // each stretch starts where the last one ended
        if (previous) alongM += greatCircleM(previous.lat, previous.lon, lat, lon);
        points.push({ lat, lon, alongM });
      });
    }
    const stop = plan.stops.find((item) => item.id === section.toId);
    if (stop?.terrain === 'hollow' && !section.isReturn) hazards.push({ kind: 'sand', text: 'Sand: slippery', alongM });
    arrivals.push({ stopId: section.toId, name: section.toName, alongM, visitNumber: index + 2, isFinish: section.isReturn });
  });
  return { points, totalM: alongM, arrivals, hazards };
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
 * Walk on by some distance, stopping at the next stop not yet reached.
 * Each stop is returned exactly once, in order, even when two stops lie at the
 * same distance along the walk (the walk then stops at each in turn).
 * @param {Journey} journey
 * @param {{ walkedM: number, nextIndex: number }} progress Metres walked, and the index in
 *   journey.arrivals of the next stop not yet reached.
 * @param {number} metres How far to walk on (not negative).
 * @returns {{ walkedM: number, nextIndex: number, arrival: Arrival | null }} The new progress, and the
 *   stop reached on the way, if any.
 */
export function walkOn(journey, progress, metres) {
  const next = journey.arrivals[progress.nextIndex];
  const walkedM = Math.min(progress.walkedM + metres, journey.totalM);
  if (!next || walkedM < next.alongM) return { walkedM, nextIndex: progress.nextIndex, arrival: null };
  return { walkedM: next.alongM, nextIndex: progress.nextIndex + 1, arrival: next };
}

/**
 * The direction of travel, looking a little ahead so the map does not swing at
 * every small bend of the rover's track. The look stops at the next stop, so
 * the map does not turn early towards the leg after it.
 * @param {Journey} journey
 * @param {number} alongM Metres walked.
 * @param {number} aheadM How far ahead to look, in metres.
 * @param {number} limitM Look no further than this distance along the walk (the next stop).
 * @returns {number} Compass degrees, 0 north, clockwise.
 */
export function headingAhead(journey, alongM, aheadM, limitM) {
  const here = positionAt(journey, alongM);
  const targetM = Math.min(alongM + aheadM, limitM, journey.totalM);
  if (targetM - alongM < MIN_LOOK_AHEAD_M) return here.headingDeg;
  const there = positionAt(journey, targetM);
  return bearingDeg(here.lat, here.lon, there.lat, there.lon);
}

/**
 * Turn part of the way from one heading towards another, the short way round.
 * @param {number} currentDeg Compass degrees.
 * @param {number} targetDeg Compass degrees.
 * @param {number} share How much of the turn to make, 0 (none) to 1 (all of it).
 * @returns {number} Compass degrees, 0 to 360.
 */
export function turnToward(currentDeg, targetDeg, share) {
  const difference = ((((targetDeg - currentDeg) % 360) + 540) % 360) - 180;
  return (((currentDeg + difference * share) % 360) + 360) % 360;
}

/**
 * How many hazards the walker has been warned about: every hazard from `warnedCount` on that is now
 * within the warning distance ahead (or already passed). Hazards are in walking order.
 * @param {Journey} journey
 * @param {number} warnedCount Hazards warned about so far.
 * @param {number} walkedM Metres walked.
 * @param {number} warnM Warn this many metres before a hazard.
 * @returns {number} The new count; the hazards from `warnedCount` up to it are the ones to warn about now.
 */
export function hazardsWithin(journey, warnedCount, walkedM, warnM) {
  let count = warnedCount;
  while (count < journey.hazards.length && journey.hazards[count].alongM - walkedM <= warnM) count += 1;
  return count;
}
