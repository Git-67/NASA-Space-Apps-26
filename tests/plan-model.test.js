// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, listDangers, listKit, measureLeg, measurePath, rateDifficulty } from '../src/features/plan/plan-model.js';
import { walkProfile } from '../src/features/plan/elevation-profile.js';

/** A tiny made-up route: three stops on a path that climbs 10 m then drops 4 m. Test data only. */
const stop = (id, pointIndex, terrain, kit) => ({
  id, name: id, summary: '', terrain, found: '', taskOurs: '', kitOurs: kit, workMinutesOurs: 30, sourceLabel: '', sourceUrl: '', pointIndex,
});
const route = {
  points: [
    { sol: 1, lat: 0, lon: 0, elevationM: 100, tiltDeg: 5, alongM: 0, track: [] },
    { sol: 2, lat: 0, lon: 0, elevationM: 110, tiltDeg: 12, alongM: 500, track: [] },
    { sol: 3, lat: 0, lon: 0, elevationM: 106, tiltDeg: 21, alongM: 1000, track: [] },
  ],
  stops: [stop('a', 0, 'transition', ['Hammer']), stop('b', 1, 'hollow', ['Hammer', 'Scoop']), stop('c', 2, 'ridge', [])],
};

test('rateDifficulty uses the 10 and 20 degree boundaries', () => {
  assert.equal(rateDifficulty(9.9), 'easier');
  assert.equal(rateDifficulty(10), 'moderate');
  assert.equal(rateDifficulty(20), 'hard');
});

test('measurePath sums climbs and drops separately', () => {
  assert.deepEqual(measurePath(route.points, 0, 2), { distanceM: 1000, ascentM: 10, descentM: 4, maxRoverTiltDeg: 21 });
});

test('buildPlan goes out through the selected stops and returns the same way', () => {
  const plan = buildPlan(route, ['b', 'c'], 2);
  assert.equal(plan.sections.length, 3);
  assert.equal(plan.distanceM, 2000);
  // 2 km at 2 km/h is 60 minutes of walking, plus 30 minutes of work at each of three stops.
  // Compared with a tolerance because the minutes come from floating-point division.
  assert.ok(Math.abs(plan.walkMinutes - 60) < 1e-9);
  assert.ok(Math.abs(plan.totalMinutes - 150) < 1e-9);
  const back = plan.sections[2];
  assert.equal(back.isReturn, true);
  assert.equal(back.ascentM, 4);
  assert.equal(back.descentM, 10);
});

test('buildPlan always includes the first stop and skips unselected ones', () => {
  const plan = buildPlan(route, ['c'], 2);
  assert.deepEqual(plan.stops.map((s) => s.id), ['a', 'c']);
  assert.equal(plan.sections[0].distanceM, 1000);
});

test('buildPlan with only the start has no walking', () => {
  const plan = buildPlan(route, [], 2);
  assert.equal(plan.sections.length, 0);
  assert.equal(plan.totalMinutes, 30);
});

test('listDangers names the hollow and reports steep ground', () => {
  const dangers = listDangers(buildPlan(route, ['b', 'c'], 2));
  assert.match(dangers[0].detail, /hollow at b/);
  assert.ok(dangers.some((danger) => danger.title === 'Steep ground'));
});

test('listKit merges repeated items and records which stops need them', () => {
  const kit = listKit(buildPlan(route, ['b'], 2));
  assert.deepEqual(kit.find((entry) => entry.item === 'Hammer')?.forStops, ['a', 'b']);
  assert.equal(kit.filter((entry) => entry.item === 'Hammer').length, 1);
});

test('measureLeg walked backwards swaps climb and descent', () => {
  assert.deepEqual(measureLeg(route.points, 2, 0), { distanceM: 1000, ascentM: 4, descentM: 10, maxRoverTiltDeg: 21 });
});

test('buildPlan follows the chosen order, even against the rover direction', () => {
  const plan = buildPlan(route, ['c', 'b'], 2);
  assert.deepEqual(plan.stops.map((s) => s.id), ['a', 'c', 'b']);
  assert.deepEqual(plan.sections.map((s) => [s.fromIndex, s.toIndex]), [[0, 2], [2, 1], [1, 0]]);
  // Out 1000 m, back 500 m to b, then 500 m home.
  assert.equal(plan.distanceM, 2000);
  assert.equal(plan.sections[1].ascentM, 4);
});

test('buildPlan keeps the start first and ignores unknown or repeated ids', () => {
  const plan = buildPlan(route, ['b', 'a', 'zzz', 'b'], 2);
  assert.deepEqual(plan.stops.map((s) => s.id), ['a', 'b']);
});

test('walkProfile follows the visiting order, reading the path backwards where needed', () => {
  const { series, marks } = walkProfile(route, buildPlan(route, ['c', 'b'], 2));
  assert.deepEqual(series.map((point) => [point.walkedM, point.elevationM]), [[0, 100], [500, 110], [1000, 106], [1500, 110]]);
  assert.deepEqual(marks.map((mark) => mark.number), [1, 3, 2]);
});
