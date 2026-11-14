// @ts-check
/**
 * Read today's space weather straight from NASA DONKI, for the "Present" sol.
 * Past sols use the prepared file instead; see scripts/prepare_space_weather.py,
 * whose rules this mirrors (Mars arrivals from WSA-Enlil runs, and SEP events).
 *
 * Uses NASA's public DEMO_KEY. It is not a secret, but it is rate-limited per
 * visitor (a few requests an hour), so this runs only when "Present" is chosen
 * and the reply is kept for the rest of the visit.
 */

/** @typedef {import('./space-weather-model.js').SpaceWeather} SpaceWeather */
/** @typedef {import('./space-weather-model.js').SpaceEvent} SpaceEvent */

const DONKI_URL = 'https://api.nasa.gov/DONKI';
const PUBLIC_KEY = 'DEMO_KEY';
/** Model runs from this many days back can still forecast an arrival today. */
const LOOKBACK_DAYS = 7;

/**
 * @param {Date} day
 * @param {number} days
 * @returns {string} "YYYY-MM-DD" (UTC).
 */
function shiftDate(day, days) {
  return new Date(day.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * @param {string} kind DONKI event type.
 * @param {string} start
 * @param {string} end
 * @returns {Promise<any[]>}
 */
async function getKind(kind, start, end) {
  const url = `${DONKI_URL}/${kind}?startDate=${start}&endDate=${end}&api_key=${PUBLIC_KEY}`;
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("NASA's space weather service could not be reached.");
  }
  if (response.status === 429) throw new Error("NASA's space weather service is busy (rate limit). Try again in an hour.");
  if (!response.ok) throw new Error(`NASA's space weather service answered with status ${response.status}.`);
  const text = await response.text();
  if (text.trim() === '') return [];
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("NASA's space weather service sent an unexpected reply.");
  return data;
}

/**
 * Turn DONKI replies into events, with the same rules as the preparation script.
 * @param {any[]} simulations WSAEnlilSimulations reply.
 * @param {any[]} particles SEP reply.
 * @returns {SpaceEvent[]}
 */
export function eventsFromDonki(simulations, particles) {
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
          detail: isGlancingBlow ? 'glancing blow' : 'direct arrival', observedAt: 'WSA-Enlil model forecast', link: String(run.link ?? ''),
        });
      }
    }
  }
  const seps = particles.filter((record) => typeof record?.eventTime === 'string').map((record) => /** @type {SpaceEvent} */ ({
    type: 'SEP', time: record.eventTime, isGlancingBlow: false, detail: 'solar energetic particles',
    observedAt: (record.instruments ?? []).map((/** @type {any} */ i) => i.displayName).join(', '), link: String(record.link ?? ''),
  }));
  return [...arrivals.values(), ...seps].sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Fetch the space weather around today.
 * @param {Date} now The present moment.
 * @returns {Promise<SpaceWeather>}
 * @throws {Error} With a plain message when NASA's service cannot be read.
 */
export async function fetchLiveSpaceWeather(now) {
  const end = shiftDate(now, 0);
  const [simulations, particles] = await Promise.all([
    getKind('WSAEnlilSimulations', shiftDate(now, -LOOKBACK_DAYS), end),
    getKind('SEP', shiftDate(now, -1), end),
  ]);
  return { coverageStart: shiftDate(now, -1), coverageEnd: end, unavailable: [], events: eventsFromDonki(simulations, particles), isLive: true };
}
