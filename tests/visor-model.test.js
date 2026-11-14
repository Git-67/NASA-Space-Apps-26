// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gauge, relativeBearing, tapeTicks } from '../src/features/journey/visor-model.js';

test('relativeBearing is signed and takes the short way round', () => {
  assert.equal(relativeBearing(350, 10), 20);
  assert.equal(relativeBearing(10, 350), -20);
  assert.equal(relativeBearing(90, 270), -180);
});

test('tapeTicks labels cardinals and every 30 degrees, wrapping past north', () => {
  const ticks = tapeTicks(355, 20, 5);
  assert.deepEqual(ticks.map((tick) => tick.bearingDeg), [335, 340, 345, 350, 355, 0, 5, 10, 15]);
  assert.deepEqual(ticks.filter((tick) => tick.label).map((tick) => tick.label), ['N']);
  assert.equal(ticks[0].offsetDeg, -20);
  assert.deepEqual(tapeTicks(45, 20, 5).filter((tick) => tick.label).map((tick) => tick.label), ['30', '60']);
});

test('gauge turns near at three quarters and over at the limit', () => {
  assert.deepEqual(gauge(100, 480), { share: 100 / 480, level: 'ok' });
  assert.equal(gauge(360, 480).level, 'near');
  assert.deepEqual(gauge(2500, 2000), { share: 1, level: 'over' });
});
