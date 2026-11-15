// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compassName, parseGroundViews, turnFrame } from '../src/features/ground/ground-model.js';
import { signedTurnDeg, touchAngleDeg, wrapDeg } from '../src/features/map/rotation-gesture.js';

/** A made-up photo. Test data only. */
const frame = (bearingDeg, extra = {}) => ({
  file: 'data/processed/ground/a/1.jpg', bearingDeg, elevationDeg: 0, sol: 1, takenUtc: '2025-01-01T00:00:00Z',
  localMarsTime: '12:00', credit: 'NASA/JPL-Caltech', imageId: 'X', originalUrl: 'https://mars.nasa.gov/x.jpg', ...extra,
});

test('compassName names the nearest of eight points and wraps round north', () => {
  assert.equal(compassName(0), 'north');
  assert.equal(compassName(44), 'north-east');
  assert.equal(compassName(180), 'south');
  assert.equal(compassName(350), 'north');
  assert.equal(compassName(-90), 'west');
  assert.equal(compassName(720 + 91), 'east');
});

test('turnFrame wraps at both ends', () => {
  assert.equal(turnFrame(0, -1, 8), 7);
  assert.equal(turnFrame(7, 1, 8), 0);
  assert.equal(turnFrame(3, 1, 8), 4);
});

test('parseGroundViews sorts photos by direction and drops incomplete ones', () => {
  const views = parseGroundViews({ views: {
    a: { camera: 'Left navigation camera', frames: [frame(200), frame(10), frame(90, { file: undefined }), frame(50, { originalUrl: 'http://not-secure' })] },
    b: { frames: [] },
  } });
  assert.deepEqual(views.get('a')?.frames.map((f) => f.bearingDeg), [10, 200]);
  assert.equal(views.has('b'), false);
});

test('parseGroundViews rejects a file of the wrong shape', () => {
  assert.throws(() => parseGroundViews({}), /damaged/);
  assert.throws(() => parseGroundViews(null), /damaged/);
});

test('touchAngleDeg measures clockwise from the right of the screen', () => {
  assert.equal(touchAngleDeg({ clientX: 0, clientY: 0 }, { clientX: 10, clientY: 0 }), 0);
  assert.equal(touchAngleDeg({ clientX: 0, clientY: 0 }, { clientX: 0, clientY: 10 }), 90);
});

test('signedTurnDeg takes the short way round', () => {
  assert.equal(signedTurnDeg(170, -170), 20);
  assert.equal(signedTurnDeg(-170, 170), -20);
  assert.equal(signedTurnDeg(10, 40), 30);
});

test('wrapDeg gives a compass angle', () => {
  assert.equal(wrapDeg(-90), 270);
  assert.equal(wrapDeg(360), 0);
});
