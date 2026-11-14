// @ts-check
/**
 * NASA's own planning limits for a walk on foot, applied to the plan.
 *
 * Source: NASA Exploration EVA System Concept of Operations, EVA-EXP-0042
 * Rev B (19 Oct 2020), read by the team on 14 Nov 2026:
 * - section 4.1.4: "EVAs of up to 8 hours in duration (6±2 hours)";
 * - section 4.2.1.3.1: walking up to 2 km from the lander in a straight line.
 * Both are LUNAR planning figures. The same document says the Mars figures
 * are "forward work", so these are the closest NASA rules that exist.
 */

/** @typedef {import('./conditions-model.js').Reason} Reason */

/** Longest walk (EVA) NASA plans, in minutes: 8 hours. */
export const EVA_MAX_MINUTES = 8 * 60;

/** Farthest NASA plans a crew to walk from its base, in a straight line, in metres. */
export const WALK_BACK_MAX_M = 2000;

const SOURCE = 'NASA EVA-EXP-0042 (lunar; no Mars figure yet).';

/**
 * Check a plan against NASA's walk length and distance limits.
 * @param {{ planMinutes: number, furthestM: number }} plan Total time out (walking and work), and the
 *   farthest the walk goes from its start in a straight line, in metres.
 * @returns {Reason[]}
 */
export function assessNasaLimits({ planMinutes, furthestM }) {
  const hours = (planMinutes / 60).toFixed(1);
  const time = planMinutes > EVA_MAX_MINUTES
    ? { level: /** @type {const} */ ('no-go'), text: `Too long: ${hours} h out, NASA plans walks of up to 8 h.`, basis: SOURCE }
    : { level: /** @type {const} */ ('go'), text: `Within NASA's 8 h walk limit (${hours} h).`, basis: SOURCE };
  const km = (furthestM / 1000).toFixed(1);
  const distance = furthestM > WALK_BACK_MAX_M
    ? { level: /** @type {const} */ ('no-go'), text: `Too far: ${km} km from base, NASA plans up to 2 km.`, basis: SOURCE }
    : { level: /** @type {const} */ ('go'), text: `Within NASA's 2 km walk-back limit (${km} km at most).`, basis: SOURCE };
  return [time, distance];
}
