// @ts-check
/**
 * Where the map imagery comes from, online and offline.
 *
 * Online, tiles come straight from NASA (Mars Trek and Curiosity's location
 * map), with their full extent and resolution. Offline, the site uses the
 * small set stored with it (scripts/build_offline_tiles.py): the walk area in
 * detail and the whole crater coarsely. Paths are relative, because the site
 * may be served from a sub-path or opened locally. The offline areas match
 * the script's; change both together.
 */
import L from '../../lib/leaflet.js';

/** @typedef {'online' | 'offline'} ConnectionMode */
/**
 * @typedef {object} TileSet
 * @property {string} url Leaflet tile URL template.
 * @property {object} bounds Leaflet LatLngBounds of the area the tiles cover; nothing is requested outside it.
 * @property {number} minZoom First zoom shown (on the map's grid).
 * @property {number} maxZoom Last zoom with real tiles; beyond it Leaflet enlarges the last ones.
 * @property {boolean} isRemote Whether the tiles come over the network from NASA.
 */
/** @typedef {{ hirise: TileSet, ctx: TileSet, dem: TileSet, colour: TileSet }} TileSets */

const LOCAL = 'data/processed/tiles';
const TREK = 'https://trek.nasa.gov/tiles/Mars/EQ';
/** Mars Trek puts the row ({y}) before the column ({x}). */
const TREK_PATH = '1.0.0/default/default028mm/{z}/{y}/{x}.png';
const CURIOSITY_MAP = 'https://mars.nasa.gov/mmgis-maps/MSL/Layers';

/** Every safe path and stop plus about 350 m (south-west, north-east corners). */
const WALK_AREA = L.latLngBounds([-4.815, 137.373], [-4.794, 137.390]);
/** The whole of Gale Crater, as covered by the MRO CTX mosaic (Mars Trek capabilities file). */
const CRATER = L.latLngBounds([-7.2137273, 136.2768326], [-3.5804738, 139.3864225]);
/** Extent of the HiRISE grayscale mosaic and elevation model (Mars Trek capabilities files). */
const HIRISE_AREA = L.latLngBounds([-4.9254743, 137.1224669], [-4.2489588, 137.7298129]);
/** Extent of the colour mosaic (Curiosity location map configuration). */
const COLOUR_AREA = L.latLngBounds([-4.87560429259321, 137.32672354505786], [-4.55506331169111, 137.4785574965306]);

/** @type {Record<ConnectionMode, TileSets>} */
export const TILE_SOURCES = {
  online: {
    hirise: { url: `${TREK}/curiosity_hirise_mosaic/${TREK_PATH}`, bounds: HIRISE_AREA, minZoom: 10, maxZoom: 16, isRemote: true },
    ctx: { url: `${TREK}/curiosity_ctx_mosaic/${TREK_PATH}`, bounds: CRATER, minZoom: 8, maxZoom: 10, isRemote: true },
    dem: { url: `${TREK}/Gale_DEM_SMG_1m/${TREK_PATH}`, bounds: HIRISE_AREA, minZoom: 12, maxZoom: 14, isRemote: true },
    // Web Mercator tiles, TMS rows, one Mercator zoom deeper than the map's: map zoom 9 to 17 is Mercator 10 to 18.
    colour: { url: `${CURIOSITY_MAP}/MSL_Gale_HiRISE-LRGB_78quads/{z}/{x}/{y}.png`, bounds: COLOUR_AREA, minZoom: 9, maxZoom: 17, isRemote: true },
  },
  offline: {
    hirise: { url: `${LOCAL}/hirise/{z}/{y}/{x}.jpg`, bounds: WALK_AREA, minZoom: 12, maxZoom: 16, isRemote: false },
    ctx: { url: `${LOCAL}/ctx/{z}/{y}/{x}.jpg`, bounds: CRATER, minZoom: 8, maxZoom: 10, isRemote: false },
    dem: { url: `${LOCAL}/dem/{z}/{y}/{x}.png`, bounds: WALK_AREA, minZoom: 12, maxZoom: 14, isRemote: false },
    colour: { url: `${LOCAL}/colour/{z}/{x}/{y}.jpg`, bounds: WALK_AREA, minZoom: 13, maxZoom: 15, isRemote: false },
  },
};
