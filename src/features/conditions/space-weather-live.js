// @ts-check
/**
 * Bring the bundled space weather up to date from NASA DONKI, when online.
 *
 * The site carries a record up to the day it was built
 * (data/processed/space_weather.json). Online, this reads only the days after
 * that, with the same rules as scripts/prepare_space_weather.py (arrivals at
 * Mars from WSA-Enlil runs, particle events, interplanetary shocks), and joins
 * them on. Offline, or if NASA does not answer, the bundled record is used as
 * it is and the page says how recent it is.
 *
 * Uses NASA's public DEMO_KEY: not a secret, but limited to a few requests an
 * hour per visitor, so this runs once per visit (three requests).
 */
import { mergeSpaceWeather } from './space-weather-model.js';

/** @typedef {import('./space-weather-model.js').SpaceWeather} SpaceWeather */
/** @typedef {import('./space-weather-model.js').SpaceEvent} SpaceEvent */

const DONKI_URL = 'https://api.nasa.gov/DONKI';
const PUBLIC_KEY = 'DEMO_KEY';
/** DONKI answers at most 60 days per request. */
const MAX_WINDOW_DAYS = 60;
/** Model runs from this many days earlier can still forecast an arrival in the window. */
const LOOKBACK_DAYS = 7;
const DAY_MS = 86_400_000;

/**
 * @param {string} date "YYYY-MM-DD"
 * @param {number} days
 * @returns {string} "YYYY-MM-DD" (UTC).
 */
function shiftDate(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * @param {string} kind DONKI event type.
 * @param {string} start
 * @param {string} end
 * @returns {Promise<any[]>}
 */
async function getKind(kind, start, end) {
  const response = await fetch(`${DONKI_URL}/${kind}?startDate=${start}&endDate=${end}&api_key=${PUBLIC_KEY}`);
  if (response.status === 429) throw new Error("NASA's space weather service is busy (hourly limit).");
  if (!response.ok) throw new Error(`NASA's space weather service answered ${response.status}.`);
  const text = await response.text();
  const data = text.trim() === '' ? [] : JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("NASA's space weather service sent an unexpected reply.");
  return data;
}

/**
 * Turn DONKI replies into events, with the same rules as the preparation script.
 * @param {any[]} simulations WSAEnlilSimulations reply.
 * @param {any[]} particles SEP reply.
 * @param {any[]} shocks IPS reply.
 * @returns {SpaceEvent[]} Sorted by time.
 */
export function eventsFromDonki(simulations, particles, shocks) {
  /** @type {Map<string, SpaceEvent>} */
  const arrivals = new Map();
  for (const run of simulations) {
    for (const impact of run?.impactList ?? []) {
      if (impact?.location !== 'Mars' || typeof impact.arrivalTime !== 'string') continue;
      const isGlancingBlow = Boolean(impact.isGlancingBlow);
      const previous = arrivals.get(impact.arrivalTime);
      if (!previous || (previous.isGlancingBlow && !isGlancingBlow)) {
        arrivals.set(impact.arrivalTime, {
          type: 'CME-MARS', time: impact.arrivalTime, isGlancingBlow,
          detail: isGlancingBlow ? 'glancing blow' : 'direct arrival', observedAt: 'WSA-Enlil model forecast',
        });
      }
    }
  }
  /** @type {(record: any) => string} */
  const instruments = (record) => (record.instruments ?? []).map((/** @type {{ displayName: string }} */ i) => i.displayName).join(', ');
  const seps = particles.filter((record) => typeof record?.eventTime === 'string').map((record) => /** @type {SpaceEvent} */ ({
    type: 'SEP', time: record.eventTime, isGlancingBlow: false, detail: 'solar energetic particles', observedAt: instruments(record),
  }));
  const ips = shocks.filter((record) => typeof record?.eventTime === 'string').map((record) => /** @type {SpaceEvent} */ ({
    type: 'IPS', time: record.eventTime, isGlancingBlow: false, detail: 'interplanetary shock', observedAt: String(record.location ?? ''),
  }));
  return [...arrivals.values(), ...seps, ...ips].sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Add the days since the bundled record ends, read live from NASA.
 * @param {SpaceWeather} bundled The record stored with the site.
 * @param {Date} now The present moment.
 * @returns {Promise<SpaceWeather>} The record extended to today, or the bundled record if it is already current.
 * @throws {Error} With a plain message when NASA's service cannot be read.
 */
export async function refreshSpaceWeather(bundled, now) {
  const today = now.toISOString().slice(0, 10);
  if (bundled.coverageEnd >= today) return bundled;
  // At most the last 60 days: an older bundle keeps a gap, which the page reports.
  const start = [shiftDate(bundled.coverageEnd, 1), shiftDate(today, 1 - MAX_WINDOW_DAYS)].sort()[1];
  const [simulations, particles, shocks] = await Promise.all([
    getKind('WSAEnlilSimulations', shiftDate(start, -LOOKBACK_DAYS), today),
    getKind('SEP', start, today),
    getKind('IPS', start, today),
  ]);
  const fresh = eventsFromDonki(simulations, particles, shocks).filter((event) => event.time.slice(0, 10) >= start);
  return mergeSpaceWeather(bundled, fresh, start, today);
}
