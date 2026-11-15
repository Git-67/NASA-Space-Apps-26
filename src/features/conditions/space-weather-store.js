// @ts-check
/**
 * Keep the newest space weather the device has read from NASA, so that with
 * no signal the page judges from that, not from the older record published
 * with the site.
 *
 * Dataset: NASA DONKI, as merged by space-weather-live.js. Dates are UTC.
 * It is stored with its own "data up to" date, and the page always says that
 * date when it is not live, so a stored record is never passed off as live.
 * Storage can be blocked (private windows): then nothing is kept, and the
 * published record is used.
 */

/** @typedef {import('./space-weather-model.js').SpaceWeather} SpaceWeather */

const STORAGE_KEY = 'sol-stroll-space-weather';

/**
 * Check that stored text really is a space weather record.
 * @param {string | null} storedText
 * @returns {SpaceWeather | null} The record, or null when there is none or it is damaged.
 */
export function parseSavedSpaceWeather(storedText) {
  if (storedText === null) return null;
  let saved;
  try {
    saved = JSON.parse(storedText);
  } catch {
    return null;
  }
  const isRecord = typeof saved?.coverageStart === 'string' && typeof saved?.coverageEnd === 'string'
    && Array.isArray(saved.events) && Array.isArray(saved.unavailable)
    && saved.events.every((/** @type {any} */ event) => typeof event?.type === 'string' && typeof event?.time === 'string');
  return isRecord ? saved : null;
}

/**
 * Choose the record that reaches the later date.
 * @param {SpaceWeather | Error} published The record published with the site, or why it could not be loaded.
 * @param {SpaceWeather | null} saved The record this device saved, if any.
 * @returns {SpaceWeather | Error}
 */
export function newerSpaceWeather(published, saved) {
  if (saved === null) return published;
  if (published instanceof Error) return saved;
  return saved.coverageEnd > published.coverageEnd ? saved : published;
}

/** @returns {SpaceWeather | null} The record this device saved, if any. */
export function loadSavedSpaceWeather() {
  try {
    return parseSavedSpaceWeather(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** @param {SpaceWeather} record The record just read from NASA. */
export function saveSpaceWeather(record) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage is blocked or full: the record still serves this visit.
  }
}
