import { createHash } from 'node:crypto';

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
