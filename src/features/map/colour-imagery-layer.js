// @ts-check
/**
 * Colour orbital imagery of Curiosity's drive.
 *
 * Dataset: "MSL_Gale_HiRISE-LRGB_78quads", a colour MRO HiRISE mosaic of the
 *          area around Curiosity's drive, served by NASA's Curiosity location
 *          map on mars.nasa.gov (credit NASA/JPL/University of Arizona).
 * Grid:    the source is cut in Web Mercator tiles numbered from the bottom
 *          (TMS). The map uses Mars Trek's plain latitude/longitude tiles, so
 *          each map tile is assembled from the Mercator rows that cover it;
 *          see mercator-tiles.js. Nothing is resampled beyond that placement.
 */
import * as L from '../../../public/vendor/leaflet/leaflet-src.esm.js';
import { mercatorRowsForBand, toTmsRow } from './mercator-tiles.js';

const TILE_PX = 256;
const COLOUR_TILES = 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/MSL_Gale_HiRISE-LRGB_78quads';
/** Deepest zoom the colour mosaic is published at. */
const COLOUR_MAX_ZOOM = 18;
/** Deepest map zoom drawn from the source: one Mercator zoom deeper is the mosaic's limit. Leaflet enlarges beyond it. */
const COLOUR_MAX_MAP_ZOOM = COLOUR_MAX_ZOOM - 1;
/** The mission map publishes the mosaic from Mercator zoom 10, so map zoom 9 is the widest drawn from source. */
const COLOUR_MIN_MAP_ZOOM = 9;
/** Extent of the colour mosaic, from the mission map's configuration. */
const COLOUR_BOUNDS = L.latLngBounds([-4.87560429259321, 137.32672354505786], [-4.55506331169111, 137.4785574965306]);

/**
 * @param {string} url
 * @returns {Promise<HTMLImageElement | null>} The image, or null if the server has no tile there.
 */
function loadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/**
 * Create the colour imagery layer.
 * @returns {L.GridLayer} A Leaflet layer; listen to its "tileerror" event for failures.
 */
export function createColourImageryLayer() {
  const ColourLayer = L.GridLayer.extend({
    /**
     * @param {{ x: number, y: number, z: number }} coords Tile column, row and zoom on the map's grid.
     * @param {(error: Error | null, tile: HTMLElement) => void} done
     */
    createTile(coords, done) {
      const tile = document.createElement('canvas');
      tile.width = TILE_PX;
      tile.height = TILE_PX;
      // On the map's grid a tile spans 180 / 2^z degrees; the Mercator tile one zoom deeper spans the same longitudes.
      const tileDeg = 180 / 2 ** coords.z;
      const north = 90 - coords.y * tileDeg;
      const mercatorZoom = coords.z + 1;
      const rows = mercatorRowsForBand(north, north - tileDeg, mercatorZoom, TILE_PX);
      Promise.all(rows.map(({ row }) => loadImage(`${COLOUR_TILES}/${mercatorZoom}/${coords.x}/${toTmsRow(row, mercatorZoom)}.png`)))
        .then((images) => {
          const context = tile.getContext('2d');
          if (!context || images.every((image) => image === null)) {
            done(new Error('Colour imagery is not available for this part of the map.'), tile);
            return;
          }
          images.forEach((image, index) => {
            if (image) context.drawImage(image, 0, rows[index].topPx, TILE_PX, rows[index].heightPx);
          });
          done(null, tile);
        });
      return tile;
    },
  });

  return new ColourLayer({ bounds: COLOUR_BOUNDS, minNativeZoom: COLOUR_MIN_MAP_ZOOM, maxNativeZoom: COLOUR_MAX_MAP_ZOOM, className: 'map-colour-layer' });
}
