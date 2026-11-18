import { config } from './config.js';
import { logger } from './logger.js';
import { modes } from './modes/index.js';
import { createProvider } from './providers/index.js';
import { createCache } from './core/cache.js';
import { createProcessor } from './core/processor.js';

const provider = createProvider(config);
const processBatch = createProcessor({
  provider,
  cache: createCache(config.cacheSize),
  concurrency: config.concurrency,
  logger,
});

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
