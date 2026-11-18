const env = process.env;
const int = (value, fallback) => Number.parseInt(value ?? '', 10) || fallback;

export const config = Object.freeze({
  provider: env.MODEL_PROVIDER ?? 'local', // local | anthropic | openai
  model: env.MODEL_NAME, // optional override of the provider's default model
  defaultMode: env.DEFAULT_MODE ?? 'classify', // used when the event does not specify a mode
  concurrency: int(env.CONCURRENCY, 5), // parallel model calls per invocation
  maxInputChars: int(env.MAX_INPUT_CHARS, 2000), // cost guard: long emails are trimmed before an LLM call
  timeoutMs: int(env.REQUEST_TIMEOUT_MS, 10_000),
  retries: int(env.MAX_RETRIES, 2),
  cacheSize: int(env.CACHE_SIZE, 1000),
});
