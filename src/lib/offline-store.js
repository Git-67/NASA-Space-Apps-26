// @ts-check
/**
 * The page's side of the offline store (sw.js): start it, ask the browser to
 * keep its contents for good, have it save the whole site in the background,
 * and report how that is going.
 *
 * "For good" is the browser's promise to make, not ours. `storage.persist()`
 * asks it not to clear this site's data when space runs low. A browser can
 * refuse, and a person can always clear it by hand.
 */

/**
 * @typedef {object} OfflineStatus
 * @property {'unsupported' | 'starting' | 'saving' | 'saved' | 'failed'} state
 * @property {number} done Files saved so far.
 * @property {number} total Files the site needs.
 * @property {boolean} isKeptForGood Whether the browser agreed not to clear the store by itself.
 */

/**
 * Put an offline status into words.
 * @param {OfflineStatus} status
 * @returns {string}
 */
export function describeOfflineStatus({ state, done, total, isKeptForGood }) {
  const keeping = isKeptForGood ? ' The browser will keep it.' : ' The browser may clear it if the device runs short of space.';
  if (state === 'unsupported') return 'This browser cannot save the site for offline use.';
  if (state === 'starting') return 'Preparing to save the site for offline use…';
  if (state === 'saving') return `Saving for offline use: ${done} of ${total} files.`;
  if (state === 'failed') return total > 0
    ? `Saved ${done} of ${total} files for offline use. The rest will be tried again next visit.`
    : 'Could not save the site for offline use yet. It will be tried again next visit.';
  return `Saved on this device: the map and ground photos open with no signal.${keeping}`;
}

/**
 * Start the offline store and keep the page told of its progress.
 * @param {(status: OfflineStatus) => void} onStatus Called on every change.
 */
export async function startOfflineStore(onStatus) {
  /** @type {OfflineStatus} */
  const status = { state: 'starting', done: 0, total: 0, isKeptForGood: false };
  if (!('serviceWorker' in navigator)) {
    onStatus({ ...status, state: 'unsupported' });
    return;
  }
  onStatus(status);
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'offline-store') return;
    status.state = event.data.state;
    status.done = event.data.done;
    status.total = event.data.total;
    onStatus({ ...status });
  });
  try {
    await navigator.serviceWorker.register('sw.js');
    const registration = await navigator.serviceWorker.ready;
    status.isKeptForGood = (await navigator.storage?.persist?.()) === true;
    registration.active?.postMessage({ type: 'save-site' });
  } catch {
    onStatus({ ...status, state: 'failed' });
  }
}
