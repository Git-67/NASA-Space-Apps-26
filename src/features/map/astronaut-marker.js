// @ts-check
/**
 * The walker on the map during "Begin journey": a dot with a cone showing
 * which way they face. The cone points north at 0 degrees and turns
 * clockwise, like a compass. Drawn in the map overlay colours, which are the
 * same in both themes.
 */
import L from '../../lib/leaflet.js';
import { el } from '../../lib/dom.js';

/** Side of the marker's box, in pixels: room for the cone around the dot. */
const SIZE_PX = 88;
/** Keeps the walker above stops and labels. */
const Z_OFFSET = 1000;

/**
 * Create the marker (not yet on the map).
 * @returns {{ marker: import('../../lib/leaflet.js').MapLayer, update: (lat: number, lon: number, headingDeg: number) => void }}
 */
export function createAstronautMarker() {
  const cone = el('span', { className: 'map-astronaut-cone' });
  const box = el('span', { className: 'map-astronaut', attrs: { role: 'img', 'aria-label': 'Astronaut (simulated)' } }, [
    cone,
    el('span', { className: 'map-astronaut-dot' }),
  ]);
  const marker = L.marker([0, 0], {
    icon: L.divIcon({ html: box, className: 'map-astronaut-anchor', iconSize: [SIZE_PX, SIZE_PX], iconAnchor: [SIZE_PX / 2, SIZE_PX / 2] }),
    interactive: false,
    keyboard: false,
    zIndexOffset: Z_OFFSET,
  });
  return {
    marker,
    update(lat, lon, headingDeg) {
      marker.setLatLng([lat, lon]);
      cone.style.rotate = `${headingDeg.toFixed(0)}deg`;
    },
  };
}
