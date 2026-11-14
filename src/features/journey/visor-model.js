// @ts-check
/**
 * Pure logic for the visor view: the compass tape across the top of the
 * visor, where the next stop sits on it, and how full the two limit gauges
 * are (time out, distance from base).
 *
 * Headings are compass degrees: 0 north, clockwise. The limits are NASA's
 * (passed in by the page from nasa-limits.js); the "near the limit" share is ours.
 */

/** A gauge turns to "near" at this share of its limit. OUR OWN threshold: a quarter of the limit left. */
export const NEAR_LIMIT_SHARE = 0.75;
/** Tick labels on the tape: letters at the cardinal points, numbers every 30 degrees. */
const CARDINALS = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
const NUMBERED_EVERY_DEG = 30;

/**
 * @typedef {object} TapeTick
 * @property {number} bearingDeg The tick's compass bearing, 0 to 359.
 * @property {number} offsetDeg How far it is from the heading, negative to the left.
 * @property {string | null} label "N", "E", "S", "W", a number such as "30", or null for a plain tick.
 */

/**
 * Signed difference from a heading to a bearing, the short way round.
 * @param {number} headingDeg
 * @param {number} bearingDeg
 * @returns {number} Degrees from -180 (left) to 180 (right).
 */
export function relativeBearing(headingDeg, bearingDeg) {
  return ((((bearingDeg - headingDeg) % 360) + 540) % 360) - 180;
}

/**
 * The ticks visible on the compass tape.
 * @param {number} headingDeg Where the wearer faces.
 * @param {number} halfSpanDeg How far the tape reaches either side of the heading.
 * @param {number} stepDeg Degrees between ticks; divides 30.
 * @returns {TapeTick[]} Left to right.
 */
export function tapeTicks(headingDeg, halfSpanDeg, stepDeg) {
  const first = Math.ceil((headingDeg - halfSpanDeg) / stepDeg) * stepDeg;
  /** @type {TapeTick[]} */
  const ticks = [];
  for (let raw = first; raw <= headingDeg + halfSpanDeg; raw += stepDeg) {
    const bearingDeg = ((raw % 360) + 360) % 360;
    const cardinal = /** @type {Record<number, string>} */ (CARDINALS)[bearingDeg];
    const label = cardinal ?? (bearingDeg % NUMBERED_EVERY_DEG === 0 ? String(bearingDeg) : null);
    ticks.push({ bearingDeg, offsetDeg: raw - headingDeg, label });
  }
  return ticks;
}

/**
 * How full a limit gauge is.
 * @param {number} value Time in minutes, or distance in metres.
 * @param {number} limit The limit, in the same unit.
 * @returns {{ share: number, level: 'ok' | 'near' | 'over' }} share is 0 to 1 (clamped).
 */
export function gauge(value, limit) {
  const raw = limit > 0 ? value / limit : 1;
  const level = raw >= 1 ? 'over' : raw >= NEAR_LIMIT_SHARE ? 'near' : 'ok';
  return { share: Math.min(Math.max(raw, 0), 1), level };
}
