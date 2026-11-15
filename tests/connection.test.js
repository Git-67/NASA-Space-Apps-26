// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAILURES_TO_GO_OFFLINE, nextSignal } from '../src/lib/connection.js';

test('one missed check does not take the page offline', () => {
  assert.deepEqual(nextSignal({ mode: 'online', failures: 0 }, false), { mode: 'online', failures: 1 });
});

test('enough missed checks in a row take it offline', () => {
  let state = { mode: /** @type {'online' | 'offline'} */ ('online'), failures: 0 };
  for (let i = 0; i < FAILURES_TO_GO_OFFLINE; i += 1) state = nextSignal(state, false);
  assert.equal(state.mode, 'offline');
});

test('one success brings it back and clears the count', () => {
  assert.deepEqual(nextSignal({ mode: 'offline', failures: 5 }, true), { mode: 'online', failures: 0 });
  assert.deepEqual(nextSignal({ mode: 'online', failures: 1 }, true), { mode: 'online', failures: 0 });
});
