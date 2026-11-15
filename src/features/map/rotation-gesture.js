// @ts-check
/**
 * Pure geometry for turning the map with two fingers.
 * Angles are in degrees, clockwise on the screen (the screen's y axis points down).
 */

/** A twist smaller than this, in degrees, is taken for an unsteady pinch and does not turn the map. */
export const TURN_START_DEG = 12;

/**
 * Direction of the line from one touch to another.
 * @param {{ clientX: number, clientY: number }} first
 * @param {{ clientX: number, clientY: number }} second
 * @returns {number} Degrees clockwise from the screen's right, from -180 to 180.
 */
export function touchAngleDeg(first, second) {
  return (Math.atan2(second.clientY - first.clientY, second.clientX - first.clientX) * 180) / Math.PI;
}

/**
 * The shortest turn from one direction to another.
 * @param {number} fromDeg
 * @param {number} toDeg
 * @returns {number} Degrees, from -180 to 180; positive is clockwise.
 */
export function signedTurnDeg(fromDeg, toDeg) {
  return ((((toDeg - fromDeg + 180) % 360) + 360) % 360) - 180;
}

/**
 * Bring any angle into the range a compass uses.
 * @param {number} angleDeg
 * @returns {number} The same direction, from 0 up to (not including) 360.
 */
export function wrapDeg(angleDeg) {
  return ((angleDeg % 360) + 360) % 360;
}
