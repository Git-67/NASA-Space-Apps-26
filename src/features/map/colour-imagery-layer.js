// @ts-check
/**
 * Colour orbital imagery of Curiosity's drive.
 *
 * Dataset: "MSL_Gale_HiRISE-LRGB_78quads", a colour MRO HiRISE mosaic of the
 *          area around Curiosity's drive, from NASA's Curiosity location map
 *          (credit NASA/JPL/University of Arizona). Read live when online;
 *          offline, the walk area stored with the site (tile-sources.js).
 * Grid:    the source is cut in Web Mercator tiles numbered from the bottom
 *          (TMS). The map uses Mars Trek's plain latitude/longitude tiles, so
 *          each map tile is assembled from the Mercator rows that cover it;
 *          see mercator-tiles.js. Nothing is resampled beyond that placement.
 */
import L from '../../lib/leaflet.js';
import { mercatorRowsForBand, toTmsRow } from './mercator-tiles.js';

const TILE_PX = 256;
/** @typedef {import('./tile-sources.js').TileSet} TileSet */

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
 * @param {TileSet} colour Where to read the colour tiles.
 * @returns {L.GridLayer} A Leaflet layer; listen to its "tileerror" event for failures.
 */
export function createColourImageryLayer(colour) {
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
      Promise.all(rows.map(({ row }) => loadImage(colour.url.replace('{z}', String(mercatorZoom)).replace('{x}', String(coords.x)).replace('{y}', String(toTmsRow(row, mercatorZoom))))))
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

  return new ColourLayer({ bounds: colour.bounds, minZoom: colour.minZoom, maxNativeZoom: colour.maxZoom, className: 'map-colour-layer' });
}
