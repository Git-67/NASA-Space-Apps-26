// @ts-check
/**
 * Fit Web Mercator tiles into the map's plain latitude/longitude tiles.
 *
 * The map uses NASA Mars Trek's grid (equal steps of latitude). The colour
 * HiRISE mosaic from NASA's Curiosity location map is cut in Web Mercator
 * tiles instead, where rows get taller away from the equator. Longitude is
 * spaced evenly in both, and a Mercator tile at zoom z + 1 spans exactly the
 * same longitudes as a Trek tile at zoom z, so columns line up one to one.
 * Only rows need converting: each Mercator row is placed by its true top and
 * bottom latitudes. Inside one row the stretch is treated as even, which is off
 * by far less than a pixel this close to the equator (Gale is at about 5° S).
 */

/**
 * Fractional Web Mercator row of a latitude, counted from the top (XYZ numbering).
 * @param {number} latDeg Latitude in degrees.
 * @param {number} zoom Mercator zoom level.
 * @returns {number}
 */
export function mercatorRowFraction(latDeg, zoom) {
  const lat = (latDeg * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * 2 ** zoom;
}

/**
 * Latitude of the top edge of a Web Mercator row (XYZ numbering).
 * @param {number} row Row number, may be fractional.
 * @param {number} zoom Mercator zoom level.
 * @returns {number} Latitude in degrees.
 */
export function latitudeOfMercatorRow(row, zoom) {
  const n = Math.PI - (2 * Math.PI * row) / 2 ** zoom;
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
}

/**
 * Which Mercator rows cover a band of latitude, and where each lands in a tile of the map.
 * @param {number} northDeg Top of the band, in degrees.
 * @param {number} southDeg Bottom of the band, in degrees.
 * @param {number} zoom Mercator zoom level.
 * @param {number} heightPx Height of the map tile the band fills, in pixels.
 * @returns {{ row: number, topPx: number, heightPx: number }[]} Rows in XYZ numbering, top first.
 */
export function mercatorRowsForBand(northDeg, southDeg, zoom, heightPx) {
  const toPx = (/** @type {number} */ lat) => ((northDeg - lat) / (northDeg - southDeg)) * heightPx;
  const firstRow = Math.floor(mercatorRowFraction(northDeg, zoom));
  const lastRow = Math.floor(mercatorRowFraction(southDeg, zoom) - 1e-9);
  /** @type {{ row: number, topPx: number, heightPx: number }[]} */
  const rows = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    const topPx = toPx(latitudeOfMercatorRow(row, zoom));
    rows.push({ row, topPx, heightPx: toPx(latitudeOfMercatorRow(row + 1, zoom)) - topPx });
  }
  return rows;
}

/**
 * Convert a row from XYZ numbering (from the top) to TMS numbering (from the bottom).
 * @param {number} row XYZ row.
 * @param {number} zoom Mercator zoom level.
 * @returns {number} TMS row.
 */
export function toTmsRow(row, zoom) {
  return 2 ** zoom - 1 - row;
}
