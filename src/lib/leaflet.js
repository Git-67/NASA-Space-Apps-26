// @ts-check
/**
 * Leaflet 1.9.4 (BSD 2-Clause), the map library.
 *
 * index.html loads the official minified build (public/vendor/leaflet/leaflet.js,
 * 147 KB) as a classic script before the page's modules run; this module hands
 * it to them. The minified build is a third of the size of Leaflet's ES module
 * source, which matters on the low-power, offline computers this site targets.
 */
const leaflet = /** @type {any} */ (globalThis).L;
if (!leaflet) throw new Error('The map library did not load (public/vendor/leaflet/leaflet.js).');

export default leaflet;

/**
 * The few parts of a Leaflet layer the page relies on, so JSDoc can name them.
 * @typedef {object} MapLayer
 * @property {(target: object) => MapLayer} addTo
 * @property {() => MapLayer} remove
 * @property {(event: string, handler: (...args: unknown[]) => void) => MapLayer} on
 */

/**
 * The few parts of a Leaflet map the page relies on.
 * @typedef {object} MapView
 * @property {(layer: MapLayer) => boolean} hasLayer
 */
