// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareWithSeason, decideVerdict, seasonDistance, usableDaylightMinutes } from '../src/features/conditions/conditions-model.js';
import { fromColumns } from '../src/lib/columns.js';
import { assessNasaLimits } from '../src/features/conditions/nasa-limits.js';
import { eventsFromDonki } from '../src/features/conditions/space-weather-live.js';
import { assessSpaceWeather, mergeSpaceWeather, parseSpaceWeather } from '../src/features/conditions/space-weather-model.js';

/** Build a made-up weather record. Test data only. */
const record = (sol, ls, airMaxC, sunriseMin = 360, sunsetMin = 1080) => ({
  sol, earthDate: '2000-01-01', ls, airMinC: -70, airMaxC, groundMinC: -80, groundMaxC: 5, pressurePa: 800, uv: 'Moderate', sunriseMin, sunsetMin,
});
/** Space weather reasons, as assessSpaceWeather() returns them. Test data only. */
const CLEAR = { level: 'go', text: 'No storm', basis: 'test' };
const STORM = { level: 'no-go', text: 'Storm', basis: 'test' };
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
  const verdict = decideVerdict({ furthestM: 500, planMinutes: 120, record: sol, comparison: compareWithSeason(sol, season), spaceWeather: CLEAR });
  assert.equal(verdict.level, 'go');
});

test('an unusually cold sol is a caution', () => {
  const sol = record(999, 100, -30);
  const verdict = decideVerdict({ furthestM: 500, planMinutes: 120, record: sol, comparison: compareWithSeason(sol, season), spaceWeather: CLEAR });
  assert.equal(verdict.level, 'caution');
});

test('a plan longer than usable daylight is a no-go', () => {
  const sol = record(999, 100, 0);
  const verdict = decideVerdict({ furthestM: 500, planMinutes: 700, record: sol, comparison: compareWithSeason(sol, season), spaceWeather: CLEAR });
  assert.equal(verdict.level, 'no-go');
});

test('a solar storm alert is a no-go whatever the weather', () => {
  const sol = record(999, 100, 0);
  const verdict = decideVerdict({ furthestM: 500, planMinutes: 60, record: sol, comparison: compareWithSeason(sol, season), spaceWeather: STORM });
  assert.equal(verdict.level, 'no-go');
});

test('a sol with no record gives no verdict', () => {
  const verdict = decideVerdict({ furthestM: 500, planMinutes: 60, record: undefined, comparison: null, spaceWeather: CLEAR });
  assert.equal(verdict.level, 'unknown');
});

const weatherRecord = {
  coverageStart: '2012-08-06', coverageEnd: '2026-11-14', unavailable: [],
  events: [
    { type: 'CME-MARS', time: '2017-09-13T22:00Z', isGlancingBlow: true, detail: '', observedAt: '' },
    { type: 'CME-MARS', time: '2018-01-02T03:00Z', isGlancingBlow: false, detail: '', observedAt: '' },
    { type: 'SEP', time: '2017-09-10T16:25Z', isGlancingBlow: false, detail: '', observedAt: 'GOES13' },
  ],
};

test('assessSpaceWeather: direct hit at Mars is no-go, glancing or near-Earth particles are caution', () => {
  assert.equal(assessSpaceWeather(weatherRecord, '2018-01-02').level, 'no-go');
  assert.equal(assessSpaceWeather(weatherRecord, '2017-09-13').level, 'caution');
  assert.equal(assessSpaceWeather(weatherRecord, '2017-09-10').level, 'caution');
  assert.equal(assessSpaceWeather(weatherRecord, '2017-09-11').level, 'go');
});

test('assessSpaceWeather says it does not know outside the record or on a load failure', () => {
  assert.equal(assessSpaceWeather(weatherRecord, '2030-01-01').level, 'unknown');
  assert.equal(assessSpaceWeather(weatherRecord, null).level, 'unknown');
  assert.equal(assessSpaceWeather(new Error('offline'), '2017-09-11').level, 'unknown');
});

test('parseSpaceWeather drops unknown event types and rejects a damaged file', () => {
  const parsed = parseSpaceWeather({ coverage: { start: 'a', end: 'b' }, events: { columns: ['type', 'time'], rows: [['GST', 'x'], ['SEP', '2017']] } });
  assert.equal(parsed.events.length, 1);
  assert.throws(() => parseSpaceWeather({ events: [] }));
});


test('fromColumns rebuilds records and rejects ragged rows', () => {
  assert.deepEqual(fromColumns({ columns: ['sol', 'ls'], rows: [[1, 150], [2, null]] }), [{ sol: 1, ls: 150 }, { sol: 2, ls: null }]);
  assert.throws(() => fromColumns({ columns: ['sol'], rows: [[1, 2]] }));
  assert.throws(() => fromColumns(undefined));
});

test('assessNasaLimits applies NASA\'s 8 h and 2 km walk limits', () => {
  assert.deepEqual(assessNasaLimits({ planMinutes: 300, furthestM: 900 }).map((reason) => reason.level), ['go', 'go']);
  assert.deepEqual(assessNasaLimits({ planMinutes: 481, furthestM: 2001 }).map((reason) => reason.level), ['no-go', 'no-go']);
});

test('a walk over 8 hours is a no-go whatever the weather', () => {
  const sol = record(999, 100, 0);
  const verdict = decideVerdict({ furthestM: 500, planMinutes: 500, record: sol, comparison: compareWithSeason(sol, season), spaceWeather: CLEAR });
  assert.equal(verdict.level, 'no-go');
});

test('eventsFromDonki keeps Mars arrivals (direct over glancing), particles and shocks', () => {
  const runs = [
    { impactList: [{ location: 'Mars', arrivalTime: 'T1', isGlancingBlow: true }, { location: 'Earth', arrivalTime: 'T2' }] },
    { impactList: [{ location: 'Mars', arrivalTime: 'T1', isGlancingBlow: false }] },
  ];
  const events = eventsFromDonki(runs, [{ eventTime: 'T0', instruments: [{ displayName: 'GOES' }] }], [{ eventTime: 'T3', location: 'Earth' }]);
  assert.deepEqual(events.map((event) => [event.type, event.time, event.isGlancingBlow]), [['SEP', 'T0', false], ['CME-MARS', 'T1', false], ['IPS', 'T3', false]]);
});

test('mergeSpaceWeather extends the record and reports any gap', () => {
  const fresh = [{ type: 'SEP', time: '2026-11-20T01:00Z', isGlancingBlow: false, detail: '', observedAt: '' }];
  const joined = mergeSpaceWeather(weatherRecord, fresh, '2026-11-15', '2026-11-21');
  assert.equal(joined.coverageEnd, '2026-11-21');
  assert.equal(joined.events.length, weatherRecord.events.length + 1);
  assert.deepEqual(joined.gaps, []);
  assert.deepEqual(mergeSpaceWeather(weatherRecord, [], '2027-01-01', '2027-02-01').gaps, ['2026-11-15 to 2027-01-01']);
});
