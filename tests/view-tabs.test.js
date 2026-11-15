// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewFromHash } from '../src/features/views/view-tabs.js';

test('viewFromHash reads a named view from the address', () => {
  assert.equal(viewFromHash('#briefing'), 'briefing');
  assert.equal(viewFromHash('#weather'), 'weather');
  assert.equal(viewFromHash('#map'), 'map');
});

test('viewFromHash opens the map when the address names no view or an unknown one', () => {
  assert.equal(viewFromHash(''), 'map');
  assert.equal(viewFromHash('#'), 'map');
  assert.equal(viewFromHash('#settings'), 'map');
});
