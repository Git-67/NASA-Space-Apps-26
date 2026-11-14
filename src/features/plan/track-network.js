// @ts-check
/**
 * Paths over ground Curiosity drove, found in the browser, for stops chosen on
 * the spot (custom points, daily-mission stops). The same method as
 * scripts/safe_paths.py and scripts/prepare_safe_paths.py, ported line for
 * line, so a path found here matches the one the script would write.
 *
 * Dataset: data/processed/track_network.json (scripts/prepare_safe_paths.py):
 *          drives resampled every 2 m, tracks within 2.8 m joined, ground
 *          steeper than NASA's 20° suit limit (lunar, EVA-EXP-0042) left out.
 * Search:  A*, by distance, guided by the great-circle distance to the goal.
 *          That guess never overstates the distance left and no step is
 *          shorter than the straight line between its ends, so A* returns the
 *          shortest path.
 * Units:   metres and degrees; [lat, lon] as the source gives them; elevation in metres.
 */
import { greatCircleM, MARS_RADIUS_M } from '../../lib/mars.js';

/** @typedef {import('./plan-model.js').SafePath} SafePath */
/** @typedef {import('./plan-model.js').Difficulty} Difficulty */
/**
 * @typedef {object} TrackNetwork
 * @property {number[][]} places [lat, lon, elevation m] of each place.
 * @property {{ to: number, lengthM: number, tiltDeg: number, difficulty: Difficulty }[][]} edges Neighbours of each place.
 */

/** Spacing of the elevation profile, in metres (prepare_safe_paths.py PROFILE_STEP_M). */
const PROFILE_STEP_M = 10;
/** Douglas-Peucker tolerance for drawing, in metres (traverse.py SIMPLIFY_TOLERANCE_M). */
const SIMPLIFY_TOLERANCE_M = 0.25;
/** Decimal places kept for coordinates (prepare_safe_paths.py COORD_DECIMALS). */
const COORD_DECIMALS = 7;

/**
 * Check the prepared network file and turn it into a graph.
 * @param {any} data Parsed track_network.json.
 * @returns {TrackNetwork}
 * @throws {Error} When the file is damaged.
 */
export function parseTrackNetwork(data) {
  const { places, edges } = data ?? {};
  if (!Array.isArray(places) || !Array.isArray(edges) || places.length < 2) {
    throw new Error('The track network file is missing or damaged. Run scripts/prepare_safe_paths.py again.');
  }
  /** @type {TrackNetwork['edges']} */
  const neighbours = places.map(() => []);
  for (const [a, b, tiltDeg, isHarder] of edges) {
    if (!neighbours[a] || !neighbours[b]) throw new Error('The track network file is damaged: an edge names a missing place.');
    const lengthM = greatCircleM(places[a][0], places[a][1], places[b][0], places[b][1]);
    /** @type {Difficulty} */
    const difficulty = isHarder ? 'moderate' : 'easier';
    neighbours[a].push({ to: b, lengthM, tiltDeg, difficulty });
    neighbours[b].push({ to: a, lengthM, tiltDeg, difficulty });
  }
  return { places, edges: neighbours };
}

/**
 * The place closest to a position.
 * @param {TrackNetwork} network
 * @param {number} lat
 * @param {number} lon
 * @returns {{ place: number, distanceM: number }}
 */
export function nearestPlace(network, lat, lon) {
  let best = { place: 0, distanceM: Infinity };
  network.places.forEach(([placeLat, placeLon], place) => {
    const distanceM = greatCircleM(placeLat, placeLon, lat, lon);
    if (distanceM < best.distanceM) best = { place, distanceM };
  });
  return best;
}

/**
 * Shortest path between two places by A*, as (place, tilt of the step into it, difficulty), start first.
 * @param {TrackNetwork} network
 * @param {number} start
 * @param {number} goal
 * @returns {{ place: number, tiltDeg: number, difficulty: Difficulty }[]}
 * @throws {Error} When the two places are not joined by usable ground.
 */
export function findPath(network, start, goal) {
  const straight = (/** @type {number} */ place) => greatCircleM(network.places[place][0], network.places[place][1], network.places[goal][0], network.places[goal][1]);
  /** @type {Map<number, number>} */
  const best = new Map([[start, 0]]);
  /** @type {Map<number, { from: number, tiltDeg: number, difficulty: Difficulty }>} */
  const came = new Map();
  const queue = new MinQueue();
  queue.push(straight(start), 0, start);
  while (queue.size > 0) {
    const [, cost, place] = /** @type {[number, number, number]} */ (queue.pop());
    if (cost > /** @type {number} */ (best.get(place))) continue;
    if (place === goal) break;
    for (const edge of network.edges[place]) {
      const next = cost + edge.lengthM;
      if (next < (best.get(edge.to) ?? Infinity)) {
        best.set(edge.to, next);
        came.set(edge.to, { from: place, tiltDeg: edge.tiltDeg, difficulty: edge.difficulty });
        queue.push(next + straight(edge.to), next, edge.to);
      }
    }
  }
  if (!best.has(goal)) throw new Error('These two points are not joined by ground Curiosity drove.');
  const path = [];
  for (let place = goal; ; place = /** @type {{ from: number }} */ (came.get(place)).from) {
    const step = came.get(place);
    path.push({ place, tiltDeg: step ? step.tiltDeg : 0, difficulty: step ? step.difficulty : /** @type {Difficulty} */ ('easier') });
    if (place === start) break;
  }
  // The start carries the step out of it, as in safe_paths.py.
  return path.reverse();
}

/**
 * Distance, climb, difficulty stretches, elevation profile and callout positions for a path
 * (prepare_safe_paths.py describe()).
 * @param {TrackNetwork} network
 * @param {ReturnType<typeof findPath>} path
 * @returns {SafePath}
 */
export function describePath(network, path) {
  const places = path.map((step) => network.places[step.place]);
  /** @type {{ difficulty: Difficulty, raw: number[][] }[]} */
  const runs = [];
  let along = 0;
  let ascent = 0;
  let descent = 0;
  const profile = [[0, round(places[0][2], 1)]];
  let nextProfile = PROFILE_STEP_M;
  let steepest = { place: places[0], tilt: 0 };
  path.slice(1).forEach((step, index, steps) => {
    const a = places[index];
    const b = places[index + 1];
    along += greatCircleM(a[0], a[1], b[0], b[1]);
    const change = b[2] - a[2];
    ascent += Math.max(change, 0);
    descent += Math.max(-change, 0);
    if (step.tiltDeg > steepest.tilt) steepest = { place: b, tilt: step.tiltDeg };
    if (along >= nextProfile || index === steps.length - 1) {
      profile.push([round(along, 1), round(b[2], 1)]);
      nextProfile = along + PROFILE_STEP_M;
    }
    const last = runs[runs.length - 1];
    if (last && last.difficulty === step.difficulty) last.raw.push(b);
    else runs.push({ difficulty: step.difficulty, raw: [a, b] });
  });
  const middle = places[Math.floor(places.length / 2)];
  return {
    distanceM: round(along, 1),
    ascentM: round(ascent, 1),
    descentM: round(descent, 1),
    maxTiltDeg: round(steepest.tilt, 2),
    steepest: [round(steepest.place[0], COORD_DECIMALS), round(steepest.place[1], COORD_DECIMALS)],
    middle: [round(middle[0], COORD_DECIMALS), round(middle[1], COORD_DECIMALS)],
    runs: runs.map((run) => ({
      difficulty: run.difficulty,
      points: simplify(run.raw).map(([lat, lon]) => [round(lat, COORD_DECIMALS), round(lon, COORD_DECIMALS)]),
    })),
    profile,
  };
}

/**
 * Round half to even, as Python's round() does, so numbers match the script's.
 * @param {number} value
 * @param {number} decimals
 */
function round(value, decimals) {
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  const EPSILON = 1e-9;
  const rounded = Math.abs(diff - 0.5) < EPSILON ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(scaled);
  return rounded / factor;
}

/**
 * Douglas-Peucker simplification in metres, keeping the first and last point (traverse.py simplify()).
 * @param {number[][]} points [lat, lon, ...]
 * @returns {number[][]}
 */
function simplify(points) {
  if (points.length < 3) return points;
  const lat0 = (points[0][0] * Math.PI) / 180;
  const xy = points.map(([lat, lon]) => [
    (((lon - points[0][1]) * Math.PI) / 180) * MARS_RADIUS_M * Math.cos(lat0),
    (((lat - points[0][0]) * Math.PI) / 180) * MARS_RADIUS_M,
  ]);
  const keep = points.map(() => false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = /** @type {number[]} */ (stack.pop());
    const [x1, y1] = xy[first];
    const [x2, y2] = xy[last];
    const length = Math.hypot(x2 - x1, y2 - y1);
    let worst = 0;
    let worstIndex = -1;
    for (let i = first + 1; i < last; i += 1) {
      const [x, y] = xy[i];
      const gap = length === 0 ? Math.hypot(x - x1, y - y1) : Math.abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) / length;
      if (gap > worst) { worst = gap; worstIndex = i; }
    }
    if (worst > SIMPLIFY_TOLERANCE_M) {
      keep[worstIndex] = true;
      stack.push([first, worstIndex], [worstIndex, last]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

/**
 * A small binary heap of [priority, cost, place], smallest priority first. Ties break like
 * Python's heapq on tuples (then by cost, then by place), so both searches pick the same path.
 */
class MinQueue {
  constructor() {
    /** @type {[number, number, number][]} */
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  /** @param {number} priority @param {number} cost @param {number} place */
  push(priority, cost, place) {
    const items = this.items;
    items.push([priority, cost, place]);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!less(items[i], items[parent])) break;
      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }

  /** @returns {[number, number, number] | undefined} */
  pop() {
    const items = this.items;
    const top = items[0];
    const end = items.pop();
    if (items.length > 0 && end) {
      items[0] = end;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < items.length && less(items[left], items[smallest])) smallest = left;
        if (right < items.length && less(items[right], items[smallest])) smallest = right;
        if (smallest === i) break;
        [items[i], items[smallest]] = [items[smallest], items[i]];
        i = smallest;
      }
    }
    return top;
  }
}

/** @param {[number, number, number]} a @param {[number, number, number]} b */
function less(a, b) {
  return a[0] !== b[0] ? a[0] < b[0] : a[1] !== b[1] ? a[1] < b[1] : a[2] < b[2];
}
