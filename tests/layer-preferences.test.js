// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLayerPreferences, serialiseLayerPreferences } from '../src/features/map/layer-preferences.js';

const IMAGERY = ['grayscale', 'colour'];
const OVERLAYS = ['contours', 'names', 'grid'];

test('with nothing stored, the first basemap is chosen and every overlay is on', () => {
  assert.deepEqual(parseLayerPreferences(null, IMAGERY, OVERLAYS), { imageryId: 'grayscale', overlayIds: OVERLAYS });
});

test('saved choices come back as they were saved', () => {
  const saved = serialiseLayerPreferences({ imageryId: 'colour', overlayIds: ['grid'] }, OVERLAYS);
  assert.deepEqual(parseLayerPreferences(saved, IMAGERY, OVERLAYS), { imageryId: 'colour', overlayIds: ['grid'] });
});

test('every overlay switched off stays off', () => {
  const saved = serialiseLayerPreferences({ imageryId: 'grayscale', overlayIds: [] }, OVERLAYS);
  assert.deepEqual(parseLayerPreferences(saved, IMAGERY, OVERLAYS).overlayIds, []);
});

test('an overlay added since the last visit starts on', () => {
  const saved = serialiseLayerPreferences({ imageryId: 'grayscale', overlayIds: ['names'] }, ['contours', 'names']);
  assert.deepEqual(parseLayerPreferences(saved, IMAGERY, OVERLAYS).overlayIds, ['names', 'grid']);
});

test('damaged or unexpected stored text falls back to the defaults', () => {
  const defaults = { imageryId: 'grayscale', overlayIds: OVERLAYS };
  assert.deepEqual(parseLayerPreferences('not json', IMAGERY, OVERLAYS), defaults);
  assert.deepEqual(parseLayerPreferences('null', IMAGERY, OVERLAYS), defaults);
  assert.deepEqual(parseLayerPreferences('{"imagery":"satellite","overlays":"all"}', IMAGERY, OVERLAYS), defaults);
});
