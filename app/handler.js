import { config } from './config.js';
import { logger } from './logger.js';
import { modes } from './modes/index.js';
import { createProvider } from './providers/index.js';
import { createCache } from './core/cache.js';
import { createProcessor } from './core/processor.js';

// Built once per Lambda container (cold start), then reused by every warm invocation:
// the model, HTTP keep-alive and the result cache all survive between calls.
const provider = createProvider(config);
const processBatch = createProcessor({
  provider,
  cache: createCache(config.cacheSize),
  concurrency: config.concurrency,
  logger,
});

/**
 * Lambda entry point.
 * Event: { mode?: "classify" | "summarize", items: Email[] }, or a bare Email[] array
 *        (the mode then comes from DEFAULT_MODE).
 * Returns one result per input item, in the same order.
 */
export const handler = async (event) => {
  const { mode: modeName = config.defaultMode, items } = Array.isArray(event) ? { items: event } : (event ?? {});

  const mode = modes.get(modeName);
  if (!mode) throw new Error(`Unknown mode "${modeName}". Use one of: ${[...modes.keys()].join(', ')}`);
  if (!Array.isArray(items)) throw new TypeError('"items" must be an array of emails');

  const started = performance.now();
  const results = await processBatch(items, mode);

  logger.info('Batch processed', {
    mode: mode.name,
    provider: provider.name,
    total: results.length,
    failed: results.filter((r) => r.error).length,
    durationMs: Math.round(performance.now() - started),
  });
  return results;
};
