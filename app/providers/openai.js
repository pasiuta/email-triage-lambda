import { createLlmProvider, requireEnv } from './llm.js';
import { postJson } from '../core/http.js';

// OpenAI Chat Completions API. The default is a cheap non-reasoning model; set MODEL_NAME to change it.
export const createOpenAiProvider = (config) => {
  const apiKey = requireEnv('OPENAI_API_KEY');
  const model = config.model ?? 'gpt-4o-mini';

  const complete = async ({ system, text, maxTokens }) => {
    const res = await postJson('https://api.openai.com/v1/chat/completions', {
      headers: { authorization: `Bearer ${apiKey}` },
      body: {
        model,
        temperature: 0,
        max_completion_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text },
        ],
      },
      timeoutMs: config.timeoutMs,
      retries: config.retries,
    });
    return res.choices?.[0]?.message?.content;
  };

  return createLlmProvider({ name: `openai:${model}`, complete, maxInputChars: config.maxInputChars });
};
