// @ts-check
/**
 * Daily missions: each sol gets one objective, and the objective picks the
 * stops for that day's walk from the pool (the five curated stops, places
 * where Curiosity parked, and any points the crew added).
 *
 * OURS: the objectives, and which stops each one picks, are our own
 * suggestions for varied practice walks, not NASA mission plans. The page
 * labels them as ours. The science behind the curated stops is in
 * docs/SCIENCE_BRIEF.md; rover stops claim nothing beyond the sol and
 * position NASA published.
 *
 * The objective changes with the sol (sol number modulo the number of
 * objectives), so the same sol always gives the same mission.
 */
import { greatCircleM } from '../../lib/mars.js';

/** @typedef {import('./plan-model.js').Stop} Stop */
/**
 * @typedef {object} Mission
 * @property {string} id
 * @property {string} title A few words, e.g. "Ridge versus hollow".
 * @property {string} goal One sentence: what the walk is for.
 * @property {string[]} stopIds Stops to visit after the start (order not yet optimised).
 */

/** How many rover stops a mission uses when it uses them. */
const ROVER_STOP_COUNT = 3;

/**
 * The objectives, in rotation. Each picks its stops from the pool; one that finds too few
 * (for example no rover stops loaded) falls back to the full curated walk.
 * @type {{ id: string, title: string, goal: string, pick: (pool: Stop[], sol: number) => string[] }[]}
 */
const OBJECTIVES = [
  {
    id: 'ridge-hollow',
    title: 'Ridge versus hollow',
    goal: 'Compare the drill sites on the ridge and in the sandy hollow below it.',
    pick: (pool) => pool.filter((stop) => stop.id === 'monte-grande' || stop.id === 'nevado-sajama').map((stop) => stop.id),
  },
  {
    id: 'nodules',
    title: 'Nodule hunt',
    goal: 'Find where the nodules form: on ridge walls or in the hollows.',
    pick: (pool) => pool.filter((stop) => stop.id === 'nodules' || stop.id === 'monte-grande').map((stop) => stop.id),
  },
  {
    id: 'retrace',
    title: 'Retrace Curiosity',
    goal: 'Walk to three places the rover parked close to this sol, and look at its tracks.',
    pick: (pool, sol) => pool
      .filter((stop) => stop.kind === 'rover' && typeof stop.sol === 'number')
      .sort((a, b) => Math.abs(/** @type {number} */ (a.sol) - sol) - Math.abs(/** @type {number} */ (b.sol) - sol))
      .slice(0, ROVER_STOP_COUNT)
      .map((stop) => stop.id),
  },
  {
    id: 'overview',
    title: 'Map the ridges',
    goal: 'Photograph the ridge network from the viewpoint, then from the rover stops nearest it.',
    pick: (pool) => {
      const viewpoint = pool.find((stop) => stop.id === 'panorama');
      if (!viewpoint) return [];
      const nearest = pool
        .filter((stop) => stop.kind === 'rover')
        .sort((a, b) => greatCircleM(viewpoint.lat, viewpoint.lon, a.lat, a.lon) - greatCircleM(viewpoint.lat, viewpoint.lon, b.lat, b.lon))
        .slice(0, ROVER_STOP_COUNT - 1);
      return [viewpoint.id, ...nearest.map((stop) => stop.id)];
    },
  },
  {
    id: 'full',
    title: 'Full boxwork',
    goal: 'Visit every curated stop: veins, nodules, the view, and both drill sites.',
    pick: (pool) => pool.filter((stop, index) => index > 0 && stop.kind === 'curated').map((stop) => stop.id),
  },
];

/** The fewest stops after the start that make a mission worth walking. */
const MIN_STOPS = 2;

/**
 * The mission for a sol.
 * @param {number} sol
 * @param {Stop[]} pool Every stop that can be visited; the first is the start.
 * @returns {Mission}
 */
export function missionForSol(sol, pool) {
  const index = ((Math.round(sol) % OBJECTIVES.length) + OBJECTIVES.length) % OBJECTIVES.length;
  const objective = OBJECTIVES[index];
  const stopIds = objective.pick(pool, sol).filter((id) => id !== pool[0]?.id);
  if (stopIds.length >= MIN_STOPS || objective.id === 'full') {
    return { id: objective.id, title: objective.title, goal: objective.goal, stopIds };
  }
  const full = /** @type {(typeof OBJECTIVES)[number]} */ (OBJECTIVES.find((item) => item.id === 'full'));
  return { id: full.id, title: full.title, goal: full.goal, stopIds: full.pick(pool, sol) };
}

/** @returns {number} How many objectives rotate. */
export function missionCount() {
  return OBJECTIVES.length;
}
