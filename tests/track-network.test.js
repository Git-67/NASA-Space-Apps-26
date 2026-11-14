// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describePath, findPath, nearestPlace, parseTrackNetwork } from '../src/features/plan/track-network.js';

const read = (/** @type {string} */ file) => JSON.parse(readFileSync(new URL(`../data/processed/${file}`, import.meta.url), 'utf8'));
const network = parseTrackNetwork(read('track_network.json'));
const route = read('route.json');
const safePaths = read('safe_paths.json').pairs;

test('the browser A* reproduces every path the script precomputed', () => {
  const placeOf = (/** @type {any} */ stop) => {
    const point = route.points[stop.pointIndex];
    return nearestPlace(network, point.lat, point.lon).place;
  };
  for (const [key, expected] of Object.entries(safePaths)) {
    const [fromId, toId] = key.split('|');
    const from = route.stops.find((/** @type {any} */ stop) => stop.id === fromId);
    const to = route.stops.find((/** @type {any} */ stop) => stop.id === toId);
    const found = describePath(network, findPath(network, placeOf(from), placeOf(to)));
    assert.ok(Math.abs(found.distanceM - expected.distanceM) <= 0.2, `${key} distance ${found.distanceM} vs ${expected.distanceM}`);
    assert.ok(Math.abs(found.ascentM - expected.ascentM) <= 0.2, `${key} climb`);
    assert.equal(found.maxTiltDeg, expected.maxTiltDeg, `${key} steepest tilt`);
    assert.deepEqual(found.runs.map((run) => run.difficulty), expected.runs.map((/** @type {any} */ run) => run.difficulty), `${key} difficulty stretches`);
    assert.equal(found.profile.length, expected.profile.length, `${key} profile`);
  }
});

test('nearestPlace snaps to the track and reports how far it is', () => {
  const [lat, lon] = network.places[100];
  assert.deepEqual(nearestPlace(network, lat, lon), { place: 100, distanceM: 0 });
  assert.ok(nearestPlace(network, lat + 0.01, lon).distanceM > 100);
});

test('findPath refuses places not joined by usable ground', () => {
  // A made-up network of two places and no edge between them. Test data only.
  const islands = parseTrackNetwork({ places: [[0, 0, 0], [0.001, 0, 0]], edges: [] });
  assert.throws(() => findPath(islands, 0, 1), /not joined/);
});
