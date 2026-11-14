// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, listDangers, listKit, orientedPath, planRisk, rateDifficulty, recommendedOrder } from '../src/features/plan/plan-model.js';
import { walkProfile } from '../src/features/plan/elevation-profile.js';

/** A tiny made-up route of three stops with precomputed safe paths. Test data only. */
const stop = (id, pointIndex, terrain, kit) => ({
  id, name: id, summary: '', terrain, found: '', tasksOurs: [], kitOurs: kit, workMinutesOurs: 30, sourceLabel: '', sourceUrl: '', pointIndex,
});
/** A straight safe path with one difficulty. Test data only. */
const path = (distanceM, ascentM, descentM, maxTiltDeg, costM, startM = 100) => ({
  distanceM, ascentM, descentM, costM, maxTiltDeg, steepest: [0, 1], middle: [0, 0.5],
  runs: [{ difficulty: maxTiltDeg >= 20 ? 'hard' : maxTiltDeg >= 10 ? 'moderate' : 'easier', points: [[0, 0], [0, 1]] }],
  profile: [[0, startM], [distanceM, startM + ascentM - descentM]],
});
const route = {
  points: [
    { sol: 1, lat: 0, lon: 0, elevationM: 100, tiltDeg: 5, alongM: 0 },
    { sol: 2, lat: 0, lon: 0, elevationM: 110, tiltDeg: 12, alongM: 500 },
    { sol: 3, lat: 0, lon: 0, elevationM: 106, tiltDeg: 21, alongM: 1000 },
  ],
  stops: [stop('a', 0, 'transition', ['Hammer']), stop('b', 1, 'hollow', ['Hammer', 'Scoop']), stop('c', 2, 'ridge', [])],
  safePaths: {
    'a|b': path(500, 10, 0, 12, 1500),
    'a|c': path(800, 6, 0, 21, 8000),
    'b|c': path(500, 0, 4, 21, 5000, 110),
  },
};

test('rateDifficulty uses the 10 and 20 degree boundaries', () => {
  assert.equal(rateDifficulty(9.9), 'easier');
  assert.equal(rateDifficulty(10), 'moderate');
  assert.equal(rateDifficulty(20), 'hard');
});

test('orientedPath reverses a stored path and swaps climb and descent', () => {
  const back = orientedPath(route, 'b', 'a');
  assert.equal(back.ascentM, 0);
  assert.equal(back.descentM, 10);
  assert.deepEqual(back.profile, [[0, 110], [500, 100]]);
  assert.throws(() => orientedPath({ ...route, safePaths: {} }, 'a', 'b'));
});

test('buildPlan visits the stops on their safe paths and returns to the start', () => {
  const plan = buildPlan(route, ['b', 'c'], 2);
  assert.equal(plan.sections.length, 3);
  // 500 + 500 out, 800 back.
  assert.equal(plan.distanceM, 1800);
  // 1.8 km at 2 km/h is 54 minutes of walking, plus 30 minutes of work at each of three stops.
  assert.ok(Math.abs(plan.walkMinutes - 54) < 1e-9);
  assert.ok(Math.abs(plan.totalMinutes - 144) < 1e-9);
  const back = plan.sections[2];
  assert.equal(back.isReturn, true);
  assert.equal(back.descentM, 6);
  assert.equal(back.difficulty, 'hard');
});

test('buildPlan always includes the first stop and skips unselected ones', () => {
  const plan = buildPlan(route, ['c'], 2);
  assert.deepEqual(plan.stops.map((s) => s.id), ['a', 'c']);
  assert.equal(plan.sections[0].distanceM, 800);
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

test('buildPlan follows the chosen order', () => {
  const plan = buildPlan(route, ['c', 'b'], 2);
  assert.deepEqual(plan.stops.map((s) => s.id), ['a', 'c', 'b']);
  assert.deepEqual(plan.sections.map((s) => `${s.fromId}>${s.toId}`), ['a>c', 'c>b', 'b>a']);
  assert.equal(plan.sections[1].ascentM, 4);
});

test('buildPlan keeps the start first and ignores unknown or repeated ids', () => {
  const plan = buildPlan(route, ['b', 'a', 'zzz', 'b'], 2);
  assert.deepEqual(plan.stops.map((s) => s.id), ['a', 'b']);
});

test('walkProfile joins the legs in visiting order, reading reversed paths backwards', () => {
  const { series, marks } = walkProfile(buildPlan(route, ['c', 'b'], 2));
  assert.deepEqual(series.map((point) => [point.walkedM, point.elevationM]), [[0, 100], [800, 106], [1300, 110]]);
  assert.deepEqual(marks.map((mark) => [mark.walkedM, mark.number]), [[0, 1], [800, 2], [1300, 3]]);
});

test('recommendedOrder picks the order with the lowest total risk', () => {
  // a>b>c>a costs 1500 + 5000 + 8000; a>c>b>a costs 8000 + 5000 + 1500. Equal, so the first order found is kept.
  assert.deepEqual(recommendedOrder(route), ['b', 'c']);
  const cheaperBack = { ...route, safePaths: { ...route.safePaths, 'a|c': path(800, 6, 0, 5, 800) } };
  assert.equal(planRisk(cheaperBack, ['b', 'c']), 1500 + 5000 + 800);
  for (const order of [['c', 'b']]) assert.ok(planRisk(cheaperBack, recommendedOrder(cheaperBack)) <= planRisk(cheaperBack, order));
});
