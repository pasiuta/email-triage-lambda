import { createHash } from 'node:crypto';

// Memoizes async results by key. It stores the promise, not the value, so duplicate
// emails in the same batch share one model call. The cache lives in module scope, so warm
// Lambda invocations reuse it. Size is bounded (FIFO eviction) and failures are never cached.
export const createCache = (maxSize = 1000) => {
  const store = new Map();

  return (key, compute) => {
    if (store.has(key)) return store.get(key);

    const promise = compute().catch((err) => {
      store.delete(key);
      throw err;
    });
    store.set(key, promise);
    if (store.size > maxSize) store.delete(store.keys().next().value);
    return promise;
  };
};

export const cacheKey = (...parts) => createHash('sha1').update(parts.join('\u0000')).digest('hex');
