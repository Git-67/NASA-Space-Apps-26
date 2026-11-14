// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearingDeg, buildJourney, nextArrival, positionAt } from '../src/features/journey/journey-model.js';

/** A leg in a plan. Test data only. */
const section = (toId, points, isReturn = false) => ({
  toId, toName: toId, isReturn, path: { runs: [{ difficulty: 'easier', points }] },
});
/** Out 0.001 degrees north, then east, then back. About 59 m per step on Mars. Test data only. */
const plan = /** @type {any} */ ({
  stops: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  sections: [
    section('b', [[0, 0], [0.001, 0]]),
    section('c', [[0.001, 0], [0.001, 0.001]]),
    section('a', [[0.001, 0.001], [0.001, 0], [0, 0]], true),
  ],
});

test('buildJourney joins legs without repeating joints and records arrivals', () => {
  const journey = buildJourney(plan);
  assert.equal(journey.points.length, 5);
  assert.deepEqual(journey.arrivals.map((arrival) => [arrival.stopId, arrival.visitNumber, arrival.isFinish]), [['b', 2, false], ['c', 3, false], ['a', 4, true]]);
  assert.ok(Math.abs(journey.totalM - 4 * 59.157) < 0.5);
});

test('bearingDeg points north, east, south and west', () => {
  assert.equal(Math.round(bearingDeg(0, 0, 1, 0)), 0);
  assert.equal(Math.round(bearingDeg(0, 0, 0, 1)), 90);
  assert.equal(Math.round(bearingDeg(1, 0, 0, 0)), 180);
  assert.equal(Math.round(bearingDeg(0, 1, 0, 0)), 270);
});

test('positionAt interpolates along the walk and gives the direction of travel', () => {
  const journey = buildJourney(plan);
  const halfway = positionAt(journey, journey.points[1].alongM / 2);
  assert.ok(Math.abs(halfway.lat - 0.0005) < 1e-9);
  assert.equal(Math.round(halfway.headingDeg), 0);
  const second = positionAt(journey, journey.points[1].alongM + 10);
  assert.equal(Math.round(second.headingDeg), 90);
  assert.deepEqual([positionAt(journey, -5).lat, positionAt(journey, 1e9).lat], [0, 0]);
});

test('nextArrival is the first stop ahead, and null at the end', () => {
  const journey = buildJourney(plan);
  assert.equal(nextArrival(journey, 0)?.stopId, 'b');
  assert.equal(nextArrival(journey, journey.arrivals[0].alongM)?.stopId, 'c');
  assert.equal(nextArrival(journey, journey.totalM), null);
});
