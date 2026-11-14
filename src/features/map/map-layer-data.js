// @ts-check
/**
 * Check the prepared files behind the optional map layers, at the boundary,
 * and turn them into typed objects. Each file is optional: if one is missing
 * or damaged, only its layer is switched off, and the page still works.
 */

/**
 * @typedef {object} Place A named place Curiosity explored.
 * @property {string} name Name used by NASA's Curiosity location map.
 * @property {number} lat Latitude in degrees, as the source gives it.
 * @property {number} lon Longitude in degrees, as the source gives it.
 */

/**
 * @typedef {object} DemCalibration Scale of the grey levels in Mars Trek's Gale elevation tiles.
 * @property {string} layer Mars Trek layer ID.
 * @property {number} interceptM Elevation of grey level 0, in metres.
 * @property {number} metresPerLevel Elevation step between neighbouring grey levels, in metres.
 * @property {number} rmsErrorM Typical error against Curiosity's recorded elevations, in metres.
 * @property {number} waypointCount Number of Curiosity waypoints the scale was fitted to.
 */

/** @param {unknown} value @returns {value is number} */
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * @param {any} data Parsed data/processed/landmarks.json.
 * @returns {Place[]}
 * @throws {Error} When the file does not have the expected shape.
 */
export function parseLandmarks(data) {
  const places = data?.places;
  if (!Array.isArray(places) || places.length === 0) throw new Error('The place names file is empty or damaged.');
  return places.map((place) => {
    if (typeof place?.name !== 'string' || !isNumber(place.lat) || !isNumber(place.lon)) {
      throw new Error('The place names file has an entry without a name or position.');
    }
    return { name: place.name, lat: place.lat, lon: place.lon };
  });
}

/**
 * @param {any} data Parsed data/processed/dem_calibration.json.
 * @returns {DemCalibration}
 * @throws {Error} When the file does not have the expected shape.
 */
export function parseDemCalibration(data) {
  const { layer, interceptM, metresPerLevel, rmsErrorM, waypointCount } = data ?? {};
  if (typeof layer !== 'string' || ![interceptM, metresPerLevel, rmsErrorM, waypointCount].every(isNumber) || metresPerLevel <= 0) {
    throw new Error('The elevation calibration file is empty or damaged.');
  }
  return { layer, interceptM, metresPerLevel, rmsErrorM, waypointCount };
}
