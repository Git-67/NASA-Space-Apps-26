// @ts-check
/**
 * The map: Mars imagery, Curiosity's path and the numbered stops.
 *
 * Imagery:  MRO HiRISE and MRO CTX from NASA Mars Trek: live when online, the
 *           copy stored with the site when offline (tile-sources.js).
 * Route:    the safest paths between stops (data/processed/safe_paths.json).
 * Coordinates are plotted exactly as the sources give them, in degrees. The
 * tiles use a plain latitude/longitude grid, so the map uses the same grid
 * (Leaflet's EPSG:4326) with Mars' radius in place of Earth's, which makes
 * the scale bar and distances correct for Mars.
 * Optional layers (colour imagery, contours, place names, grid) and their
 * panel are added by map-layer-options.js.
 */
import L from '../../lib/leaflet.js';
import { MARS_RADIUS_M } from '../../lib/mars.js';
import { el } from '../../lib/dom.js';
import { addLayerOptions } from './map-layer-options.js';
import { createRouteLayer } from './route-layer.js';
import { TILE_SOURCES } from './tile-sources.js';
import { createAstronautMarker } from './astronaut-marker.js';
import { createMapRotation } from './map-rotation.js';
import { createMapPicker } from './map-picker.js';

/** @typedef {import('../plan/plan-model.js').Route} Route */
/** @typedef {import('../plan/plan-model.js').Plan} Plan */
/** @typedef {import('./map-layer-data.js').Place} Place */
/** @typedef {import('./map-layer-data.js').DemCalibration} DemCalibration */

/** Zoom range of the map: from the whole crater to two steps past the stored HiRISE resolution. */
const MIN_ZOOM = 8;
const MAX_ZOOM = 18;
const ROUTE_PADDING_PX = 48;
/** A followed walker this many pixels or more from their place on screen is moved back; less is not worth a redraw. */
const RECENTRE_MIN_PX = 1;
/**
 * While following, the map's layers (route lines, contours, the tile grid) are told the view
 * moved at most this often, in milliseconds. Telling them every frame redrew every route line
 * 60 times a second; this rate is still far quicker than they leave their drawn margin.
 */
const SETTLE_EVERY_MS = 400;
/** Side of the square hit area around each stop badge, in pixels (the 44px touch target). */
const HIT_AREA_PX = 44;
/** Stops closer together than this, in metres, would hide each other on the map. */
const CROWDED_STOPS_M = 30;
/** How far each badge of a crowded pair is nudged sideways, in pixels, so both stay visible. */
const CROWDED_NUDGE_PX = 14;

/**
 * Tell the visitor when the map is enlarged past the grayscale HiRISE mosaic's
 * own resolution (DESIGN.md: never stretch imagery without saying so).
 * @param {L.Map} map
 */
function addOverZoomNotice(map) {
  const notice = el('p', { className: 'map-notice', attrs: { role: 'status' } });
  const Notice = L.Control.extend({ onAdd: () => notice });
  new Notice({ position: 'bottomleft' }).addTo(map);
  const update = () => {
    const stored = TILE_SOURCES.offline.hirise.maxZoom; // the same in both modes
    const isPast = map.getZoom() > stored;
    notice.hidden = !isPast;
    notice.textContent = isPast ? `Enlarged ${2 ** (map.getZoom() - stored)}× past the imagery's own resolution` : '';
  };
  map.on('zoomend', update);
  update();
}

/**
 * @typedef {object} MapViewApi
 * @property {(plan: Plan, activeStopId: string | null) => void} showPlan
 * @property {(stopId: string | null) => void} highlightStop
 * @property {(mode: import('./tile-sources.js').ConnectionMode) => void} setMode
 * @property {(lat: number, lon: number, headingDeg: number) => void} showAstronaut Place the walker, facing headingDeg (compass).
 * @property {() => void} hideAstronaut
 * @property {(lat: number, lon: number, zoom: number | null, isAnimated: boolean) => void} follow Centre on a point; null keeps the zoom.
 * @property {(lat: number, lon: number, inset: { top: number, bottom: number }) => void} keepCentred
 *   Keep a point at the centre of the clear area between panels (insets in pixels from the top and bottom edges), unanimated.
 * @property {(isOn: boolean) => void} setJourneyView Full-screen journey view: the map may turn, and zooms about its centre.
 * @property {(headingDeg: number) => void} setHeading Turn the map so this compass heading is up the screen (journey view only).
 * @property {() => number} imageryEnlargement How many times the imagery is enlarged past its own resolution (1 if not).
 * @property {(stop: import('../plan/plan-model.js').Stop) => void} addStop Give a stop added later (a custom point) its marker.
 * @property {(onPick: (lat: number, lon: number) => void) => void} startPicking Show the rover tracks and wait for taps on the map.
 * @property {() => void} stopPicking Leave picking.
 * @property {(text: string) => void} showPickMessage Say something while picking (for example why a tap was refused).
 * @property {(handler: () => void) => void} onUserPan Called when the visitor drags the map.
 * @property {() => void} resize Tell the map its box changed size.
 */

/** Leaflet's latitude/longitude grid, measured on Mars instead of Earth. */
const MARS_CRS = L.extend({}, L.CRS.EPSG4326, { R: MARS_RADIUS_M });

/**
 * Draw the map.
 * @param {HTMLElement} container Element that will hold the map.
 * @param {Route} route The prepared route.
 * @param {{ places: Place[] | Error, calibration: DemCalibration | Error }} extras Data for the optional layers,
 *   or why each could not be loaded; a missing one only disables its own layer.
 * @param {import('./tile-sources.js').ConnectionMode} mode Read tiles from NASA ('online') or from the site ('offline').
 * @param {(stopId: string) => void} onStopChosen Called when a visitor activates a stop marker.
 * @returns {MapViewApi}
 */
export function createMapView(container, route, extras, mode, onStopChosen) {
  const map = L.map(container, {
    crs: MARS_CRS,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxBounds: TILE_SOURCES.offline.ctx.bounds,
    zoomControl: false,
    attributionControl: false,
  });

  // CTX covers the crater at every zoom (enlarged past zoom 10); HiRISE covers its area on top.
  /** @type {import('../../lib/leaflet.js').MapLayer[]} */
  let basemaps = [];
  /** @param {import('./tile-sources.js').TileSets} tiles */
  const showBasemaps = (tiles) => {
    for (const layer of basemaps) layer.remove();
    basemaps = [tiles.ctx, tiles.hirise].map((set) => L.tileLayer(set.url, {
      bounds: set.bounds, minZoom: set.minZoom, maxNativeZoom: set.maxZoom, maxZoom: MAX_ZOOM, zIndex: 1,
    }).addTo(map));
  };
  showBasemaps(TILE_SOURCES[mode]);

  L.control.zoom({ position: 'topright', zoomInTitle: 'Zoom in', zoomOutTitle: 'Zoom out' }).addTo(map);
  // Metric only: SI units throughout (DESIGN.md, Mars conventions).
  L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
  addOverZoomNotice(map);

  const rotation = createMapRotation(map, container);
  /** When the layers were last told the followed view settled, from performance.now(). */
  let lastSettledAt = 0;
  const routeLayer = L.layerGroup().addTo(map);
  const astronaut = createAstronautMarker();
  const planRoute = createRouteLayer();
  planRoute.layer.addTo(routeLayer);
  const path = route.points.map((point) => L.latLng(point.lat, point.lon));

  /** Badge and marker of each stop in the pool. Stops added later (custom points) get theirs then. */
  /** @type {Map<string, { badge: HTMLElement, marker: L.Marker, stop: import('../plan/plan-model.js').Stop }>} */
  const markers = new Map();
  /**
   * Sideways nudge for a stop's badge. Two drill sites sit about 12 m apart, so their badges
   * would cover each other. Of such a pair the earlier stop in the pool moves left and the later
   * one right. Only the badge moves: the stop's coordinates are unchanged.
   * @param {number} index Position of the stop in the pool.
   * @returns {number} Offset in pixels; negative is left.
   */
  const nudgeFor = (index) => {
    const here = route.stops[index];
    const isNear = (/** @type {number} */ other) => other >= 0 && other < route.stops.length
      && map.distance([here.lat, here.lon], [route.stops[other].lat, route.stops[other].lon]) < CROWDED_STOPS_M;
    if (isNear(index + 1)) return -CROWDED_NUDGE_PX;
    if (isNear(index - 1)) return CROWDED_NUDGE_PX;
    return 0;
  };
  /** @param {import('../plan/plan-model.js').Stop} stop */
  const addMarker = (stop) => {
    const index = route.stops.indexOf(stop);
    const badge = el('span', { className: `map-waypoint is-${stop.kind}`, text: '–' });
    const marker = L.marker([stop.lat, stop.lon], {
      icon: L.divIcon({
        html: badge,
        className: 'map-waypoint-hit',
        iconSize: [HIT_AREA_PX, HIT_AREA_PX],
        iconAnchor: [HIT_AREA_PX / 2 - nudgeFor(index), HIT_AREA_PX / 2],
      }),
      title: stop.name,
      alt: `Stop: ${stop.name}`,
      keyboard: true,
    }).addTo(routeLayer);
    marker.on('click keypress', () => onStopChosen(stop.id));
    markers.set(stop.id, { badge, marker, stop });
  };
  route.stops.forEach(addMarker);
  const picker = createMapPicker(map, route.network);

  map.fitBounds(L.latLngBounds(path), { padding: [ROUTE_PADDING_PX, ROUTE_PADDING_PX] });

  const layerOptions = addLayerOptions(map, {
    tiles: TILE_SOURCES[mode],
    // Names for the curated stops only: the extra stops' names ("Sol 4989 stop") would crowd the map.
    stopLabels: route.stops.filter((stop) => stop.kind === 'curated').map((stop) => ({ name: stop.name, lat: stop.lat, lon: stop.lon, hasMarker: false })),
    places: extras.places,
    calibration: extras.calibration,
  });

  return {
    /**
     * Draw the plan, with the leg leaving `activeStopId` brought forward. Each badge
     * shows the stop's place in the visiting order; stops left out show a dash.
     */
    showPlan(plan, activeStopId) {
      planRoute.show(route, plan, activeStopId);
      rotation.straightenText();
      const visited = plan.stops.map((stop) => stop.id);
      for (const [id, { badge, marker, stop }] of markers) {
        const position = visited.indexOf(id);
        badge.classList.toggle('is-skipped', position < 0);
        badge.textContent = position < 0 ? '–' : String(position + 1);
        // Curated stops always show (a dash when skipped); extra stops only when in the walk.
        const isShown = stop.kind === 'curated' || position >= 0;
        if (isShown && !routeLayer.hasLayer(marker)) marker.addTo(routeLayer);
        if (!isShown && routeLayer.hasLayer(marker)) routeLayer.removeLayer(marker);
      }
    },
    addStop(stop) {
      if (!markers.has(stop.id)) addMarker(stop);
    },
    startPicking(onPick) {
      picker.start(onPick);
    },
    stopPicking() {
      picker.stop();
    },
    showPickMessage(text) {
      picker.say(text);
    },
    /** Switch every tiled layer between NASA's live tiles and the copy stored with the site. */
    showAstronaut(lat, lon, headingDeg) {
      if (!map.hasLayer(astronaut.marker)) astronaut.marker.addTo(map);
      astronaut.update(lat, lon, headingDeg);
    },
    hideAstronaut() {
      astronaut.marker.remove();
    },
    follow(lat, lon, zoom, isAnimated) {
      map.setView([lat, lon], zoom ?? map.getZoom(), { animate: isAnimated });
    },
    keepCentred(lat, lon, inset) {
      // Where the point should sit, measured from the screen's centre, turned into the map box's axes.
      const wanted = rotation.toBox({ x: 0, y: (inset.top - inset.bottom) / 2 });
      const offset = map.latLngToContainerPoint([lat, lon]).subtract(map.getSize().divideBy(2)).subtract(wanted).round();
      if (Math.abs(offset.x) < RECENTRE_MIN_PX && Math.abs(offset.y) < RECENTRE_MIN_PX) return;
      // Move the map's pane only, the way Leaflet's own animated pans do each frame ('move'); tell
      // the layers it settled ('moveend', which redraws them) at most every SETTLE_EVERY_MS.
      /** @type {{ _rawPanBy: (offset: L.Point) => void }} */ (/** @type {unknown} */ (map))._rawPanBy(offset);
      map.fire('move');
      const now = performance.now();
      if (now - lastSettledAt >= SETTLE_EVERY_MS) {
        lastSettledAt = now;
        map.fire('moveend');
      }
    },
    setJourneyView(isOn) {
      rotation.setEnabled(isOn);
    },
    setHeading(headingDeg) {
      rotation.setAngle(-headingDeg);
    },
    imageryEnlargement() {
      return Math.max(1, 2 ** (map.getZoom() - TILE_SOURCES.offline.hirise.maxZoom));
    },
    onUserPan(handler) {
      map.on('dragstart', handler);
    },
    resize() {
      map.invalidateSize({ animate: false });
      rotation.fit();
    },
    setMode(next) {
      showBasemaps(TILE_SOURCES[next]);
      layerOptions.setTiles(TILE_SOURCES[next]);
    },
    /** Mark one stop as the one whose details are shown. */
    highlightStop(stopId) {
      for (const [id, { badge }] of markers) badge.classList.toggle('is-selected', id === stopId);
    },
  };
}
