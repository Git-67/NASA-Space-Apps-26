// @ts-check
/// <reference lib="webworker" />
/**
 * The offline store: a service worker that keeps what the device has fetched,
 * so the map, the ground photos and the page itself still open with no signal.
 *
 * What is kept, and how:
 * - The site's own files (page, scripts, styles, fonts, data, the map tiles
 *   and ground photos stored with the site). All of them are fetched and kept
 *   in the background after the first visit (offline-manifest.json lists
 *   them), so the whole site works offline even for parts not yet opened.
 *   Scripts, styles and data are read from the network first, so a new
 *   release is seen at once, and from the store when there is no signal.
 *   Tiles and photos are read from the store first: they do not change.
 * - NASA map tiles from Mars Trek that the device has looked at. They are
 *   kept as they arrive, and shown again offline (map-view.js asks for them
 *   with "?saved=1", which is answered from the store only).
 *
 * What is NOT kept here: NASA's live data services (space weather, rover
 * weather, raw images). A stored answer from those must never be passed off
 * as live. The page keeps its own dated copy of space weather instead
 * (space-weather-store.js).
 *
 * The signal check (src/lib/connection.js) is never answered from the store:
 * it must reach NASA for real.
 */

const worker = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const SITE_CACHE = 'sol-stroll-site-v1';
const NASA_TILE_CACHE = 'sol-stroll-nasa-tiles-v1';
const MANIFEST_URL = 'offline-manifest.json';
/** Where the version of the last fully saved manifest is remembered. */
const SAVED_VERSION_KEY = '__saved-manifest-version';
/** Site files that never change once published: answered from the store without asking the network. */
const UNCHANGING = [/\/data\/processed\/tiles\//, /\/data\/processed\/ground\//, /\/public\//];
/** NASA's Mars Trek tile server, which allows other sites to read its tiles. */
const NASA_TILE_HOST = 'trek.nasa.gov';
const NASA_TILE_PATH = '/tiles/';
/** Query flag the map adds offline: answer from the store only, never from the network. */
const SAVED_ONLY_PARAM = 'saved';
/** Query flag of the signal check: never touch it. */
const PROBE_PARAM = 'probe';
/** NASA tiles kept at most; the oldest are dropped beyond this (about 46 KB each). */
const MAX_NASA_TILES = 2500;
/** How often, in tiles saved, the store is trimmed to MAX_NASA_TILES. */
const TRIM_EVERY = 100;
/** Site files fetched at once while saving the site in the background. */
const SAVE_BATCH = 6;

let nasaTilesSaved = 0;

worker.addEventListener('install', () => { worker.skipWaiting(); });
worker.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop stores left by an older version of this file.
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('sol-stroll-') && name !== SITE_CACHE && name !== NASA_TILE_CACHE).map((name) => caches.delete(name)));
    await worker.clients.claim();
  })());
});

/**
 * A site file: from the network when there is signal (and kept), from the store when there is not.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function siteFileFreshFirst(request) {
  const cache = await caches.open(SITE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const saved = await cache.match(request, { ignoreSearch: true });
    if (saved) return saved;
    // Opening the site's address with no signal: the page itself is stored as index.html.
    if (request.mode === 'navigate') {
      const page = await cache.match('index.html');
      if (page) return page;
    }
    return Response.error();
  }
}

/**
 * A site file that never changes: from the store, else from the network (and kept).
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function siteFileSavedFirst(request) {
  const cache = await caches.open(SITE_CACHE);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** Drop the oldest NASA tiles beyond the limit. The store lists entries oldest first. */
async function trimNasaTiles() {
  const cache = await caches.open(NASA_TILE_CACHE);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_NASA_TILES)).map((key) => cache.delete(key)));
}

/**
 * A NASA map tile: from the store if the device has seen it; else from NASA, and kept.
 * With the "saved" flag it is answered from the store only.
 * @param {URL} url
 * @returns {Promise<Response>}
 */
async function nasaTile(url) {
  const isSavedOnly = url.searchParams.has(SAVED_ONLY_PARAM);
  // The tile is stored under its plain address, whichever way it was asked for.
  const address = url.origin + url.pathname;
  const cache = await caches.open(NASA_TILE_CACHE);
  const saved = await cache.match(address);
  if (saved) return saved;
  if (isSavedOnly) return new Response(null, { status: 504, statusText: 'Not saved on this device' });
  // Asked for with permission to read (CORS), so the stored copy counts its real size, not a padded one.
  const response = await fetch(address, { mode: 'cors', credentials: 'omit' });
  if (response.ok) {
    cache.put(address, response.clone());
    nasaTilesSaved += 1;
    if (nasaTilesSaved % TRIM_EVERY === 0) trimNasaTiles();
  }
  return response;
}

worker.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.searchParams.has(PROBE_PARAM)) return;
  if (url.origin === worker.location.origin) {
    const isUnchanging = UNCHANGING.some((pattern) => pattern.test(url.pathname));
    event.respondWith(isUnchanging ? siteFileSavedFirst(request) : siteFileFreshFirst(request));
    return;
  }
  if (url.hostname === NASA_TILE_HOST && url.pathname.includes(NASA_TILE_PATH)) {
    event.respondWith(nasaTile(url).catch(() => Response.error()));
  }
  // Anything else (NASA's live data services) goes to the network untouched.
});

/**
 * Tell every open page how far saving the site has got.
 * @param {{ state: 'saving' | 'saved' | 'failed', done: number, total: number }} progress
 */
async function report(progress) {
  for (const client of await worker.clients.matchAll()) client.postMessage({ type: 'offline-store', ...progress });
}

/** Fetch and keep every file the site needs, so it all works with no signal. */
async function saveWholeSite() {
  const cache = await caches.open(SITE_CACHE);
  let manifest;
  try {
    const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    manifest = await response.json();
  } catch {
    // No signal, or no manifest: report what is already stored rather than nothing.
    const savedVersion = await cache.match(SAVED_VERSION_KEY);
    await report({ state: savedVersion ? 'saved' : 'failed', done: 0, total: 0 });
    return;
  }
  /** @type {string[]} */
  const files = Array.isArray(manifest?.files) ? manifest.files.filter((/** @type {unknown} */ file) => typeof file === 'string') : [];
  const version = String(manifest?.version ?? '');
  const savedVersion = await (await cache.match(SAVED_VERSION_KEY))?.text();
  // A new release: every file is fetched again. The same release: only what is missing.
  const isNewRelease = savedVersion !== version;
  let done = 0;
  let failures = 0;
  for (let start = 0; start < files.length; start += SAVE_BATCH) {
    await Promise.all(files.slice(start, start + SAVE_BATCH).map(async (file) => {
      try {
        if (isNewRelease || !(await cache.match(file))) {
          const response = await fetch(file, { cache: 'reload' });
          if (!response.ok) throw new Error(String(response.status));
          await cache.put(file, response);
        }
      } catch {
        failures += 1;
      }
      done += 1;
    }));
    await report({ state: 'saving', done, total: files.length });
  }
  if (failures === 0) await cache.put(SAVED_VERSION_KEY, new Response(version));
  await report({ state: failures === 0 ? 'saved' : 'failed', done: files.length - failures, total: files.length });
}

worker.addEventListener('message', (event) => {
  if (event.data?.type === 'save-site') event.waitUntil(saveWholeSite());
});
