// @ts-check
/**
 * Which map layers the visitor last had on, remembered on this device.
 *
 * Every overlay starts switched on. After that the visitor's own choices are
 * kept across reloads and resets of the page, in the browser's local storage.
 * Storage can be blocked (private windows), so reading and saving never fail:
 * the map then simply starts from the defaults each time.
 */

const STORAGE_KEY = 'sol-stroll-map-layers';

/**
 * @typedef {object} LayerPreferences
 * @property {string} imageryId The chosen basemap.
 * @property {string[]} overlayIds The overlays that are switched on.
 */

/**
 * Turn stored text into preferences, falling back to the defaults for anything missing or invalid.
 * An overlay the stored text does not mention (one added since the visitor's last visit) starts on.
 * @param {string | null} storedText What was saved, or null when nothing was.
 * @param {string[]} imageryIds Every basemap, the default first.
 * @param {string[]} overlayIds Every overlay.
 * @returns {LayerPreferences}
 */
export function parseLayerPreferences(storedText, imageryIds, overlayIds) {
  /** @type {LayerPreferences} */
  const defaults = { imageryId: imageryIds[0], overlayIds: [...overlayIds] };
  if (storedText === null) return defaults;
  let stored;
  try {
    stored = JSON.parse(storedText);
  } catch {
    return defaults;
  }
  if (typeof stored !== 'object' || stored === null) return defaults;
  const overlays = typeof stored.overlays === 'object' && stored.overlays !== null ? stored.overlays : {};
  return {
    imageryId: imageryIds.includes(stored.imagery) ? stored.imagery : defaults.imageryId,
    overlayIds: overlayIds.filter((id) => overlays[id] !== false),
  };
}

/**
 * Turn preferences into the text that is stored. Each overlay is recorded as on or off, so an
 * overlay switched off stays off, and one that did not exist yet is told apart from one switched off.
 * @param {LayerPreferences} preferences
 * @param {string[]} overlayIds Every overlay.
 * @returns {string}
 */
export function serialiseLayerPreferences(preferences, overlayIds) {
  return JSON.stringify({
    imagery: preferences.imageryId,
    overlays: Object.fromEntries(overlayIds.map((id) => [id, preferences.overlayIds.includes(id)])),
  });
}

/**
 * Read the remembered layers.
 * @param {string[]} imageryIds Every basemap, the default first.
 * @param {string[]} overlayIds Every overlay.
 * @returns {LayerPreferences}
 */
export function readLayerPreferences(imageryIds, overlayIds) {
  let storedText = null;
  try {
    storedText = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage is blocked: start from the defaults.
  }
  return parseLayerPreferences(storedText, imageryIds, overlayIds);
}

/**
 * Remember the layers for the next visit.
 * @param {LayerPreferences} preferences
 * @param {string[]} overlayIds Every overlay.
 */
export function saveLayerPreferences(preferences, overlayIds) {
  try {
    localStorage.setItem(STORAGE_KEY, serialiseLayerPreferences(preferences, overlayIds));
  } catch {
    // The choice still applies for this visit; it just will not be remembered.
  }
}
