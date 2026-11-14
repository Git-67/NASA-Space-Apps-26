// @ts-check
/**
 * The map's optional layers and the panel that switches them: colour imagery,
 * contour lines, place names and a latitude/longitude grid.
 *
 * Every layer works on both imagery choices. Over colour imagery the route
 * and contours rely on their dark casing to stay readable (DESIGN.md, Mars
 * map rules: team decision of 14 Nov 2026).
 */
import { createColourImageryLayer } from './colour-imagery-layer.js';
import { createContourLayer } from './contour-layer.js';
import { createGraticuleLayer } from './graticule-layer.js';
import { createLayerPanel } from './layer-panel.js';
import { createPlaceLabelLayer } from './place-label-layer.js';

/** @typedef {import('./map-layer-data.js').Place} Place */
/** @typedef {import('./map-layer-data.js').DemCalibration} DemCalibration */
/** @typedef {import('./place-label-layer.js').LabelledPlace} LabelledPlace */

const GRAYSCALE = 'grayscale';
const COLOUR = 'colour';
const CONTOURS = 'contours';
const NAMES = 'names';
const GRID = 'grid';

/**
 * Report a tiled layer's progress and failures in the panel.
 * @param {import('../../lib/leaflet.js').MapLayer} layer
 * @param {(message: string) => void} setStatus
 * @param {string} loadingMessage Shown while tiles load.
 * @param {string} failureMessage Shown when any tile in the view failed.
 */
function reportProgress(layer, setStatus, loadingMessage, failureMessage) {
  let failedTiles = 0;
  layer.on('loading', () => { failedTiles = 0; setStatus(loadingMessage); });
  layer.on('tileerror', () => { failedTiles += 1; });
  layer.on('load', () => setStatus(failedTiles > 0 ? failureMessage : ''));
}

/**
 * Add the optional layers and their panel to a map.
 * @param {import('../../lib/leaflet.js').MapView} map
 * @param {object} options
 * @param {LabelledPlace[]} options.stopLabels Names of the walk's stops, at their positions.
 * @param {Place[] | Error} options.places Places Curiosity explored, or why they could not be loaded.
 * @param {DemCalibration | Error} options.calibration Scale of the elevation tiles, or why it could not be loaded.
 * @param {import('./tile-sources.js').TileSets} options.tiles Where to read imagery and elevation at start.
 * @returns {{ setTiles: (tiles: import('./tile-sources.js').TileSets) => void }} Switch every tiled layer to other tiles (online or offline).
 */
export function addLayerOptions(map, { stopLabels, places, calibration, tiles }) {
  let colourLayer = createColourImageryLayer(tiles.colour);
  let contourLayer = calibration instanceof Error ? null : createContourLayer(tiles.dem);
  const stopLabelLayer = createPlaceLabelLayer(stopLabels);
  const placeLabelLayer = places instanceof Error ? null
    : createPlaceLabelLayer(places.map((place) => ({ ...place, hasMarker: true })));
  const gridLayer = createGraticuleLayer();
  const shown = new Set();
  let isColour = false;

  /** Put every layer in the state the choices ask for. */
  const apply = () => {
    /** @type {[import('../../lib/leaflet.js').MapLayer | null, boolean][]} */
    const wanted = [
      [colourLayer, isColour],
      [contourLayer, shown.has(CONTOURS)],
      [stopLabelLayer, shown.has(NAMES)],
      [placeLabelLayer, shown.has(NAMES)],
      [gridLayer, shown.has(GRID)],
    ];
    for (const [layer, isWanted] of wanted) {
      if (!layer) continue;
      if (isWanted && !map.hasLayer(layer)) layer.addTo(map);
      if (!isWanted && map.hasLayer(layer)) layer.remove();
    }
  };

  const contourNote = calibration instanceof Error ? 'NASA Mars Trek elevation (MRO HiRISE).'
    : `One line every ${calibration.metresPerLevel.toFixed(0)} m of height, from NASA Mars Trek (MRO HiRISE). `
      + `Derived; about ±${Math.round(calibration.rmsErrorM)} m. Zoom in to see them.`;

  const panel = createLayerPanel({
    imagery: [
      { id: GRAYSCALE, label: 'MRO HiRISE, grayscale', icon: 'filter_b_and_w', note: 'NASA Mars Trek. Sharp around the walk; MRO CTX elsewhere.' },
      { id: COLOUR, label: 'MRO HiRISE, colour', icon: 'palette', note: "NASA's Curiosity map. Around the walk only." },
    ],
    overlays: [
      { id: CONTOURS, label: 'Contour lines', icon: 'landscape', note: contourNote, unavailableReason: calibration instanceof Error ? calibration.message : undefined },
      { id: NAMES, label: 'Place names', icon: 'label', note: "Stops, plus places Curiosity explored (NASA). Those are north: zoom out to see them.", unavailableReason: places instanceof Error ? places.message : undefined },
      { id: GRID, label: 'Latitude and longitude grid', icon: 'grid_on', note: 'Degrees as NASA gives them. Convention not yet confirmed.' },
    ],
    onImageryChange: (id) => { isColour = id === COLOUR; apply(); },
    onOverlayChange: (id, isShown) => { if (isShown) shown.add(id); else shown.delete(id); apply(); },
  });
  panel.control.addTo(map);

  /** Report progress and failures of the current tiled layers in the panel. */
  const watch = () => {
    if (contourLayer) {
      reportProgress(contourLayer, (message) => panel.setStatus(CONTOURS, message),
        'Drawing contours…', 'Some elevation tiles are missing. Lines may be missing.');
    }
    reportProgress(colourLayer, (message) => panel.setStatus(COLOUR, message),
      'Loading colour imagery…', 'Some colour tiles are missing.');
  };
  watch();
  apply();

  return {
    setTiles(next) {
      for (const layer of [colourLayer, contourLayer]) if (layer && map.hasLayer(layer)) layer.remove();
      colourLayer = createColourImageryLayer(next.colour);
      contourLayer = calibration instanceof Error ? null : createContourLayer(next.dem);
      watch();
      apply();
    },
  };
}
