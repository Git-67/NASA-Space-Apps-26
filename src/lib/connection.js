// @ts-check
/**
 * Online or offline: whether the page can reach NASA's servers right now.
 *
 * Online, the page reads live NASA data (map tiles, space weather, rover
 * weather). Offline, as on Mars, it shows the data stored with the site and
 * says how recent it is. The visitor can also choose offline by hand (to see
 * what a crew would see, or to save bandwidth); that choice is remembered in
 * this browser only.
 */

/** @typedef {'online' | 'offline'} ConnectionMode */

/** A small (about 7 KB) NASA Mars Trek elevation tile over the walk. Loaded as an image, so it needs no cross-site permission. */
const PROBE_URL = 'https://trek.nasa.gov/tiles/Mars/EQ/Gale_DEM_SMG_1m/1.0.0/default/default028mm/12/2157/7222.png';
/** How long to wait for NASA before assuming there is no connection, in milliseconds. */
const PROBE_TIMEOUT_MS = 3000;
const STORAGE_KEY = 'sol-stroll:prefer-offline';

/**
 * Try to reach NASA.
 * @returns {Promise<boolean>} True if the probe tile loaded in time.
 */
export function canReachNasa() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve(false);
  return new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => { image.src = ''; resolve(false); }, PROBE_TIMEOUT_MS);
    image.onload = () => { clearTimeout(timer); resolve(true); };
    image.onerror = () => { clearTimeout(timer); resolve(false); };
    image.src = `${PROBE_URL}?probe=${Date.now()}`; // never answered from the cache
  });
}

/** @returns {boolean} Whether the visitor chose offline by hand in this browser. */
export function prefersOffline() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false; // storage blocked: fall back to detecting the connection
  }
}

/** @param {boolean} isPreferred Remember (or forget) the visitor's choice of offline. */
export function setPrefersOffline(isPreferred) {
  try {
    if (isPreferred) localStorage.setItem(STORAGE_KEY, 'true');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the choice still applies until the page is closed.
  }
}

/**
 * Decide the mode at start-up.
 * @returns {Promise<ConnectionMode>}
 */
export async function detectMode() {
  if (prefersOffline()) return 'offline';
  return (await canReachNasa()) ? 'online' : 'offline';
}
