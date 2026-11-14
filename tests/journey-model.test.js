// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearingDeg, buildJourney, hazardsWithin, headingAhead, positionAt, turnToward, walkOn } from '../src/features/journey/journey-model.js';
import { drawDrill } from '../src/features/conditions/space-weather-drill.js';

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

test('walkOn stops at each stop once, in order, then walks to the end', () => {
  const journey = buildJourney(plan);
  let progress = { walkedM: 0, nextIndex: 0 };
  const reached = [];
  for (let step = 0; step < 100; step += 1) {
    const result = walkOn(journey, progress, 7);
    if (result.arrival) reached.push(result.arrival.stopId);
    progress = result;
  }
  assert.deepEqual(reached, ['b', 'c', 'a']);
  assert.equal(progress.walkedM, journey.totalM);
});

test('walkOn reaches two stops at the same place one after the other, never skipping one', () => {
  // Two stops on the same point: the second leg has no length. Test data only.
  const samePlace = /** @type {any} */ ({
    stops: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    sections: [section('b', [[0, 0], [0.001, 0]]), section('c', [[0.001, 0], [0.001, 0]]), section('a', [[0.001, 0], [0, 0]], true)],
  });
  const journey = buildJourney(samePlace);
  const first = walkOn(journey, { walkedM: 0, nextIndex: 0 }, 1000);
  const second = walkOn(journey, first, 0);
  assert.deepEqual([first.arrival?.stopId, second.arrival?.stopId], ['b', 'c']);
  assert.equal(walkOn(journey, second, 0).arrival, null);
});

test('headingAhead looks ahead but not past the next stop', () => {
  const journey = buildJourney(plan);
  const corner = journey.arrivals[0].alongM;
  // 10 m before the corner, looking 30 m ahead: the bend pulls the heading east of north.
  assert.ok(headingAhead(journey, corner - 10, 30, journey.totalM) > 10);
  // The same, but stopping at the corner: still due north.
  assert.equal(Math.round(headingAhead(journey, corner - 10, 30, corner)), 0);
  // At the corner itself: the next leg's direction, east.
  assert.equal(Math.round(headingAhead(journey, corner, 30, corner)), 90);
});

test('turnToward turns the short way round', () => {
  assert.equal(turnToward(350, 10, 0.5), 0);
  assert.equal(turnToward(10, 350, 0.5), 0);
  assert.equal(turnToward(90, 180, 1), 180);
  assert.equal(turnToward(90, 180, 0), 90);
});

test('drawDrill picks an alert our rule knows, with a duration in range', () => {
  const lowest = drawDrill(() => 0);
  const highest = drawDrill(() => 0.999);
  for (const drill of [lowest, highest]) {
    assert.ok(['no-go', 'caution'].includes(drill.level));
    assert.ok(drill.durationMinutes >= 20 && drill.durationMinutes <= 240);
    assert.equal(drill.durationMinutes % 5, 0);
  }
  assert.notEqual(lowest.title, highest.title);
});

test('buildJourney marks steep stretches and sandy stops, in walking order', () => {
  // Leg to b: easy then hard; b is a sandy hollow. Test data only.
  const hazardous = /** @type {any} */ ({
    stops: [{ id: 'a', terrain: 'ridge' }, { id: 'b', terrain: 'hollow' }],
    sections: [
      { toId: 'b', toName: 'b', isReturn: false, path: { runs: [
        { difficulty: 'easier', points: [[0, 0], [0.001, 0]] },
        { difficulty: 'hard', points: [[0.001, 0], [0.002, 0]] },
      ] } },
      section('a', [[0.002, 0], [0, 0]], true),
    ],
  });
  const journey = buildJourney(hazardous);
  assert.deepEqual(journey.hazards.map((hazard) => hazard.kind), ['steep', 'sand']);
  assert.ok(Math.abs(journey.hazards[0].alongM - 59.157) < 0.5);
  assert.equal(journey.hazards[1].alongM, journey.arrivals[0].alongM);
  assert.equal(journey.points.length, 4);
});

test('hazardsWithin warns once each, only inside the warning distance', () => {
  const journey = /** @type {any} */ ({ hazards: [{ alongM: 100 }, { alongM: 105 }, { alongM: 300 }] });
  assert.equal(hazardsWithin(journey, 0, 50, 30), 0);
  assert.equal(hazardsWithin(journey, 0, 80, 30), 2);
  assert.equal(hazardsWithin(journey, 2, 80, 30), 2);
  assert.equal(hazardsWithin(journey, 2, 400, 30), 3);
});
