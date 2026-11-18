import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../app/modes/classify.js';
import { summarize } from '../app/modes/summarize.js';

test('classify.parse keeps only known topics, in the order the model gave them', () => {
  assert.deepEqual(classify.parse('HR, marketing'), ['hr', 'marketing']);
  assert.deepEqual(classify.parse('Topics: technical.'), ['technical']);
  assert.deepEqual(classify.parse('legal, finance, sales, hr'), ['legal', 'finance', 'sales']);
  assert.deepEqual(classify.parse('no idea'), ['other']);
});

test('summarize.parse collapses whitespace', () => {
  assert.equal(summarize.parse('  A short\n summary.  '), 'A short summary.');
});
