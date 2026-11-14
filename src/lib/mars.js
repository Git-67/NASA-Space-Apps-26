// @ts-check
/**
 * Constants and conversions for Mars time and geometry.
 * Sources: mean radius and sol length are standard IAU / NASA reference values.
 */

/** Mean radius of Mars in metres. Used for map distances and the scale bar. */
export const MARS_RADIUS_M = 3_389_500;

/** Length of one sol (a Martian day) in Earth hours. */
export const SOL_IN_EARTH_HOURS = 24.6597;

/** One Mars-clock minute (1/1440 of a sol) expressed in Earth minutes. */
const MARS_MINUTE_IN_EARTH_MINUTES = (SOL_IN_EARTH_HOURS * 60) / 1440;

/**
 * Convert a span of local Mars time to Earth minutes.
 * Sunrise and sunset in the weather record are on the Mars clock, but walking
 * time is planned in Earth minutes, so the two must be put on one basis.
 * @param {number} marsMinutes Span in Mars-clock minutes.
 * @returns {number} The same span in Earth minutes.
 */
export function marsMinutesToEarthMinutes(marsMinutes) {
  return marsMinutes * MARS_MINUTE_IN_EARTH_MINUTES;
}

/**
 * Format Mars-clock minutes after local midnight as "HH:MM".
 * @param {number} minutes Minutes after local midnight, on the Mars clock.
 * @returns {string} Local Mars time, for example "05:18".
 */
export function formatMarsClock(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/**
 * Format a duration in Earth minutes as "2 h 05 min" or "45 min".
 * @param {number} minutes Duration in Earth minutes.
 * @returns {string} Human-readable duration.
 */
export function formatDuration(minutes) {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return hours === 0 ? `${rest} min` : `${hours} h ${String(rest).padStart(2, '0')} min`;
}

/** Length of one sol in Earth days (88,775.244 s; NASA reference value). */
export const SOL_IN_EARTH_DAYS = 88_775.244 / 86_400;

/**
 * Curiosity's sol number on a given Earth date, counted from a known pair.
 * Used where the weather record has no entry: the present day, and gaps.
 * DERIVED: counts whole sols from the reference, so it can be off by one near a sol boundary.
 * @param {string} date Earth date, "YYYY-MM-DD" (UTC).
 * @param {{ sol: number, earthDate: string }} reference A sol whose Earth date is known.
 * @returns {number}
 */
export function solOnEarthDate(date, reference) {
  const days = (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${reference.earthDate}T12:00:00Z`)) / 86_400_000;
  return reference.sol + Math.floor(days / SOL_IN_EARTH_DAYS);
}

/**
 * The Earth date (UTC) on which a sol falls, counted from a known pair.
 * DERIVED, like solOnEarthDate.
 * @param {number} sol
 * @param {{ sol: number, earthDate: string }} reference A sol whose Earth date is known.
 * @returns {string} "YYYY-MM-DD".
 */
export function earthDateOfSol(sol, reference) {
  const time = Date.parse(`${reference.earthDate}T12:00:00Z`) + (sol - reference.sol) * SOL_IN_EARTH_DAYS * 86_400_000;
  return new Date(time).toISOString().slice(0, 10);
}
