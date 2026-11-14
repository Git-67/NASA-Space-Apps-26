// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chainSegments, smoothLine, traceLevel, traceStepContours } from '../src/features/map/contour-model.js';
import { activeSection, difficultyRuns, midpointHeading, sectionPath } from '../src/features/map/route-geometry.js';
import { chooseGridStep, formatGridDegrees, gridValues } from '../src/features/map/graticule-model.js';
import { latitudeOfMercatorRow, mercatorRowFraction, mercatorRowsForBand, toTmsRow } from '../src/features/map/mercator-tiles.js';
import { stackLabels } from '../src/features/map/label-stacking.js';
import { parseDemCalibration, parseLandmarks } from '../src/features/map/map-layer-data.js';

/** A 3 x 3 grid with a low left column and a high right side. Test data only. */
const step = [
  1, 3, 3,
  1, 3, 3,
  1, 3, 3,
];

test('traceLevel puts a vertical line where the values cross the level', () => {
  const segments = traceLevel(step, 3, 3, 2);
  assert.equal(segments.length, 8); // two cells high, one segment each
  for (let i = 0; i < segments.length; i += 2) assert.equal(segments[i], 1); // halfway between centres 0.5 and 1.5
});

test('traceLevel skips cells that touch missing data', () => {
  const withGap = [...step];
  withGap[0] = NaN;
  assert.equal(traceLevel(withGap, 3, 3, 2).length, 4);
});

test('traceStepContours draws one line per boundary between whole-number levels', () => {
  const contours = traceStepContours(step, 3, 3);
  assert.deepEqual(contours.map((contour) => contour.level), [1.5, 2.5]);
  assert.ok(contours.every((contour) => contour.segments.length > 0));
});

test('traceStepContours draws nothing on flat ground', () => {
  assert.deepEqual(traceStepContours([5, 5, 5, 5], 2, 2), []);
});

test('chooseGridStep keeps the grid to a readable number of lines', () => {
  assert.equal(chooseGridStep(0.01), 0.002);
  assert.equal(chooseGridStep(0.1), 0.02);
  assert.equal(chooseGridStep(100), 1);
});

test('gridValues lists exact multiples of the step inside the range', () => {
  assert.deepEqual(gridValues(-4.811, -4.799, 0.005), [-4.81, -4.805, -4.8]);
  assert.deepEqual(gridValues(137.3801, 137.3899, 0.02), []);
});

test('formatGridDegrees shows the decimals the step needs and keeps the sign', () => {
  assert.equal(formatGridDegrees(-4.8, 0.005), '-4.800°');
  assert.equal(formatGridDegrees(137.4, 0.1), '137.4°');
});

test('Mercator rows and latitudes convert both ways', () => {
  const row = mercatorRowFraction(-4.805, 17);
  assert.ok(Math.abs(latitudeOfMercatorRow(row, 17) + 4.805) < 1e-9);
  // Tile row checked against NASA's server on 14 Nov 2026: this row returned colour imagery.
  assert.equal(toTmsRow(Math.floor(row), 17), 63784);
});

test('mercatorRowsForBand fills the whole tile with no gaps', () => {
  const rows = mercatorRowsForBand(-4.79, -4.79 + -180 / 2 ** 14, 15, 256);
  assert.ok(rows.length >= 1);
  assert.ok(rows[0].topPx <= 0);
  for (let i = 1; i < rows.length; i += 1) {
    assert.ok(Math.abs(rows[i].topPx - (rows[i - 1].topPx + rows[i - 1].heightPx)) < 1e-6);
  }
  const last = rows[rows.length - 1];
  assert.ok(last.topPx + last.heightPx >= 256);
});

test('stackLabels moves overlapping labels down and leaves clear ones alone', () => {
  const shifts = stackLabels([
    { x: 0, y: 10, width: 50, height: 20 },
    { x: 10, y: 0, width: 50, height: 20 },
    { x: 200, y: 5, width: 50, height: 20 },
  ], 4);
  assert.deepEqual(shifts, [14, 0, 0]);
});

test('parseLandmarks keeps names and positions and rejects damaged entries', () => {
  assert.deepEqual(parseLandmarks({ places: [{ name: 'Kimberley', lat: -4.6, lon: 137.4, source: 'sites' }] }),
    [{ name: 'Kimberley', lat: -4.6, lon: 137.4 }]);
  assert.throws(() => parseLandmarks({ places: [{ name: 'No position' }] }));
  assert.throws(() => parseLandmarks({}));
});

test('parseDemCalibration rejects a missing or non-positive scale', () => {
  const good = { layer: 'Gale_DEM_SMG_1m', interceptM: -4600, metresPerLevel: 18.6, rmsErrorM: 5.9, waypointCount: 10 };
  assert.equal(parseDemCalibration(good).metresPerLevel, 18.6);
  assert.throws(() => parseDemCalibration({ ...good, metresPerLevel: 0 }));
  assert.throws(() => parseDemCalibration(null));
});

test('chainSegments joins touching segments into one line, whatever their direction', () => {
  const lines = chainSegments([0, 0, 1, 0, 2, 0, 1, 0, 2, 0, 3, 1]);
  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0], [3, 1, 2, 0, 1, 0, 0, 0]);
});

test('smoothLine keeps the ends of an open line and rounds its corner', () => {
  const smooth = smoothLine([0, 0, 1, 0, 1, 1], 1);
  assert.deepEqual(smooth.slice(0, 2), [0, 0]);
  assert.deepEqual(smooth.slice(-2), [1, 1]);
  assert.equal(smooth.length / 2, 6);
});

/** Three route points joined by drives with a bend in each. Test data only. */
const routePoints = [
  { sol: 1, lat: 0, lon: 0, elevationM: 0, tiltDeg: 1, alongM: 0, track: [] },
  { sol: 2, lat: 0, lon: 2, elevationM: 0, tiltDeg: 12, alongM: 2, track: [[0, 0], [1, 1], [0, 2]] },
  { sol: 3, lat: 0, lon: 4, elevationM: 0, tiltDeg: 3, alongM: 4, track: [[0, 2], [-1, 3], [0, 4]] },
];

test('sectionPath follows the drives and reverses for a walk back', () => {
  assert.deepEqual(sectionPath(routePoints, 0, 2), [[0, 0], [1, 1], [0, 2], [-1, 3], [0, 4]]);
  assert.deepEqual(sectionPath(routePoints, 2, 1), [[0, 4], [-1, 3], [0, 2]]);
});

test('activeSection picks the section leaving the chosen stop', () => {
  const sections = [{ fromId: 'a', toId: 'b' }, { fromId: 'b', toId: 'a' }];
  assert.equal(activeSection(/** @type {any} */ (sections), 'b'), sections[1]);
  assert.equal(activeSection(/** @type {any} */ (sections), null), null);
});

test('difficultyRuns colours each drive by its own tilt and merges equal neighbours', () => {
  const rate = (/** @type {number} */ tilt) => (tilt >= 10 ? 'moderate' : 'easier');
  const runs = difficultyRuns(routePoints, 0, 2, rate);
  // Both drives touch the 12 degree waypoint, so both are moderate and merge into one run.
  assert.deepEqual(runs.map((run) => run.difficulty), ['moderate']);
  assert.equal(runs[0].path.length, 5);
});

test('midpointHeading finds the halfway point and the direction of travel', () => {
  const east = midpointHeading([[0, 0], [0, 4]]);
  assert.deepEqual([east.lat, east.lon, east.angleDeg], [0, 2, 0]);
  const south = midpointHeading([[2, 0], [0, 0]]);
  assert.equal(south.angleDeg, 90);
});
