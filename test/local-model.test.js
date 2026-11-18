import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifier } from '../app/models/local/classifier.js';
import { summarizeText } from '../app/models/local/summarizer.js';

const emails = JSON.parse(await readFile(new URL('../sample/emails.json', import.meta.url), 'utf8'));
const byId = (id) => emails.find((e) => e?.id === id);
const text = (e) => `${e.subject} ${e.body}`;

test('local classifier assigns the expected topics to the sample emails', () => {
  const expected = { 1: ['finance'], 2: ['technical'], 3: ['hr', 'marketing'], 5: ['support'], 6: ['legal'], 7: ['sales'] };
  for (const [id, topics] of Object.entries(expected)) {
    assert.deepEqual(classifier.predict(text(byId(Number(id)))), topics, `email ${id}`);
  }
});

test('local classifier falls back to "other" for unknown vocabulary', () => {
  assert.deepEqual(classifier.predict('zzz qqq xyz'), ['other']);
});

test('local summarizer returns 1-2 short sentences and skips greetings', () => {
  for (const id of [1, 2, 3, 5, 6, 7]) {
    const summary = summarizeText(byId(id));
    const sentences = summary.split(/(?<=[.!?])\s+/);
    assert.ok(summary.length > 0 && summary.length <= 280, `email ${id} length`);
    assert.ok(sentences.length <= 2, `email ${id} sentences`);
    assert.ok(!/^dear\b/i.test(summary), `email ${id} greeting`);
  }
});

test('local summarizer falls back to the subject for a subject-only email', () => {
  assert.equal(summarizeText({ subject: 'Lunch at 1pm?', body: '' }), 'Lunch at 1pm?');
});
