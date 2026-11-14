// @ts-check
/**
 * "Add a point": while picking, every track Curiosity drove (the usable track
 * network, data/processed/track_network.json) is drawn as a thin dotted line,
 * a banner says what to do, and each tap on the map is handed back with its
 * position. The page decides whether the tap is close enough to a track.
 * Drawn once, the first time it is needed: about 1,600 short segments in one line.
 */
import L from '../../lib/leaflet.js';
import { el } from '../../lib/dom.js';

/** @typedef {import('../plan/track-network.js').TrackNetwork} TrackNetwork */

/**
 * @param {L.Map} map
 * @param {TrackNetwork | null} network Null when it did not load: picking then only says so.
 */
export function createMapPicker(map, network) {
  /** @type {L.Polyline | null} */
  let tracks = null;
  /** @type {((event: L.LeafletMouseEvent) => void) | null} */
  let onClick = null;
  const banner = el('p', { className: 'map-pick-banner', attrs: { role: 'status', 'aria-live': 'polite' } });
  banner.hidden = true;
  map.getContainer().append(banner);

  /** @param {string} text */
  const say = (text) => {
    banner.textContent = text;
    banner.hidden = false;
  };

  return {
    /** @param {(lat: number, lon: number) => void} onPick */
    start(onPick) {
      if (!network) {
        say('Custom points need the track network, which did not load.');
        return;
      }
      if (!tracks) {
        /** @type {[number, number][][]} */
        const segments = [];
        network.edges.forEach((neighbours, a) => {
          for (const { to } of neighbours) {
            if (a < to) segments.push([[network.places[a][0], network.places[a][1]], [network.places[to][0], network.places[to][1]]]);
          }
        });
        tracks = L.polyline(segments, { className: 'map-tracks', interactive: false });
      }
      tracks.addTo(map);
      map.getContainer().classList.add('is-picking');
      onClick = (event) => onPick(event.latlng.lat, event.latlng.lng);
      map.on('click', onClick);
      say('Tap a dotted rover track to add a point there.');
    },
    stop() {
      tracks?.remove();
      if (onClick) map.off('click', onClick);
      onClick = null;
      map.getContainer().classList.remove('is-picking');
      banner.hidden = true;
    },
    say,
  };
}
