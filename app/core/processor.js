import { toDocument } from './input.js';
import { mapLimit } from './pool.js';
import { cacheKey } from './cache.js';

export const createProcessor = ({ provider, cache, concurrency, logger }) =>
  (items, mode) =>
    mapLimit(items, concurrency, async (item) => {
      const id = item?.id ?? null;
      const doc = toDocument(item);

      if (doc.error) {
        logger.warn('Skipping invalid item', { id, error: doc.error });
        return { id, error: doc.error };
      }

      try {
        const key = cacheKey(provider.name, mode.name, doc.subject, doc.body);
        const value = await cache(key, () => provider.run(mode, doc));
        logger.debug('Item processed', { id, mode: mode.name });
        return { id, [mode.outputKey]: value };
      } catch (err) {
        logger.error('Item processing failed', { id, mode: mode.name, error: err.message });
        return { id, error: 'processing_failed' };
      }
    });
