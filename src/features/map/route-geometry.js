// @ts-check
/**
 * Geometry helpers for drawing the walk on the map. The paths themselves are
 * precomputed (data/processed/safe_paths.json); this only picks the chosen leg
 * and places direction arrows.
 */

/** @typedef {import('../plan/plan-model.js').Section} Section */

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
 * Halfway point of a path and the direction of travel there, for a direction arrow.
 * The map uses a plain latitude/longitude grid, so a direction measured in
 * degrees here is the same on screen at every zoom.
 * @param {number[][]} path [lat, lon] pairs in walking direction (at least two).
 * @returns {{ lat: number, lon: number, angleDeg: number }} angleDeg: 0 points east, 90 south (screen rotation, clockwise).
 */
export function midpointHeading(path) {
  const lengths = path.slice(1).map((point, i) => Math.hypot(point[0] - path[i][0], point[1] - path[i][1]));
  let remaining = lengths.reduce((sum, value) => sum + value, 0) / 2;
  let i = 0;
  while (i < lengths.length - 1 && remaining > lengths[i]) { remaining -= lengths[i]; i += 1; }
  const [lat1, lon1] = path[i];
  const [lat2, lon2] = path[i + 1];
  const share = lengths[i] === 0 ? 0 : remaining / lengths[i];
  return {
    lat: lat1 + (lat2 - lat1) * share,
    lon: lon1 + (lon2 - lon1) * share,
    angleDeg: (Math.atan2(lat1 - lat2, lon2 - lon1) * 180) / Math.PI + 0,
  };
}
