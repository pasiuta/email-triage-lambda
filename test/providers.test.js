import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAnthropicProvider } from '../app/providers/anthropic.js';
import { createOpenAiProvider } from '../app/providers/openai.js';
import { createProvider } from '../app/providers/index.js';
import { classify } from '../app/modes/classify.js';

// LLM providers are tested with a mocked fetch: no network, no keys, no cost.
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const config = { maxInputChars: 50, timeoutMs: 1000, retries: 2 };
const doc = { subject: 'Invoice', body: 'x'.repeat(500) };
const reply = (status, json) => new Response(JSON.stringify(json), { status });

test('anthropic provider sends a trimmed, capped request and parses the reply', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = JSON.parse(init.body);
    return reply(200, { content: [{ type: 'text', text: 'finance' }] });
  };

  const result = await createAnthropicProvider(config).run(classify, doc);
  assert.deepEqual(result, ['finance']);
  assert.equal(sent.messages[0].content.length, 50); // input trimmed to MAX_INPUT_CHARS
  assert.equal(sent.max_tokens, classify.prompt.maxTokens);
  assert.equal(sent.temperature, 0);
});

test('openai provider retries transient errors (429) and then succeeds', async () => {
  process.env.OPENAI_API_KEY = 'test-key';
  let calls = 0;
  globalThis.fetch = async () =>
    ++calls < 3 ? reply(429, { error: 'rate limited' }) : reply(200, { choices: [{ message: { content: 'hr, marketing' } }] });

  assert.deepEqual(await createOpenAiProvider(config).run(classify, doc), ['hr', 'marketing']);
  assert.equal(calls, 3);
});

test('non-transient errors (401) are not retried', async () => {
  process.env.OPENAI_API_KEY = 'bad-key';
  let calls = 0;
  globalThis.fetch = async () => (calls++, reply(401, { error: 'unauthorized' }));

  await assert.rejects(createOpenAiProvider(config).run(classify, doc), /HTTP 401/);
  assert.equal(calls, 1);
});

test('factory rejects unknown providers and missing API keys', () => {
  assert.throws(() => createProvider({ provider: 'nope' }), /Unknown MODEL_PROVIDER/);
  delete process.env.ANTHROPIC_API_KEY;
  assert.throws(() => createProvider({ provider: 'anthropic' }), /ANTHROPIC_API_KEY is not set/);
});
