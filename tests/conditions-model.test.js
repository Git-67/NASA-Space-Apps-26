// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareWithSeason, decideVerdict, seasonDistance, usableDaylightMinutes } from '../src/features/conditions/conditions-model.js';

/** Build a made-up weather record. Test data only. */
const record = (sol, ls, airMaxC, sunriseMin = 360, sunsetMin = 1080) => ({
  sol, earthDate: '2000-01-01', ls, airMinC: -70, airMaxC, groundMinC: -80, groundMaxC: 5, pressurePa: 800, uv: 'Moderate', sunriseMin, sunsetMin,
});
/** Forty sols at the same season with highs from -20 to +19 C. */
const season = Array.from({ length: 40 }, (_, i) => record(i + 1, 100, i - 20));

test('seasonDistance wraps around 360 degrees', () => {
  assert.equal(seasonDistance(350, 10), 20);
  assert.equal(seasonDistance(10, 350), 20);
  assert.equal(seasonDistance(90, 100), 10);
});

test('compareWithSeason ranks a sol against its season and ignores other seasons', () => {
  const cold = record(999, 100, -30);
  const result = compareWithSeason(cold, [...season, record(500, 250, -90)]);
  assert.equal(result?.sampleSize, 40);
  assert.equal(result?.shareColder, 0);
});

test('compareWithSeason returns null without enough comparable sols', () => {
  assert.equal(compareWithSeason(record(999, 100, 0), season.slice(0, 5)), null);
  assert.equal(compareWithSeason(record(999, 100, null), season), null);
});

test('usableDaylightMinutes converts Mars-clock time and removes both margins', () => {
  // 12 Mars hours of daylight is about 739.8 Earth minutes; less two 60-minute margins.
  const usable = usableDaylightMinutes(record(1, 100, 0));
  assert.ok(usable !== null && Math.abs(usable - 619.8) < 0.1);
  assert.equal(usableDaylightMinutes(record(1, 100, 0, null, 1080)), null);
});

test('a short plan on a normal sol is a go', () => {
  const sol = record(999, 100, 0);
  const verdict = decideVerdict({ planMinutes: 120, record: sol, comparison: compareWithSeason(sol, season), isSolarStormAlert: false });
  assert.equal(verdict.level, 'go');
});

test('an unusually cold sol is a caution', () => {
  const sol = record(999, 100, -30);
  const verdict = decideVerdict({ planMinutes: 120, record: sol, comparison: compareWithSeason(sol, season), isSolarStormAlert: false });
  assert.equal(verdict.level, 'caution');
});

test('a plan longer than usable daylight is a no-go', () => {
  const sol = record(999, 100, 0);
  const verdict = decideVerdict({ planMinutes: 700, record: sol, comparison: compareWithSeason(sol, season), isSolarStormAlert: false });
  assert.equal(verdict.level, 'no-go');
});

test('a solar storm alert is a no-go whatever the weather', () => {
  const sol = record(999, 100, 0);
  const verdict = decideVerdict({ planMinutes: 60, record: sol, comparison: compareWithSeason(sol, season), isSolarStormAlert: true });
  assert.equal(verdict.level, 'no-go');
});

test('a sol with no record gives no verdict', () => {
  const verdict = decideVerdict({ planMinutes: 60, record: undefined, comparison: null, isSolarStormAlert: false });
  assert.equal(verdict.level, 'unknown');
});
