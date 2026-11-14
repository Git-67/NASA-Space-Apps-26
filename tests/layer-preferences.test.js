// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLayerPreferences, serialiseLayerPreferences } from '../src/features/map/layer-preferences.js';

const IMAGERY = ['grayscale', 'colour'];
const OVERLAYS = ['contours', 'names', 'grid'];
/** As in the product: place names start off. */
const DEFAULT_ON = ['contours', 'grid'];
const DEFAULTS = { imageryId: 'grayscale', overlayIds: DEFAULT_ON };

test('with nothing stored, the first basemap is chosen and the default overlays are on', () => {
  assert.deepEqual(parseLayerPreferences(null, IMAGERY, OVERLAYS, DEFAULT_ON), DEFAULTS);
});

test('saved choices come back as they were saved, including an overlay that is off by default', () => {
  const saved = serialiseLayerPreferences({ imageryId: 'colour', overlayIds: ['names'] }, OVERLAYS);
  assert.deepEqual(parseLayerPreferences(saved, IMAGERY, OVERLAYS, DEFAULT_ON), { imageryId: 'colour', overlayIds: ['names'] });
});

test('every overlay switched off stays off', () => {
  const saved = serialiseLayerPreferences({ imageryId: 'grayscale', overlayIds: [] }, OVERLAYS);
  assert.deepEqual(parseLayerPreferences(saved, IMAGERY, OVERLAYS, DEFAULT_ON).overlayIds, []);
});

test('an overlay added since the last visit takes its default', () => {
  const saved = serialiseLayerPreferences({ imageryId: 'grayscale', overlayIds: [] }, ['contours']);
  // "names" and "grid" were not in the saved text: names is off by default, grid is on.
  assert.deepEqual(parseLayerPreferences(saved, IMAGERY, OVERLAYS, DEFAULT_ON).overlayIds, ['grid']);
});

test('damaged or unexpected stored text falls back to the defaults', () => {
  assert.deepEqual(parseLayerPreferences('not json', IMAGERY, OVERLAYS, DEFAULT_ON), DEFAULTS);
  assert.deepEqual(parseLayerPreferences('null', IMAGERY, OVERLAYS, DEFAULT_ON), DEFAULTS);
  assert.deepEqual(parseLayerPreferences('{"imagery":"satellite","overlays":"all"}', IMAGERY, OVERLAYS, DEFAULT_ON), DEFAULTS);
});
