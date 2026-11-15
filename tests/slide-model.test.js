// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSlideComplete, slideProgress, SLIDE_COMPLETE_AT } from '../src/features/journey/slide-model.js';

test('slideProgress is the share of the track covered, held between 0 and 1', () => {
  assert.equal(slideProgress(100, 100, 200), 0);
  assert.equal(slideProgress(100, 200, 200), 0.5);
  assert.equal(slideProgress(100, 500, 200), 1);
  assert.equal(slideProgress(100, 40, 200), 0);
});

test('slideProgress is 0 when the track has no room', () => {
  assert.equal(slideProgress(0, 50, 0), 0);
});

test('a slide confirms only near the far end', () => {
  assert.equal(isSlideComplete(SLIDE_COMPLETE_AT - 0.01), false);
  assert.equal(isSlideComplete(SLIDE_COMPLETE_AT), true);
  assert.equal(isSlideComplete(1), true);
});
