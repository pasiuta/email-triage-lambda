// POST JSON with a timeout and retries. Only transient failures are retried
// (429, 5xx, network errors, timeouts). A 4xx such as a bad key fails at once,
// so we never pay for useless retries.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isTransient = (status) => status === 429 || status >= 500;

export async function postJson(url, { headers, body, timeoutMs, retries }) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return await res.json();

      const err = new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      err.transient = isTransient(res.status);
      throw err;
    } catch (err) {
      const transient = err.transient ?? true; // network error / timeout
      if (!transient || attempt >= retries) throw err;
      await sleep(2 ** attempt * 250 + Math.random() * 100); // exponential backoff + jitter
    }
  }
}
