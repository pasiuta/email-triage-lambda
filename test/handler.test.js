import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.MODEL_PROVIDER = 'local';
process.env.LOG_LEVEL = 'ERROR';
const { handler } = await import('../app/handler.js');

const items = [
  { id: 1, subject: 'Invoice #1234 overdue', body: 'Dear customer, your invoice payment is overdue. Please pay the balance.' },
  { id: 4, subject: '', body: ' ' },
];

test('handler classifies a batch end-to-end', async () => {
  assert.deepEqual(await handler({ mode: 'classify', items }), [
    { id: 1, topics: ['finance'] },
    { id: 4, error: 'empty_input' },
  ]);
});

test('handler summarizes a batch end-to-end', async () => {
  const [first, second] = await handler({ mode: 'summarize', items });
  assert.match(first.summary, /invoice payment is overdue/);
  assert.deepEqual(second, { id: 4, error: 'empty_input' });
});

test('handler accepts a bare array (mode from DEFAULT_MODE)', async () => {
  assert.equal((await handler(items)).length, 2);
});

test('handler rejects an unknown mode or a non-array payload', async () => {
  await assert.rejects(handler({ mode: 'translate', items }), /Unknown mode/);
  await assert.rejects(handler({ mode: 'classify', items: 'nope' }), /must be an array/);
  await assert.rejects(handler(undefined), /must be an array/);
});
