// @ts-check
/**
 * Signal: whether the page can reach NASA's servers right now.
 *
 * With signal the page reads live NASA data (map tiles, space weather, rover
 * weather). Without it, as on Mars, it shows the data stored with the site
 * and says how recent it is. Nobody chooses: the page watches the link and
 * switches by itself, both ways.
 *
 * How it watches:
 * - It loads one small NASA map tile. Loaded in time means signal.
 * - It checks again every PROBE_EVERY_MS, when the device reports its network
 *   came back or dropped, and when the page is looked at again after being
 *   in the background.
 * - One missed check does not mean the signal is lost: a slow link can miss
 *   one. It takes FAILURES_TO_GO_OFFLINE in a row. One success brings it back.
 * - If the device itself says it has no network, that is believed at once.
 */

/** @typedef {'online' | 'offline'} ConnectionMode */

/** A small (about 7 KB) NASA Mars Trek elevation tile over the walk. Loaded as an image, so it needs no cross-site permission. */
const PROBE_URL = 'https://trek.nasa.gov/tiles/Mars/EQ/Gale_DEM_SMG_1m/1.0.0/default/default028mm/12/2157/7222.png';
/** How long to wait for NASA before counting a check as missed, in milliseconds. */
const PROBE_TIMEOUT_MS = 3000;
/** How often the link is checked while the page is open, in milliseconds. */
export const PROBE_EVERY_MS = 30_000;
/** Checks that must be missed in a row before the page goes offline. */
export const FAILURES_TO_GO_OFFLINE = 2;

/**
 * Try to reach NASA.
 * @returns {Promise<boolean>} True if the probe tile loaded in time.
 */
function canReachNasa() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve(false);
  return new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => { image.src = ''; resolve(false); }, PROBE_TIMEOUT_MS);
    image.onload = () => { clearTimeout(timer); resolve(true); };
    image.onerror = () => { clearTimeout(timer); resolve(false); };
    image.src = `${PROBE_URL}?probe=${Date.now()}`; // never answered from the cache
  });
}

/**
 * Decide the mode after one more check of the link.
 * @param {{ mode: ConnectionMode, failures: number }} current The mode now, and how many checks in a row were missed.
 * @param {boolean} isReached Whether this check reached NASA.
 * @returns {{ mode: ConnectionMode, failures: number }}
 */
export function nextSignal(current, isReached) {
  if (isReached) return { mode: 'online', failures: 0 };
  const failures = current.failures + 1;
  return { mode: failures >= FAILURES_TO_GO_OFFLINE ? 'offline' : current.mode, failures };
}

/**
 * Decide the mode at start-up: one check, believed either way, so the page opens without waiting for a second.
 * @returns {Promise<ConnectionMode>}
 */
export async function detectMode() {
  return (await canReachNasa()) ? 'online' : 'offline';
}

/**
 * Keep watching the link and report every change of mode.
 * @param {ConnectionMode} startMode The mode the page started in.
 * @param {(mode: ConnectionMode) => void} onChange Called when the mode changes, not on every check.
 */
export function watchSignal(startMode, onChange) {
  let state = { mode: startMode, failures: startMode === 'offline' ? FAILURES_TO_GO_OFFLINE : 0 };
  let isChecking = false;
  /** @param {{ mode: ConnectionMode, failures: number }} next */
  const apply = (next) => {
    const hasChanged = next.mode !== state.mode;
    state = next;
    if (hasChanged) onChange(next.mode);
  };
  const check = async () => {
    // A hidden page does not need live data, and checking would only use the crew's link.
    if (isChecking || document.visibilityState === 'hidden') return;
    isChecking = true;
    try {
      apply(nextSignal(state, await canReachNasa()));
    } finally {
      isChecking = false;
    }
  };
  window.setInterval(check, PROBE_EVERY_MS);
  window.addEventListener('online', check);
  // The device knows it has no network at all: no need to wait for checks to fail.
  window.addEventListener('offline', () => apply({ mode: 'offline', failures: FAILURES_TO_GO_OFFLINE }));
  document.addEventListener('visibilitychange', check);
}
