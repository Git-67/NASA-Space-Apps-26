// @ts-check
/**
 * Name labels for places on the map. Each label sits on a solid raised panel
 * (DESIGN.md: no bare text over imagery), and labels that would overlap are
 * stacked downwards; see label-stacking.js.
 */
import * as L from '../../../public/vendor/leaflet/leaflet-src.esm.js';
import { el } from '../../lib/dom.js';
import { stackLabels } from './label-stacking.js';

/** Space between stacked labels, in pixels. */
const LABEL_GAP_PX = 4;

/**
 * @typedef {object} LabelledPlace
 * @property {string} name Text of the label.
 * @property {number} lat Latitude in degrees.
 * @property {number} lon Longitude in degrees.
 * @property {boolean} hasMarker Draw a point marker under the name. False when the place already has its own marker, as the stops do.
 */

/**
 * Create a layer of name labels.
 * @param {LabelledPlace[]} places
 * @returns {L.Layer}
 */
export function createPlaceLabelLayer(places) {
  const PlaceLabelLayer = L.Layer.extend({
    /** @param {L.Map} map */
    onAdd(map) {
      /** @type {{ position: L.LatLng, label: HTMLElement }[]} */
      this._labels = [];
      this._group = L.layerGroup().addTo(map);
      for (const place of places) {
        const position = L.latLng(place.lat, place.lon);
        const label = el('span', { className: place.hasMarker ? 'map-label has-marker' : 'map-label', text: place.name });
        const html = place.hasMarker ? el('span', { className: 'map-place' }, [el('span', { className: 'map-marker' }), label]) : label;
        L.marker(position, {
          icon: L.divIcon({ html, className: 'map-label-anchor', iconSize: [0, 0] }),
          interactive: false,
          keyboard: false,
        }).addTo(this._group);
        this._labels.push({ position, label });
      }
      map.on('zoomend', this._stack, this);
      this._stack();
      return this;
    },
    /** @param {L.Map} map */
    onRemove(map) {
      map.off('zoomend', this._stack, this);
      this._group.remove();
      return this;
    },
    /** Move labels that would cover each other. Runs after each zoom, when their screen positions change. */
    _stack() {
      const boxes = this._labels.map((/** @type {{ position: L.LatLng, label: HTMLElement }} */ { position, label }) => {
        label.style.translate = '';
        const point = this._map.latLngToContainerPoint(position);
        return { x: point.x, y: point.y, width: label.offsetWidth, height: label.offsetHeight };
      });
      stackLabels(boxes, LABEL_GAP_PX).forEach((shift, index) => {
        if (shift > 0) this._labels[index].label.style.translate = `0 ${shift}px`;
      });
    },
  });
  return new PlaceLabelLayer();
}
