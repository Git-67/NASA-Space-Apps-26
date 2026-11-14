// @ts-check
/**
 * Pure logic for the verdict's solar storm check, from NASA DONKI.
 *
 * Dataset: data/processed/space_weather.json (scripts/prepare_space_weather.py),
 *          or, for the present day, DONKI read live (space-weather-live.js).
 * Times:   UTC. A sol is matched to the UTC Earth date it falls on.
 *
 * Event types, and what each can and cannot say about Mars:
 * - CME-MARS: NASA's WSA-Enlil model forecast a solar storm (coronal mass
 *   ejection) arriving at Mars. A forecast, not a measurement at Mars.
 * - SEP: solar energetic particles, detected by spacecraft near Earth or by
 *   STEREO. Whether they reached Mars depends on where Mars was.
 * - FLR: a class M or X solar flare.
 * - IPS: an interplanetary shock, with where it was detected.
 *
 * The rule is OUR OWN, in the spirit of the science brief's "no walk during a
 * solar particle event": a forecast direct arrival at Mars is no-go; a
 * glancing arrival, or particles detected near Earth, is caution.
 */

/** @typedef {import('./conditions-model.js').Reason} Reason */
/**
 * @typedef {'CME-MARS' | 'SEP' | 'FLR' | 'IPS'} SpaceEventType
 * @typedef {{ type: SpaceEventType, time: string, detail: string, observedAt: string, link: string, isGlancingBlow: boolean }} SpaceEvent
 * @typedef {{ coverageStart: string, coverageEnd: string, unavailable: string[], events: SpaceEvent[], isLive: boolean }} SpaceWeather
 */

/** Plain names for each event type, shown in the panel. */
export const EVENT_TYPE_LABEL = {
  'CME-MARS': 'Solar storm forecast at Mars',
  SEP: 'Solar particles (near Earth)',
  FLR: 'Solar flare',
  IPS: 'Shock wave in space',
};

const KNOWN_TYPES = Object.keys(EVENT_TYPE_LABEL);
const BASIS = 'NASA DONKI. Our rule: direct hit = no-go; glancing hit or particles = caution.';

/**
 * Check the prepared file's shape and turn it into typed data.
 * @param {any} data Parsed data/processed/space_weather.json.
 * @returns {SpaceWeather}
 * @throws {Error} When the file is damaged.
 */
export function parseSpaceWeather(data) {
  const { coverage, events, unavailable } = data ?? {};
  if (typeof coverage?.start !== 'string' || typeof coverage?.end !== 'string' || !Array.isArray(events)) {
    throw new Error('The space weather file is empty or damaged.');
  }
  return {
    coverageStart: coverage.start,
    coverageEnd: coverage.end,
    unavailable: Array.isArray(unavailable) ? unavailable.map(String) : [],
    events: events.filter((event) => KNOWN_TYPES.includes(event?.type) && typeof event.time === 'string').map((event) => ({
      type: event.type,
      time: event.time,
      detail: String(event.detail ?? ''),
      observedAt: String(event.observedAt ?? ''),
      link: String(event.link ?? ''),
      isGlancingBlow: Boolean(event.isGlancingBlow),
    })),
    isLive: false,
  };
}

/**
 * Events on one UTC Earth date.
 * @param {SpaceWeather} weather
 * @param {string} date Earth date, "YYYY-MM-DD".
 * @returns {SpaceEvent[]}
 */
export function eventsOnDate(weather, date) {
  return weather.events.filter((event) => event.time.startsWith(date));
}

/**
 * The verdict's solar storm reason for one Earth date.
 * @param {SpaceWeather | Error} weather The record, or why it could not be loaded.
 * @param {string | null} date Earth date of the chosen sol, "YYYY-MM-DD", or null if unknown.
 * @returns {Reason}
 */
export function assessSpaceWeather(weather, date) {
  if (weather instanceof Error) {
    return { level: 'unknown', text: 'Could not check space weather.', basis: weather.message };
  }
  if (date === null || date < weather.coverageStart || date > weather.coverageEnd) {
    return { level: 'unknown', text: 'No space weather data for this date.', basis: `Data covers ${weather.coverageStart} to ${weather.coverageEnd}.` };
  }
  const today = eventsOnDate(weather, date);
  const marsArrivals = today.filter((event) => event.type === 'CME-MARS');
  const direct = marsArrivals.find((event) => !event.isGlancingBlow);
  if (direct) {
    return { level: 'no-go', text: `Solar storm forecast to hit Mars (${direct.time.slice(11, 16)} UTC). Stay inside.`, basis: BASIS };
  }
  if (marsArrivals.length > 0) {
    return { level: 'caution', text: 'Solar storm forecast to graze Mars. Stay near shelter.', basis: BASIS };
  }
  const particles = today.filter((event) => event.type === 'SEP');
  if (particles.length > 0) {
    return { level: 'caution', text: 'Solar particles seen near Earth. They may or may not reach Mars.', basis: BASIS };
  }
  return { level: 'go', text: 'No solar storm forecast for Mars.', basis: BASIS };
}
