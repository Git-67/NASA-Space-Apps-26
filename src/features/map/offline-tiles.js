// @ts-check
/**
 * The map imagery stored with the site, so it works with no network (see
 * scripts/build_offline_tiles.py, which writes these files). Paths are
 * relative, because the site may be served from a sub-path or opened locally.
 * Areas match the script's; change both together.
 */
import L from '../../lib/leaflet.js';

const TILES = 'data/processed/tiles';
/** Every safe path and stop plus about 350 m (south-west, north-east corners). */
const WALK_AREA = L.latLngBounds([-4.815, 137.373], [-4.794, 137.390]);
/** The whole of Gale Crater, as covered by the MRO CTX mosaic. */
const CRATER = L.latLngBounds([-7.2137273, 136.2768326], [-3.5804738, 139.3864225]);

/**
 * @typedef {object} TileSet
 * @property {string} url Leaflet tile URL template.
 * @property {L.LatLngBounds} bounds Area the tiles cover; nothing is requested outside it.
 * @property {number} minZoom First stored zoom (on the map's grid).
 * @property {number} maxZoom Last stored zoom; beyond it Leaflet enlarges the last tiles.
 */

/** @type {{ hirise: TileSet, ctx: TileSet, dem: TileSet, colour: TileSet }} */
export const OFFLINE_TILES = {
  /** MRO HiRISE grayscale, from NASA Mars Trek. Trek order: row ({y}) before column ({x}). */
  hirise: { url: `${TILES}/hirise/{z}/{y}/{x}.jpg`, bounds: WALK_AREA, minZoom: 12, maxZoom: 16 },
  /** MRO CTX grayscale, the whole crater, from NASA Mars Trek. */
  ctx: { url: `${TILES}/ctx/{z}/{y}/{x}.jpg`, bounds: CRATER, minZoom: 8, maxZoom: 10 },
  /** MRO HiRISE elevation model, grey levels unchanged (PNG). */
  dem: { url: `${TILES}/dem/{z}/{y}/{x}.png`, bounds: WALK_AREA, minZoom: 12, maxZoom: 14 },
  /**
   * MRO HiRISE colour, Web Mercator tiles stored as on the source: {z}/{col}/{tms row}.
   * Zooms here are on the map's grid; the Mercator zoom is one higher (see mercator-tiles.js).
   */
  colour: { url: `${TILES}/colour/{z}/{x}/{y}.jpg`, bounds: WALK_AREA, minZoom: 13, maxZoom: 15 },
};
