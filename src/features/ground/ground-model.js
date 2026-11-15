// @ts-check
/**
 * Pure logic for the ground views: the photos Curiosity took from each stop.
 *
 * Dataset: data/processed/ground_views.json (scripts/prepare_ground_views.py),
 *          Curiosity's left navigation camera, NASA/JPL-Caltech raw images.
 * `bearingDeg` is DERIVED and approximate: the rover's heading plus the
 * camera's angle, in degrees clockwise from north, ignoring the rover's tilt.
 */

/**
 * @typedef {object} GroundFrame One photo.
 * @property {string} file Path of the stored copy, from the site root.
 * @property {number} bearingDeg Which way it looks, degrees clockwise from north (derived, approximate).
 * @property {number} elevationDeg How far above (+) or below (-) level the camera pointed.
 * @property {number} sol The sol it was taken.
 * @property {string} takenUtc When it was taken, Earth time (UTC, ISO format).
 * @property {string} localMarsTime Local Mars time when taken, "HH:MM", or empty when the source gave none.
 * @property {string} credit Credit line from the source.
 * @property {string} imageId NASA's identifier for the image.
 * @property {string} originalUrl The full-size original at NASA.
 */
/** @typedef {{ camera: string, frames: GroundFrame[] }} GroundView The photos from one stop, in turning order. */

/** Compass points, clockwise from north, each covering 45 degrees. */
const COMPASS_POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

/**
 * Name the compass point nearest a bearing.
 * @param {number} bearingDeg Degrees clockwise from north; any value, it is wrapped to 0 to 360.
 * @returns {string} For example "north-east".
 */
export function compassName(bearingDeg) {
  const wrapped = ((bearingDeg % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(wrapped / 45) % COMPASS_POINTS.length];
}

/**
 * Move through the photos, wrapping at either end so the viewer can keep turning the same way.
 * @param {number} index The photo shown now.
 * @param {number} step +1 turns right (clockwise), -1 turns left.
 * @param {number} count How many photos the stop has.
 * @returns {number} The next photo's index.
 */
export function turnFrame(index, step, count) {
  return (((index + step) % count) + count) % count;
}

/**
 * Check the ground views file and keep only complete photos, in turning order.
 * @param {any} data ground_views.json
 * @returns {Map<string, GroundView>} Views by stop id. A stop with no usable photo is left out.
 * @throws {Error} When the file does not have the expected shape.
 */
export function parseGroundViews(data) {
  if (typeof data?.views !== 'object' || data.views === null) {
    throw new Error('The ground views file is damaged. Run scripts/prepare_ground_views.py again.');
  }
  /** @type {Map<string, GroundView>} */
  const views = new Map();
  for (const [stopId, view] of Object.entries(data.views)) {
    const frames = (Array.isArray(view?.frames) ? view.frames : [])
      .filter((/** @type {any} */ frame) => typeof frame?.file === 'string' && Number.isFinite(frame.bearingDeg)
        && Number.isFinite(frame.sol) && typeof frame.originalUrl === 'string' && frame.originalUrl.startsWith('https://'))
      .sort((/** @type {GroundFrame} */ a, /** @type {GroundFrame} */ b) => a.bearingDeg - b.bearingDeg);
    if (frames.length > 0) views.set(stopId, { camera: typeof view.camera === 'string' ? view.camera : 'Navigation camera', frames });
  }
  return views;
}
