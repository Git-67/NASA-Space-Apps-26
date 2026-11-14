// @ts-check
/**
 * The map: Mars imagery, Curiosity's path and the numbered stops.
 *
 * Imagery:  MRO HiRISE "Curiosity Roving Site Mosaic", served as tiles by NASA Mars Trek.
 * Route:    Curiosity waypoints (NASA/JPL-Caltech), from data/processed/route.json.
 * Coordinates are plotted exactly as the sources give them, in degrees. The
 * tiles use a plain latitude/longitude grid, so the map uses the same grid
 * (Leaflet's EPSG:4326) with Mars' radius in place of Earth's, which makes
 * the scale bar and distances correct for Mars.
 */
import * as L from '../../../public/vendor/leaflet/leaflet-src.esm.js';
import { MARS_RADIUS_M } from '../../lib/mars.js';
import { el } from '../../lib/dom.js';

/** @typedef {import('../plan/plan-model.js').Route} Route */

const TREK_TILES = 'https://trek.nasa.gov/tiles/Mars/EQ';
/** Mars Trek puts the row before the column, the reverse of the usual order. */
const TILE_PATH = '1.0.0/default/default028mm/{z}/{y}/{x}.png';
const HIRISE_LAYER = 'curiosity_hirise_mosaic';
/** Deepest zoom the HiRISE mosaic is published at. The map never zooms past it, so imagery is never stretched. */
const HIRISE_MAX_ZOOM = 16;
const MIN_ZOOM = 12;
/** Extent of the HiRISE mosaic, from its Mars Trek capabilities file: south-west and north-east corners. */
const MOSAIC_BOUNDS = L.latLngBounds([-4.9254743, 137.1224669], [-4.2489588, 137.7298129]);
const ROUTE_PADDING_PX = 48;
/** Side of the square hit area around each stop badge, in pixels (the 44px touch target). */
const HIT_AREA_PX = 44;
/** Stops closer together than this, in metres, would hide each other on the map. */
const CROWDED_STOPS_M = 30;
/** How far each badge of a crowded pair is nudged sideways, in pixels, so both stay visible. */
const CROWDED_NUDGE_PX = 14;

/** Leaflet's latitude/longitude grid, measured on Mars instead of Earth. */
const MARS_CRS = L.extend({}, L.CRS.EPSG4326, { R: MARS_RADIUS_M });

/**
 * Draw the map.
 * @param {HTMLElement} container Element that will hold the map.
 * @param {Route} route The prepared route.
 * @param {(stopId: string) => void} onStopChosen Called when a visitor activates a stop marker.
 * @returns {{ setVisitedStops: (stopIds: string[]) => void, highlightStop: (stopId: string) => void }}
 */
export function createMapView(container, route, onStopChosen) {
  const map = L.map(container, {
    crs: MARS_CRS,
    minZoom: MIN_ZOOM,
    maxZoom: HIRISE_MAX_ZOOM,
    maxBounds: MOSAIC_BOUNDS,
    zoomControl: false,
    attributionControl: false,
  });

  L.tileLayer(`${TREK_TILES}/${HIRISE_LAYER}/${TILE_PATH}`, {
    bounds: MOSAIC_BOUNDS,
    minZoom: MIN_ZOOM,
    maxZoom: HIRISE_MAX_ZOOM,
  }).addTo(map);

  L.control.zoom({ position: 'topright', zoomInTitle: 'Zoom in', zoomOutTitle: 'Zoom out' }).addTo(map);
  // Metric only: SI units throughout (DESIGN.md, Mars conventions).
  L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

  const path = route.points.map((point) => L.latLng(point.lat, point.lon));
  // Two lines, dark under bright: the casing keeps the route readable on pale dust and dark rock alike.
  L.polyline(path, { className: 'map-route-casing', interactive: false }).addTo(map);
  L.polyline(path, { className: 'map-route', interactive: false }).addTo(map);

  /** @type {Map<string, HTMLElement>} */
  const markerElements = new Map();
  const stopPositions = route.stops.map((stop) => L.latLng(route.points[stop.pointIndex].lat, route.points[stop.pointIndex].lon));
  /**
   * Sideways nudge for a stop's badge. Two drill sites sit about 12 m apart, so their badges
   * would cover each other. The first of such a pair moves left and the second right.
   * Only the badge moves: the stop's coordinates are unchanged.
   * @param {number} index Position of the stop in the route.
   * @returns {number} Offset in pixels; negative is left.
   */
  const nudgeFor = (index) => {
    const isNear = (/** @type {number} */ other) => other >= 0 && other < stopPositions.length
      && map.distance(stopPositions[index], stopPositions[other]) < CROWDED_STOPS_M;
    if (isNear(index + 1)) return -CROWDED_NUDGE_PX;
    if (isNear(index - 1)) return CROWDED_NUDGE_PX;
    return 0;
  };

  route.stops.forEach((stop, index) => {
    const point = route.points[stop.pointIndex];
    const badge = el('span', { className: 'map-waypoint', text: String(index + 1) });
    markerElements.set(stop.id, badge);
    const marker = L.marker([point.lat, point.lon], {
      icon: L.divIcon({
        html: badge,
        className: 'map-waypoint-hit',
        iconSize: [HIT_AREA_PX, HIT_AREA_PX],
        iconAnchor: [HIT_AREA_PX / 2 - nudgeFor(index), HIT_AREA_PX / 2],
      }),
      title: `Stop ${index + 1}: ${stop.name}`,
      alt: `Stop ${index + 1}: ${stop.name}`,
      keyboard: true,
    }).addTo(map);
    marker.on('click keypress', () => onStopChosen(stop.id));
  });

  map.fitBounds(L.latLngBounds(path), { padding: [ROUTE_PADDING_PX, ROUTE_PADDING_PX] });

  return {
    /** Dim the stops that are not part of the current plan. */
    setVisitedStops(stopIds) {
      for (const [id, badge] of markerElements) badge.classList.toggle('is-skipped', !stopIds.includes(id));
    },
    /** Mark one stop as the one whose details are shown. */
    highlightStop(stopId) {
      for (const [id, badge] of markerElements) badge.classList.toggle('is-selected', id === stopId);
    },
  };
}
