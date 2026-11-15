// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeOfflineStatus } from '../src/lib/offline-store.js';
import { newerSpaceWeather, parseSavedSpaceWeather } from '../src/features/conditions/space-weather-store.js';

/** A made-up space weather record. Test data only. */
const record = (coverageEnd) => ({ coverageStart: '2012-08-06', coverageEnd, unavailable: [], events: [{ type: 'SEP', time: '2020-01-01T00:00Z', detail: '', observedAt: '', isGlancingBlow: false }] });

test('describeOfflineStatus reports progress and the finished state', () => {
  assert.match(describeOfflineStatus({ state: 'saving', done: 12, total: 80, isKeptForGood: false }), /12 of 80/);
  assert.match(describeOfflineStatus({ state: 'saved', done: 80, total: 80, isKeptForGood: true }), /will keep it/);
  assert.match(describeOfflineStatus({ state: 'saved', done: 80, total: 80, isKeptForGood: false }), /may clear it/);
  assert.match(describeOfflineStatus({ state: 'unsupported', done: 0, total: 0, isKeptForGood: false }), /cannot save/);
});

test('describeOfflineStatus says what was saved when some files failed', () => {
  assert.match(describeOfflineStatus({ state: 'failed', done: 70, total: 80, isKeptForGood: false }), /70 of 80/);
  assert.match(describeOfflineStatus({ state: 'failed', done: 0, total: 0, isKeptForGood: false }), /Could not save/);
});

test('parseSavedSpaceWeather accepts a record and rejects anything else', () => {
  assert.deepEqual(parseSavedSpaceWeather(JSON.stringify(record('2026-11-15'))), record('2026-11-15'));
  assert.equal(parseSavedSpaceWeather(null), null);
  assert.equal(parseSavedSpaceWeather('not json'), null);
  assert.equal(parseSavedSpaceWeather('{"coverageEnd":"2026-11-15"}'), null);
  assert.equal(parseSavedSpaceWeather(JSON.stringify({ ...record('2026-11-15'), events: [{ type: 5 }] })), null);
});

test('newerSpaceWeather picks the record that reaches the later date', () => {
  assert.equal(newerSpaceWeather(record('2026-11-14'), record('2026-11-15')).coverageEnd, '2026-11-15');
  assert.equal(newerSpaceWeather(record('2026-11-14'), record('2026-11-10')).coverageEnd, '2026-11-14');
  assert.equal(newerSpaceWeather(record('2026-11-14'), null).coverageEnd, '2026-11-14');
});

test('newerSpaceWeather uses the saved record when the published one could not be loaded', () => {
  const failure = new Error('missing');
  assert.equal(newerSpaceWeather(failure, record('2026-11-15')).coverageEnd, '2026-11-15');
  assert.equal(newerSpaceWeather(failure, null), failure);
});

test('every file in the offline manifest exists (rebuild it with scripts/build_offline_manifest.py)', async () => {
  const { readFile, access } = await import('node:fs/promises');
  const root = new URL('../', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('offline-manifest.json', root), 'utf8'));
  assert.ok(manifest.files.includes('index.html'));
  await Promise.all(manifest.files.map((/** @type {string} */ file) => access(new URL(file, root))));
});
