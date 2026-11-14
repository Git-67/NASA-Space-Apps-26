// @ts-check
/**
 * Geometry of the walk on the map, from Curiosity's driven path.
 *
 * Each route point carries `track`: the drive from the previous point to it,
 * as [lat, lon] pairs (from the mission's traverse file; see
 * scripts/prepare_route.py). A section of the walk is the drives between two
 * stops, joined end to end, and reversed when the section is walked against
 * the rover's direction.
 */

/** @typedef {import('../plan/plan-model.js').RoutePoint} RoutePoint */
/** @typedef {import('../plan/plan-model.js').Section} Section */

/**
 * The path between two route points, in walking direction.
 * @param {RoutePoint[]} points The whole route.
 * @param {number} fromIndex Point the walker starts from.
 * @param {number} toIndex Point the walker walks to.
 * @returns {number[][]} [lat, lon] pairs from start to end. A single point when both are the same.
 */
export function sectionPath(points, fromIndex, toIndex) {
  const low = Math.min(fromIndex, toIndex);
  const high = Math.max(fromIndex, toIndex);
  /** @type {number[][]} */
  const path = [[points[low].lat, points[low].lon]];
  for (let i = low + 1; i <= high; i += 1) {
    const drive = points[i].track.length > 0 ? points[i].track : [[points[i - 1].lat, points[i - 1].lon], [points[i].lat, points[i].lon]];
    path.push(...drive.slice(1)); // each drive starts where the previous one ended
  }
  return fromIndex <= toIndex ? path : path.reverse();
}

/**
 * The route point with the largest rover tilt on a section: where to pin a "steep" callout.
 * @param {RoutePoint[]} points The whole route.
 * @param {Section} section
 * @returns {RoutePoint}
 */
export function steepestPoint(points, section) {
  const low = Math.min(section.fromIndex, section.toIndex);
  const high = Math.max(section.fromIndex, section.toIndex);
  let steepest = points[low];
  for (let i = low + 1; i <= high; i += 1) if (points[i].tiltDeg > steepest.tiltDeg) steepest = points[i];
  return steepest;
}

/**
 * The section the visitor is looking at: the one leaving the chosen stop.
 * For the last stop of the walk that is the return to the start.
 * @param {Section[]} sections The plan's sections.
 * @param {string | null} stopId The chosen stop, or null for none.
 * @returns {Section | null}
 */
export function activeSection(sections, stopId) {
  if (stopId === null) return null;
  return sections.find((section) => section.fromId === stopId) ?? null;
}

/**
 * Split a section into runs of drives with the same difficulty, so the map can
 * colour only the steep parts. A drive takes the larger rover tilt of the two
 * waypoints it joins.
 * @param {RoutePoint[]} points The whole route.
 * @param {number} fromIndex Point the walker starts from.
 * @param {number} toIndex Point the walker walks to.
 * @param {(tiltDeg: number) => string} rate Difficulty for a rover tilt.
 * @returns {{ difficulty: string, path: number[][] }[]} Runs in walking direction.
 */
export function difficultyRuns(points, fromIndex, toIndex, rate) {
  const step = toIndex >= fromIndex ? 1 : -1;
  /** @type {{ difficulty: string, path: number[][] }[]} */
  const runs = [];
  for (let i = fromIndex; i !== toIndex; i += step) {
    const next = i + step;
    const difficulty = rate(Math.max(points[i].tiltDeg, points[next].tiltDeg));
    const drive = sectionPath(points, i, next);
    const last = runs[runs.length - 1];
    if (last && last.difficulty === difficulty) last.path.push(...drive.slice(1));
    else runs.push({ difficulty, path: drive });
  }
  return runs;
}
