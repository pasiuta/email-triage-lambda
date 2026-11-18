import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toDocument } from '../app/core/input.js';
import { mapLimit } from '../app/core/pool.js';
import { createCache } from '../app/core/cache.js';
import { createProcessor } from '../app/core/processor.js';
import { classify } from '../app/modes/classify.js';

const silentLogger = { debug() {}, info() {}, warn() {}, error() {} };

test('toDocument validates and normalizes items', () => {
  assert.deepEqual(toDocument({ subject: ' Hi ', body: ' text ' }), { subject: 'Hi', body: 'text' });
  assert.deepEqual(toDocument({ subject: '', body: '  ' }), { error: 'empty_input' });
  assert.deepEqual(toDocument({}), { error: 'empty_input' });
  for (const bad of [null, 'str', 42, [], { subject: 1 }, { body: null }]) {
    assert.deepEqual(toDocument(bad), { error: 'invalid_input' });
  }
});

test('mapLimit preserves order and respects the concurrency limit', async () => {
  let active = 0;
  let peak = 0;
  const out = await mapLimit([5, 1, 3, 2, 4], 2, async (n) => {
    peak = Math.max(peak, ++active);
    await new Promise((r) => setTimeout(r, n));
    active--;
    return n * 10;
  });
  assert.deepEqual(out, [50, 10, 30, 20, 40]);
  assert.equal(peak, 2);
});

test('cache dedupes concurrent calls and does not cache failures', async () => {
  const cache = createCache();
  let calls = 0;
  const compute = async () => ++calls;
  assert.deepEqual(await Promise.all([cache('k', compute), cache('k', compute)]), [1, 1]);
  assert.equal(calls, 1);

  await assert.rejects(cache('bad', async () => { throw new Error('boom'); }));
  assert.equal(await cache('bad', async () => 'ok'), 'ok');
});

test('processor isolates failures and keeps processing valid items', async () => {
  const provider = {
    name: 'fake',
    run: async (_mode, doc) => {
      if (doc.subject === 'fail') throw new Error('model down');
      return ['finance'];
    },
  };
  const run = createProcessor({ provider, cache: createCache(), concurrency: 2, logger: silentLogger });
  const out = await run(
    [{ id: 1, subject: 'ok' }, { id: 2, subject: 'fail' }, { id: 3, body: ' ' }, 'junk'],
    classify,
  );
  assert.deepEqual(out, [
    { id: 1, topics: ['finance'] },
    { id: 2, error: 'processing_failed' },
    { id: 3, error: 'empty_input' },
    { id: null, error: 'invalid_input' },
  ]);
});
