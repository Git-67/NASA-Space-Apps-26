// @ts-check
/**
 * Latitude and longitude grid over the map, redrawn whenever the view changes.
 * Positions are degrees as the map's sources give them; see graticule-model.js.
 */
import L from '../../lib/leaflet.js';
import { el } from '../../lib/dom.js';
import { chooseGridStep, formatGridDegrees, gridValues } from './graticule-model.js';

/** How far beyond the view the lines run, as a share of the view, so panning does not show their ends. */
const LINE_OVERRUN = 0.5;
/** Latitude labels start this far below the map's top edge, in pixels, clear of the layer panel button. */
const LABEL_INSET_PX = 64;
/** Longitude labels stop this far from the map's right edge, in pixels, clear of the zoom buttons. */
const RIGHT_INSET_PX = 120;

/**
 * A grid label pinned to a point on the map.
 * @param {L.LatLng} position
 * @param {string} text
 * @param {'is-latitude' | 'is-longitude'} kind Latitude labels sit right of their point, longitude labels centred below it.
 * @returns {L.Marker}
 */
function gridLabel(position, text, kind) {
  return L.marker(position, {
    icon: L.divIcon({ html: el('span', { className: `map-label map-grid-label ${kind}`, text }), className: 'map-label-anchor', iconSize: [0, 0] }),
    interactive: false,
    keyboard: false,
  });
}

/**
 * Create the grid layer.
 * @returns {L.Layer}
 */
export function createGraticuleLayer() {
  const GraticuleLayer = L.Layer.extend({
    /** @param {L.Map} map */
    onAdd(map) {
      this._lines = L.layerGroup().addTo(map);
      map.on('moveend', this._redraw, this);
      this._redraw();
      return this;
    },
    /** @param {L.Map} map */
    onRemove(map) {
      map.off('moveend', this._redraw, this);
      this._lines.remove();
      return this;
    },
    _redraw() {
      const map = this._map;
      const view = map.getBounds();
      const reach = view.pad(LINE_OVERRUN);
      const step = chooseGridStep(Math.max(view.getNorth() - view.getSouth(), view.getEast() - view.getWest()));
      // Labels go along the left and top edges, inset so they clear the map's controls.
      const size = map.getSize();
      const labelWest = map.containerPointToLatLng([LABEL_INSET_PX / 4, 0]).lng;
      const labelNorth = map.containerPointToLatLng([0, LABEL_INSET_PX / 4]).lat;
      const minLabelY = map.containerPointToLatLng([0, LABEL_INSET_PX]).lat;
      const maxLabelX = map.containerPointToLatLng([size.x - RIGHT_INSET_PX, 0]).lng;
      this._lines.clearLayers();
      for (const lat of gridValues(view.getSouth(), view.getNorth(), step)) {
        L.polyline([[lat, reach.getWest()], [lat, reach.getEast()]], { className: 'map-graticule', interactive: false }).addTo(this._lines);
        if (lat < minLabelY) gridLabel(L.latLng(lat, labelWest), formatGridDegrees(lat, step), 'is-latitude').addTo(this._lines);
      }
      for (const lon of gridValues(view.getWest(), view.getEast(), step)) {
        L.polyline([[reach.getSouth(), lon], [reach.getNorth(), lon]], { className: 'map-graticule', interactive: false }).addTo(this._lines);
        if (lon < maxLabelX) gridLabel(L.latLng(labelNorth, lon), formatGridDegrees(lon, step), 'is-longitude').addTo(this._lines);
      }
    },
  });
  return new GraticuleLayer();
}
