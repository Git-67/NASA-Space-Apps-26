// @ts-check
/**
 * The planned walk on the map.
 *
 * - Every section is drawn on its safest path over rover-driven ground
 *   (scripts/safe_paths.py), each stretch coloured by its difficulty (rover
 *   tilt under 10°, 10° to 20°, 20° or more), so only the steep parts stand out.
 * - When a stop is chosen, the section leaving it is drawn solid and every
 *   other section translucent and dotted, so one leg can be read at a time.
 * - Hovering, tapping or focusing a section shows its distance, climb, time
 *   and difficulty.
 * - Callouts mark the harder parts: the steepest point of a moderate or hard
 *   section, the biggest climb in the plan, and sandy hollows.
 * - An arrow halfway along each shown leg points the way the walker goes, so a
 *   changed visiting order is visible on the map.
 * Difficulty is never shown by colour alone: the popups and callouts say it in words.
 */
import L from '../../lib/leaflet.js';
import { el } from '../../lib/dom.js';
import { icon } from '../../components/ui/icon.js';
import { formatDuration } from '../../lib/mars.js';
import { stackLabels } from './label-stacking.js';
import { activeSection, midpointHeading } from './route-geometry.js';

/** @typedef {import('../plan/plan-model.js').Route} Route */
/** @typedef {import('../plan/plan-model.js').Plan} Plan */
/** @typedef {import('../plan/plan-model.js').Section} Section */

const DIFFICULTY_LABEL = { easier: 'Easier', moderate: 'Moderate', hard: 'Hard' };
/** Below this zoom the whole walk is a few pixels long, so callouts would only pile up; they are hidden. */
const CALLOUT_MIN_ZOOM = 13;
/** Space between stacked callouts, in pixels. */
const CALLOUT_GAP_PX = 4;
/** Wider invisible line along each section, so it is easy to hover and tap (DESIGN.md: hit areas larger than the mark). */
const HIT_WIDTH_PX = 24;

/**
 * Text describing one section, for its popup.
 * @param {Section} section
 * @returns {HTMLElement}
 */
function sectionCard(section) {
  const title = section.isReturn ? `Return to ${section.toName}` : `${section.fromName} to ${section.toName}`;
  const row = (/** @type {string} */ label, /** @type {string} */ value) => el('div', { className: 'reading' }, [el('dt', { text: label }), el('dd', { text: value })]);
  return el('div', { className: 'section-card' }, [
    el('p', { className: 'section-card-title', text: title }),
    el('dl', { className: 'reading-list' }, [
      row('Distance', `${Math.round(section.distanceM)} m`),
      row('Up / down', `+${Math.round(section.ascentM)} m / −${Math.round(section.descentM)} m`),
      row('Walk (est.)', formatDuration(section.walkMinutes)),
      row('Difficulty', `${DIFFICULTY_LABEL[section.difficulty]} (tilt ${section.maxRoverTiltDeg.toFixed(0)}°)`),
    ]),
  ]);
}

/**
 * A short label pinned to the map next to a harder part of the walk.
 * @param {[number, number]} position
 * @param {string} iconName Material Symbols name.
 * @param {string} text
 * @returns {L.Marker}
 */
function callout(position, iconName, text) {
  const label = el('span', { className: 'map-label map-callout' }, [icon(iconName), text]);
  return L.marker(position, {
    icon: L.divIcon({ html: label, className: 'map-label-anchor', iconSize: [0, 0] }),
    interactive: false,
    keyboard: false,
    alt: text,
  });
}

/**
 * An arrow on a leg, pointing the way the walker goes.
 * @param {number[][]} path The leg, in walking direction.
 * @returns {L.Marker}
 */
function directionArrow(path) {
  const { lat, lon, angleDeg } = midpointHeading(path);
  const arrow = el('span', { className: 'map-arrow', attrs: { 'aria-hidden': 'true' } }, [icon('arrow_forward')]);
  arrow.style.rotate = `${angleDeg.toFixed(1)}deg`;
  return L.marker([lat, lon], { icon: L.divIcon({ html: arrow, className: 'map-arrow-anchor', iconSize: [0, 0] }), interactive: false, keyboard: false });
}

/**
 * Create the layer that draws the plan.
 * @returns {{ layer: L.LayerGroup, show: (route: Route, plan: Plan, activeStopId: string | null) => void }}
 */
export function createRouteLayer() {
  const layer = L.layerGroup();
  /** @type {{ position: L.LatLng, label: HTMLElement }[]} */
  let callouts = [];
  /** Move callouts that would cover each other; screen positions change with every zoom. */
  const stack = () => {
    const map = /** @type {L.Map | undefined} */ (/** @type {any} */ (layer)._map);
    if (!map) return;
    const isVisible = map.getZoom() >= CALLOUT_MIN_ZOOM;
    for (const { label } of callouts) label.style.display = isVisible ? '' : 'none';
    if (!isVisible) return;
    const boxes = callouts.map(({ position, label }) => {
      label.style.translate = '';
      const point = map.latLngToContainerPoint(position);
      return { x: point.x, y: point.y, width: label.offsetWidth, height: label.offsetHeight };
    });
    stackLabels(boxes, CALLOUT_GAP_PX).forEach((shift, index) => {
      if (shift > 0) callouts[index].label.style.translate = `0 ${shift}px`;
    });
  };
  layer.on('add', () => /** @type {any} */ (layer)._map?.on('zoomend', stack));
  return {
    layer,
    show(route, plan, activeStopId) {
      layer.clearLayers();
      callouts = [];
      /** @param {L.Marker} marker */
      const addCallout = (marker) => {
        marker.addTo(layer);
        const label = /** @type {HTMLElement | null} */ (marker.getElement()?.querySelector('.map-callout') ?? null);
        if (label) callouts.push({ position: marker.getLatLng(), label });
      };
      const active = activeSection(plan.sections, activeStopId);
      // The return retraces the way out, so it is drawn only when it is the leg being looked at.
      const shown = plan.sections.filter((section) => !section.isReturn || section === active);
      for (const section of shown) {
        const path = /** @type {[number, number][]} */ (section.path.runs.flatMap((run, index) => (index === 0 ? run.points : run.points.slice(1))));
        const state = active === null || section === active ? 'is-active' : 'is-muted';
        if (state === 'is-active') L.polyline(path, { className: `map-route-casing ${state}`, interactive: false }).addTo(layer);
        for (const run of section.path.runs) {
          L.polyline(/** @type {[number, number][]} */ (run.points), { className: `map-route is-${run.difficulty} ${state}`, interactive: false }).addTo(layer);
        }
        const hit = L.polyline(path, { className: 'map-route-hit', weight: HIT_WIDTH_PX, opacity: 0 }).addTo(layer);
        if (path.length >= 2 && (state === 'is-active' || section.isReturn)) directionArrow(path).addTo(layer);
        hit.bindTooltip(sectionCard(section), { sticky: true, className: 'map-popup' });
        hit.bindPopup(sectionCard(section), { className: 'map-popup', maxWidth: 320 });
      }

      // Callouts: for the chosen leg only, or for the whole way out when no leg is chosen.
      const calloutSections = active ? [active] : plan.sections.filter((section) => !section.isReturn);
      for (const section of calloutSections) {
        if (section.difficulty !== 'easier') {
          const [lat, lon] = section.path.steepest;
          addCallout(callout([lat, lon], 'warning', `Steep: ${section.path.maxTiltDeg.toFixed(0)}° tilt`));
        }
        const target = route.stops.find((stop) => stop.id === section.toId);
        if (target?.terrain === 'hollow' && !section.isReturn) {
          const point = route.points[target.pointIndex];
          addCallout(callout([point.lat, point.lon], 'grain', 'Sand: slippery'));
        }
      }
      const outward = plan.sections.filter((section) => !section.isReturn);
      const biggest = outward.reduce((best, section) => (best === null || section.ascentM > best.ascentM ? section : best), /** @type {Section | null} */ (null));
      if (biggest && (!active || active === biggest) && biggest.ascentM >= 1) {
        const [lat, lon] = biggest.path.middle;
        addCallout(callout([lat, lon], 'trending_up', `Biggest climb: +${Math.round(biggest.ascentM)} m`));
      }
      stack();
    },
  };
}
