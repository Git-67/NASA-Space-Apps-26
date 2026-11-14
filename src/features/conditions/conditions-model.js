// @ts-check
/**
 * Pure logic for the "when" question: what a sol was like, how unusual it was
 * for its season, and the go / caution / no-go verdict.
 *
 * Dataset: data/processed/weather.json (Curiosity REMS daily weather, provided
 * by Centro de Astrobiologia and labelled "for outreach purposes only").
 * Temperatures are in degrees Celsius. Sunrise and sunset are Mars-clock
 * minutes after local midnight. `ls` is solar longitude in degrees (the season).
 *
 * The verdict deliberately avoids temperature, ultraviolet and dose
 * thresholds: no citable limit exists for a Mars surface suit. It uses
 * daylight, how unusual the sol is for its season, and NASA DONKI space
 * weather for the sol's date (see space-weather-model.js).
 */
import { marsMinutesToEarthMinutes } from '../../lib/mars.js';

/**
 * @typedef {{ sol: number, earthDate: string, ls: number | null, airMinC: number | null, airMaxC: number | null,
 *   groundMinC: number | null, groundMaxC: number | null, pressurePa: number | null, uv: string | null,
 *   sunriseMin: number | null, sunsetMin: number | null }} WeatherRecord
 * @typedef {'go' | 'caution' | 'no-go' | 'unknown'} VerdictLevel
 * @typedef {{ level: VerdictLevel, text: string, basis: string }} Reason
 * @typedef {{ level: VerdictLevel, reasons: Reason[] }} Verdict
 * @typedef {{ sampleSize: number, medianAirMaxC: number, shareColder: number }} SeasonComparison
 */

/** Sols within this many degrees of solar longitude count as "the same season". Our own choice. */
export const SEASON_WINDOW_DEG = 15;

/**
 * Daylight kept in reserve after sunrise and before sunset, in Earth minutes.
 * Our own ASSUMPTION: no NASA figure was found for a Mars surface walk.
 */
export const DAYLIGHT_MARGIN_MINUTES = 60;

/** A plan that uses more than this share of usable daylight earns a caution. Our own choice. */
export const DAYLIGHT_CAUTION_SHARE = 0.8;

/** A sol colder than all but this share of same-season sols is flagged as unusual. Our own choice. */
export const UNUSUAL_SHARE = 0.1;

/** Fewer same-season sols than this, and no comparison is made. */
const MIN_SEASON_SAMPLE = 30;

/** Severity order, used to pick the worst reason as the overall verdict. */
const SEVERITY = { go: 0, unknown: 1, caution: 2, 'no-go': 3 };

/**
 * Smallest angle between two solar longitudes, allowing for the wrap at 360.
 * @param {number} a Solar longitude in degrees.
 * @param {number} b Solar longitude in degrees.
 * @returns {number} Difference in degrees, from 0 to 180.
 */
export function seasonDistance(a, b) {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}

/**
 * Compare a sol's daily high with every other sol at the same season.
 * @param {WeatherRecord} record The sol to assess.
 * @param {WeatherRecord[]} records The whole weather record.
 * @returns {SeasonComparison | null} Null when the sol or the season lacks data.
 */
export function compareWithSeason(record, records) {
  const { ls, airMaxC, sol } = record;
  if (ls === null || airMaxC === null) return null;
  const highs = [];
  for (const other of records) {
    if (other.sol === sol || other.ls === null || other.airMaxC === null) continue;
    if (seasonDistance(ls, other.ls) <= SEASON_WINDOW_DEG) highs.push(other.airMaxC);
  }
  if (highs.length < MIN_SEASON_SAMPLE) return null;
  highs.sort((x, y) => x - y);
  return {
    sampleSize: highs.length,
    medianAirMaxC: highs[Math.floor(highs.length / 2)],
    // Share of same-season sols that were colder than this one. A small share means an unusually cold sol.
    shareColder: highs.filter((value) => value < airMaxC).length / highs.length,
  };
}

/**
 * Daylight available for walking, in Earth minutes, after the safety margins.
 * @param {WeatherRecord} record The sol to assess.
 * @returns {number | null} Usable daylight, or null when sunrise or sunset is missing.
 */
export function usableDaylightMinutes(record) {
  if (record.sunriseMin === null || record.sunsetMin === null) return null;
  const daylight = marsMinutesToEarthMinutes(record.sunsetMin - record.sunriseMin);
  return Math.max(0, daylight - 2 * DAYLIGHT_MARGIN_MINUTES);
}

/**
 * Decide go, caution or no-go for a plan on a given sol.
 * @param {{ planMinutes: number, record: WeatherRecord | undefined, comparison: SeasonComparison | null,
 *   spaceWeather: Reason }} input `spaceWeather` is the solar storm reason from assessSpaceWeather().
 * @returns {Verdict} The overall level (the worst of the reasons) and every reason behind it.
 */
export function decideVerdict({ planMinutes, record, comparison, spaceWeather }) {
  /** @type {Reason[]} */
  const reasons = [spaceWeather];

  if (!record) {
    reasons.push({ level: 'unknown', text: 'Curiosity recorded no weather on this sol.', basis: 'About 250 sols are absent from the weather feed, and it ends on 25 Aug 2026 (sol 4995).' });
    return summarise(reasons);
  }

  const usable = usableDaylightMinutes(record);
  const marginNote = `Daylight from the weather record, less ${DAYLIGHT_MARGIN_MINUTES} min after sunrise and before sunset (our assumption).`;
  if (usable === null) {
    reasons.push({ level: 'unknown', text: 'Sunrise and sunset are missing for this sol.', basis: 'Gap in the weather record.' });
  } else if (planMinutes > usable) {
    reasons.push({ level: 'no-go', text: `The plan needs ${Math.round(planMinutes)} min but only ${Math.round(usable)} min of daylight are usable.`, basis: marginNote });
  } else if (planMinutes > usable * DAYLIGHT_CAUTION_SHARE) {
    reasons.push({ level: 'caution', text: `The plan uses ${Math.round((planMinutes / usable) * 100)}% of the usable daylight. Little room for delay.`, basis: marginNote });
  } else {
    reasons.push({ level: 'go', text: `The plan fits in daylight, using ${Math.round((planMinutes / usable) * 100)}% of the ${Math.round(usable)} usable minutes.`, basis: marginNote });
  }

  if (record.airMaxC === null) {
    reasons.push({ level: 'unknown', text: 'No temperature was recorded on this sol.', basis: 'Gap in the weather record.' });
  } else if (comparison === null) {
    reasons.push({ level: 'unknown', text: 'Too few sols at this season to say whether this one is unusual.', basis: 'Fewer than 30 comparable sols.' });
  } else {
    const basis = `Daily high compared with ${comparison.sampleSize} other sols within ${SEASON_WINDOW_DEG}° of the same solar longitude.`;
    if (comparison.shareColder < UNUSUAL_SHARE) {
      const share = Math.round((1 - comparison.shareColder) * 100);
      reasons.push({
        level: 'caution',
        text: `Unusually cold for the season: a high of ${record.airMaxC} °C against a typical ${comparison.medianAirMaxC} °C. Colder than ${share}% of sols at this time of year, which can mean dust in the air.`,
        basis,
      });
    } else {
      reasons.push({ level: 'go', text: `Temperature is normal for the season: a high of ${record.airMaxC} °C against a typical ${comparison.medianAirMaxC} °C.`, basis });
    }
  }

  return summarise(reasons);
}

/**
 * Pick the most severe level among the reasons.
 * @param {Reason[]} reasons Every reason found.
 * @returns {Verdict}
 */
function summarise(reasons) {
  const level = reasons.reduce((worst, reason) => (SEVERITY[reason.level] > SEVERITY[worst] ? reason.level : worst), /** @type {VerdictLevel} */ ('go'));
  return { level, reasons };
}
