// @ts-check
/**
 * The map's optional layers and the panel that switches them: colour imagery,
 * contour lines, place names and a latitude/longitude grid.
 *
 * One rule from DESIGN.md shapes this: colour imagery is for looking at the
 * place, and no data is drawn over it, so that colour on the map always means
 * data. While the colour view is on, the route, the stops and the contours are
 * hidden and their options are greyed out; switching back restores them.
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
 * @param {import('../../../public/vendor/leaflet/leaflet-src.esm.js').GridLayer} layer
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
 * @param {import('../../../public/vendor/leaflet/leaflet-src.esm.js').Map} map
 * @param {object} options
 * @param {import('../../../public/vendor/leaflet/leaflet-src.esm.js').Layer} options.routeLayer The route and stop markers.
 * @param {LabelledPlace[]} options.stopLabels Names of the walk's stops, at their positions.
 * @param {Place[] | Error} options.places Places Curiosity explored, or why they could not be loaded.
 * @param {DemCalibration | Error} options.calibration Scale of the elevation tiles, or why it could not be loaded.
 * @param {string} options.demTileUrl Mars Trek tile URL of the elevation model, with {z}, {y} and {x}.
 */
export function addLayerOptions(map, { routeLayer, stopLabels, places, calibration, demTileUrl }) {
  const colourLayer = createColourImageryLayer();
  const contourLayer = calibration instanceof Error ? null : createContourLayer(demTileUrl);
  const stopLabelLayer = createPlaceLabelLayer(stopLabels);
  const placeLabelLayer = places instanceof Error ? null
    : createPlaceLabelLayer(places.map((place) => ({ ...place, hasMarker: true })));
  const gridLayer = createGraticuleLayer();
  const shown = new Set();
  let isColour = false;

  /** Put every layer in the state the choices ask for. */
  const apply = () => {
    /** @type {[import('../../../public/vendor/leaflet/leaflet-src.esm.js').Layer | null, boolean][]} */
    const wanted = [
      [colourLayer, isColour],
      [routeLayer, !isColour],
      [contourLayer, !isColour && shown.has(CONTOURS)],
      [stopLabelLayer, !isColour && shown.has(NAMES)],
      [placeLabelLayer, shown.has(NAMES)],
      [gridLayer, shown.has(GRID)],
    ];
    for (const [layer, isWanted] of wanted) {
      if (!layer) continue;
      if (isWanted && !map.hasLayer(layer)) layer.addTo(map);
      if (!isWanted && map.hasLayer(layer)) layer.remove();
    }
    panel.setDisabled(CONTOURS, isColour || !contourLayer);
  };

  const contourNote = calibration instanceof Error ? 'Elevation from NASA Mars Trek (MRO HiRISE Gale elevation model).'
    : `Derived. A line every ${calibration.metresPerLevel.toFixed(1)} m of height, traced in your browser from NASA Mars Trek's `
      + `Gale elevation model (MRO HiRISE) as the map loads. Trek serves it only as 8-bit images, so that step is the finest it allows; `
      + `we matched the steps to ${calibration.waypointCount} Curiosity elevations (typical error ${calibration.rmsErrorM} m).`;

  const panel = createLayerPanel({
    imagery: [
      { id: GRAYSCALE, label: 'MRO HiRISE, grayscale', note: 'NASA Mars Trek mosaic. The route and data layers are drawn on this view.' },
      { id: COLOUR, label: 'MRO HiRISE, colour', note: "From NASA's Curiosity location map. It covers only the area around Curiosity's drive. The route, stops and contours are hidden in this view so that colour never stands for data." },
    ],
    overlays: [
      { id: CONTOURS, label: 'Contour lines', note: contourNote, unavailableReason: calibration instanceof Error ? calibration.message : undefined },
      { id: NAMES, label: 'Place names', note: "The stops, and places Curiosity explored as named by NASA's Curiosity location map. Those lie north of the boxwork, along the rover's earlier drive: zoom out and pan north to see them.", unavailableReason: places instanceof Error ? places.message : undefined },
      { id: GRID, label: 'Latitude and longitude grid', note: 'Degrees as the sources give them. Their convention (planetocentric or planetographic) is not yet confirmed.' },
    ],
    onImageryChange: (id) => { isColour = id === COLOUR; apply(); },
    onOverlayChange: (id, isShown) => { if (isShown) shown.add(id); else shown.delete(id); apply(); },
  });
  panel.control.addTo(map);

  if (contourLayer) {
    reportProgress(contourLayer, (message) => panel.setStatus(CONTOURS, message),
      'Loading elevation tiles from NASA Mars Trek…', 'Some elevation tiles could not be loaded from NASA Mars Trek, so some lines are missing.');
  }
  reportProgress(colourLayer, (message) => panel.setStatus(COLOUR, message),
    'Loading colour imagery from NASA…', "Some colour tiles could not be loaded from NASA's Curiosity map.");
  apply();
}
