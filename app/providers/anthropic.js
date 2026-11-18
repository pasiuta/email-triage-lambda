import { createLlmProvider, requireEnv } from './llm.js';
import { postJson } from '../core/http.js';

// Anthropic Messages API. The default is the cheapest model tier; set MODEL_NAME to change it.
export const createAnthropicProvider = (config) => {
  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const model = config.model ?? 'claude-haiku-5-5';

  const complete = async ({ system, text, maxTokens }) => {
    const res = await postJson('https://api.anthropic.com/v1/messages', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: { model, system, max_tokens: maxTokens, temperature: 0, messages: [{ role: 'user', content: text }] },
      timeoutMs: config.timeoutMs,
      retries: config.retries,
    });
    return res.content?.[0]?.text;
  };

  return createLlmProvider({ name: `anthropic:${model}`, complete, maxInputChars: config.maxInputChars });
};
