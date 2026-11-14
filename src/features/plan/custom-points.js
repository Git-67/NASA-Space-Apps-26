// @ts-check
/**
 * Points the crew adds by tapping the map. A point snaps to the nearest ground
 * Curiosity drove (the track network), because paths only ever use rover-driven
 * ground: our offline elevation data cannot judge slopes anywhere else.
 * A tap too far from any track is refused, with how far the nearest track is.
 */
import { nearestPlace } from './track-network.js';

/** @typedef {import('./plan-model.js').Route} Route */
/** @typedef {import('./plan-model.js').Stop} Stop */

/** A tap further than this from a track is refused, in metres: a few steps, about the width of the tracks' corridor on the map. */
export const MAX_SNAP_M = 25;
/** Work time we suggest at a custom point, in minutes (ours). */
const CUSTOM_WORK_MINUTES = 10;
const TRAVERSE_URL = 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json';

/**
 * Add a point the crew chose, snapped to the nearest track.
 * @param {Route} route The route; the point joins its pool of stops.
 * @param {number} lat Where the crew tapped, degrees.
 * @param {number} lon
 * @returns {{ stop: Stop } | { error: string, distanceM: number }}
 */
export function addCustomPoint(route, lat, lon) {
  if (!route.network) return { error: 'Custom points need the track network, which did not load.', distanceM: Infinity };
  const { place, distanceM } = nearestPlace(route.network, lat, lon);
  if (distanceM > MAX_SNAP_M) {
    return { error: `No rover track within ${MAX_SNAP_M} m of that spot (nearest ${Math.round(distanceM)} m). Tap on a track line.`, distanceM };
  }
  const existing = route.stops.find((stop) => stop.place === place);
  if (existing) return { stop: existing };
  const number = route.stops.filter((stop) => stop.kind === 'custom').length + 1;
  const [placeLat, placeLon] = route.network.places[place];
  /** @type {Stop} */
  const stop = {
    id: `custom-${number}`,
    name: `Point ${number}`,
    summary: 'Your point, on Curiosity\'s tracks',
    terrain: 'track',
    found: 'A point you chose on ground Curiosity drove.',
    tasksOurs: [],
    kitOurs: [],
    workMinutesOurs: CUSTOM_WORK_MINUTES,
    sourceLabel: 'NASA/JPL-Caltech, Curiosity traverse',
    sourceUrl: TRAVERSE_URL,
    kind: 'custom',
    lat: placeLat,
    lon: placeLon,
    place,
  };
  route.stops.push(stop);
  return { stop };
}
