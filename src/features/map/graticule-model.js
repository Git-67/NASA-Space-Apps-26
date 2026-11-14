// @ts-check
/**
 * Where to draw the latitude and longitude grid, and how to label it.
 * Values are degrees, in whatever convention the map's sources use (see
 * docs/DATA_SOURCES.md); the grid only divides the map, it converts nothing.
 */

/** Grid spacings to choose from, in degrees: 1, 2, 5 times powers of ten. */
export const GRID_STEPS_DEG = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];

/** Most grid lines wanted across the view in one direction, so labels do not crowd. */
export const MAX_GRID_LINES = 6;

/**
 * Pick the finest grid spacing that keeps the number of lines readable.
 * @param {number} spanDeg Width or height of the view, in degrees.
 * @param {number} [maxLines] Most lines allowed across that span.
 * @returns {number} Spacing in degrees.
 */
export function chooseGridStep(spanDeg, maxLines = MAX_GRID_LINES) {
  return GRID_STEPS_DEG.find((step) => spanDeg / step <= maxLines) ?? GRID_STEPS_DEG[GRID_STEPS_DEG.length - 1];
}

/**
 * Number of decimal places that shows a grid spacing exactly.
 * @param {number} step Spacing in degrees.
 * @returns {number}
 */
function decimalsFor(step) {
  return Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
}

/**
 * Grid line positions between two values.
 * @param {number} min Low end of the range, in degrees.
 * @param {number} max High end of the range, in degrees.
 * @param {number} step Spacing in degrees.
 * @returns {number[]} Multiples of `step` within the range, lowest first, rounded to the step's precision.
 */
export function gridValues(min, max, step) {
  const decimals = decimalsFor(step);
  /** @type {number[]} */
  const values = [];
  for (let index = Math.ceil(min / step); index * step <= max; index += 1) {
    values.push(Number((index * step).toFixed(decimals)));
  }
  return values;
}

/**
 * Label for a grid line, with as many decimals as the spacing needs.
 * The sign is kept as the sources give it; no N/S or E/W is added, because the
 * sources' convention is not yet confirmed.
 * @param {number} value Position in degrees.
 * @param {number} step Spacing in degrees.
 * @returns {string} For example "-4.805°".
 */
export function formatGridDegrees(value, step) {
  return `${value.toFixed(decimalsFor(step))}°`;
}
