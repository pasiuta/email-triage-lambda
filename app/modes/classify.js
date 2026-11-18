import { TOPICS, FALLBACK_TOPIC } from '../topics.js';

const matchers = TOPICS.map((topic) => [topic, new RegExp(`\\b${topic}\\b`, 'i')]);

export const classify = {
  name: 'classify',
  outputKey: 'topics',
  prompt: {
    system:
      `Classify the email into 1-3 of these topics: ${TOPICS.join(', ')}. ` +
      'Reply with topic names only, comma-separated, most relevant first.',
    maxTokens: 20,
  },
  parse: (raw) => {
    const found = matchers
      .map(([topic, re]) => [topic, raw.search(re)])
      .filter(([, pos]) => pos >= 0)
      .sort((a, b) => a[1] - b[1])
      .map(([topic]) => topic);
    return found.length ? found.slice(0, 3) : [FALLBACK_TOPIC];
  },
};
