// @ts-check
/**
 * Contour lines, traced in the browser from NASA's elevation tiles as the map loads.
 *
 * Dataset: Mars Trek layer `Gale_DEM_SMG_1m`, an MRO HiRISE elevation model of
 *          Gale Crater, fetched tile by tile from trek.nasa.gov (CORS allowed).
 * Units:   Trek serves the model as 8-bit grey tiles, with no published scale.
 *          scripts/calibrate_dem.py fitted the scale against Curiosity's
 *          recorded elevations (about 18.6 m per grey step). Each contour is
 *          the boundary between two grey steps, so the contour interval is one
 *          step, and its elevation is interceptM + metresPerLevel × (step + 0.5).
 *          The traced lines are joined and their pixel corners rounded
 *          (contour-model.js); rounding moves a line by under one source pixel.
 * Grid:    the same plain latitude/longitude tiles as the basemap. Beyond the
 *          model's deepest zoom the lines are traced on the deepest tile and
 *          scaled up, so they stay sharp but gain no detail.
 */
import * as L from '../../../public/vendor/leaflet/leaflet-src.esm.js';
import { chainSegments, smoothLine, traceStepContours } from './contour-model.js';

const TILE_PX = 256;
/** Deepest zoom Mars Trek publishes this elevation model at. */
const DEM_MAX_ZOOM = 14;
/** Extent of the elevation model, from its Mars Trek capabilities file. */
const DEM_BOUNDS = L.latLngBounds([-4.9254743, 137.1224711], [-4.2489631, 137.7298129]);
/** Dark casing under each line and the line itself, in pixels. */
const CASING_WIDTH_PX = 3;
const LINE_WIDTH_PX = 1;
/** Below this zoom the lines merge into a solid mass, so the layer is not drawn. */
const CONTOUR_MIN_ZOOM = 12;
/** Corner-cutting passes that round the traced lines. Two passes remove the pixel staircase. */
const SMOOTHING_PASSES = 2;
/** Data layers sit at 60 to 80 percent opacity so the terrain stays readable (DESIGN.md). */
const LAYER_OPACITY = 0.8;

/**
 * Read a colour token from the page's stylesheet, so canvas drawing uses DESIGN.md's values.
 * @param {string} name Custom property name, for example "--color-map-ink".
 * @returns {string}
 */
function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Load one elevation tile and read its grey levels.
 * @param {string} url Tile URL.
 * @returns {Promise<Float32Array>} Grey level per pixel, row by row; NaN where the model has no data.
 */
function loadGreyLevels(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous'; // needed to read the pixels; Mars Trek allows it
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = TILE_PX;
      canvas.height = TILE_PX;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        reject(new Error('This browser cannot draw on a canvas.'));
        return;
      }
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, TILE_PX, TILE_PX);
      const levels = new Float32Array(TILE_PX * TILE_PX);
      for (let i = 0; i < levels.length; i += 1) levels[i] = data[i * 4 + 3] === 0 ? NaN : data[i * 4];
      resolve(levels);
    };
    image.onerror = () => reject(new Error(`Elevation tile not available: ${url}`));
    image.src = url;
  });
}

/**
 * Create the contour layer.
 * @param {string} tileUrlTemplate Mars Trek tile URL with {z}, {y} (row) and {x} (column).
 * @returns {L.GridLayer} A Leaflet layer; listen to its "loading", "load" and "tileerror" events for status.
 */
export function createContourLayer(tileUrlTemplate) {
  /** @type {Map<string, Promise<number[][]>>} */
  const contoursByTile = new Map();

  /** @param {number} z @param {number} row @param {number} column */
  const contoursFor = (z, row, column) => {
    const key = `${z}/${row}/${column}`;
    let contours = contoursByTile.get(key);
    if (!contours) {
      const url = tileUrlTemplate.replace('{z}', String(z)).replace('{y}', String(row)).replace('{x}', String(column));
      contours = loadGreyLevels(url).then((levels) => traceStepContours(levels, TILE_PX, TILE_PX)
        .flatMap(({ segments }) => chainSegments(segments).map((line) => smoothLine(line, SMOOTHING_PASSES))));
      contours.catch(() => contoursByTile.delete(key)); // let a later view try again
      contoursByTile.set(key, contours);
    }
    return contours;
  };

  const ContourLayer = L.GridLayer.extend({
    /**
     * @param {{ x: number, y: number, z: number }} coords Tile column, row and zoom.
     * @param {(error: Error | null, tile: HTMLElement) => void} done
     */
    createTile(coords, done) {
      const tile = document.createElement('canvas');
      tile.width = TILE_PX;
      tile.height = TILE_PX;
      const demZoom = Math.min(coords.z, DEM_MAX_ZOOM);
      const scale = 2 ** (coords.z - demZoom);
      const offsetX = (coords.x % scale) * (TILE_PX / scale);
      const offsetY = (coords.y % scale) * (TILE_PX / scale);
      contoursFor(demZoom, Math.floor(coords.y / scale), Math.floor(coords.x / scale))
        .then((contours) => {
          const context = tile.getContext('2d');
          if (!context) throw new Error('This browser cannot draw on a canvas.');
          context.lineCap = 'round';
          context.lineJoin = 'round';
          for (const [colour, width] of [[token('--color-route-casing'), CASING_WIDTH_PX], [token('--color-map-ink'), LINE_WIDTH_PX]]) {
            context.strokeStyle = String(colour);
            context.lineWidth = Number(width);
            context.beginPath();
            for (const line of contours) {
              context.moveTo((line[0] - offsetX) * scale, (line[1] - offsetY) * scale);
              for (let i = 2; i < line.length; i += 2) context.lineTo((line[i] - offsetX) * scale, (line[i + 1] - offsetY) * scale);
            }
            context.stroke();
          }
          done(null, tile);
        })
        .catch((error) => done(error instanceof Error ? error : new Error(String(error)), tile));
      return tile;
    },
  });

  return new ContourLayer({ bounds: DEM_BOUNDS, minZoom: CONTOUR_MIN_ZOOM, opacity: LAYER_OPACITY, className: 'map-contour-layer' });
}
