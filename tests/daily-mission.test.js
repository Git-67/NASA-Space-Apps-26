// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { missionCount, missionForSol } from '../src/features/plan/daily-mission.js';
import { addCustomPoint, MAX_SNAP_M } from '../src/features/plan/custom-points.js';
import { buildPlan, recommendedOrder } from '../src/features/plan/plan-model.js';
import { parseTrackNetwork } from '../src/features/plan/track-network.js';

const read = (/** @type {string} */ file) => JSON.parse(readFileSync(new URL(`../data/processed/${file}`, import.meta.url), 'utf8'));

/** The real pool, as the page builds it: the curated stops, then the rover stops. */
function realRoute() {
  const data = read('route.json');
  const stops = data.stops.map((/** @type {any} */ stop) => ({ ...stop, kind: 'curated', lat: data.points[stop.pointIndex].lat, lon: data.points[stop.pointIndex].lon }));
  stops.push(...read('rover_stops.json').stops.map((/** @type {any} */ stop) => ({ ...stop, kind: 'rover' })));
  return /** @type {any} */ ({ points: data.points, stops, safePaths: { ...read('safe_paths.json').pairs }, network: parseTrackNetwork(read('track_network.json')) });
}

test('each sol has one mission, they rotate, and every mission can be walked', () => {
  const route = realRoute();
  const seen = new Set();
  for (let sol = 4700; sol < 4700 + missionCount(); sol += 1) {
    const mission = missionForSol(sol, route.stops);
    seen.add(mission.id);
    assert.ok(mission.stopIds.length >= 2, `${mission.id} picks at least two stops`);
    assert.ok(!mission.stopIds.includes(route.stops[0].id), 'the start is not picked again');
    const plan = buildPlan(route, recommendedOrder(route, mission.stopIds), 2);
    assert.equal(plan.stops.length, mission.stopIds.length + 1);
    assert.ok(plan.distanceM > 0);
  }
  assert.equal(seen.size, missionCount());
  assert.deepEqual(missionForSol(4711, route.stops), missionForSol(4711, route.stops), 'the same sol gives the same mission');
});

test('"Retrace Curiosity" picks the rover stops nearest in sol', () => {
  const route = realRoute();
  let sol = 5000;
  while (missionForSol(sol, route.stops).id !== 'retrace') sol += 1;
  const picked = missionForSol(sol, route.stops).stopIds.map((id) => route.stops.find((/** @type {any} */ stop) => stop.id === id).sol);
  const all = route.stops.filter((/** @type {any} */ stop) => stop.kind === 'rover').map((/** @type {any} */ stop) => Math.abs(stop.sol - sol)).sort((a, b) => a - b);
  assert.deepEqual(picked.map((pickedSol) => Math.abs(pickedSol - sol)).sort((a, b) => a - b), all.slice(0, 3));
});

test('missions fall back to the full curated walk when rover stops are missing', () => {
  const route = realRoute();
  const curatedOnly = route.stops.filter((/** @type {any} */ stop) => stop.kind === 'curated');
  let sol = 5000;
  while (missionForSol(sol, route.stops).id !== 'retrace') sol += 1;
  assert.equal(missionForSol(sol, curatedOnly).id, 'full');
});

test('a custom point snaps to the nearest track, or is refused when too far', () => {
  const route = realRoute();
  const [lat, lon] = route.network.places[500];
  const added = addCustomPoint(route, lat + 0.00005, lon);
  assert.ok('stop' in added);
  if (!('stop' in added)) return;
  assert.equal(added.stop.kind, 'custom');
  assert.equal(route.stops[route.stops.length - 1], added.stop);
  const plan = buildPlan(route, [added.stop.id], 2);
  assert.ok(plan.sections.every((section) => section.distanceM > 0), 'the walk to it follows the tracks');
  const far = addCustomPoint(route, lat + 0.01, lon);
  assert.ok('error' in far && far.distanceM > MAX_SNAP_M);
});
