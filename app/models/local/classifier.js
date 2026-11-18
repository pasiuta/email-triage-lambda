import { tokenize } from './text.js';
import { trainingData } from './training.js';
import { FALLBACK_TOPIC } from '../../topics.js';

// Small bag-of-words Naive Bayes model.
// Training: per-topic word likelihoods P(word | topic) with Laplace smoothing.
// Inference (multi-label): each known word "votes" with its posterior P(topic | word);
// a topic is returned when its average vote share reaches MIN_SHARE (max 3 topics).
const MIN_SHARE = 0.25;
const MAX_TOPICS = 3;

const train = (corpus) => {
  const vocabulary = new Set();
  const topics = Object.entries(corpus).map(([topic, docs]) => {
    const counts = new Map();
    const words = docs.flatMap(tokenize);
    for (const w of words) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
      vocabulary.add(w);
    }
    return { topic, counts, total: words.length };
  });

  const likelihood = (t, w) => ((t.counts.get(w) ?? 0) + 1) / (t.total + vocabulary.size);

  return {
    predict(text) {
      const words = tokenize(text).filter((w) => vocabulary.has(w));
      if (!words.length) return [FALLBACK_TOPIC];

      const shares = new Array(topics.length).fill(0);
      for (const w of words) {
        const l = topics.map((t) => likelihood(t, w));
        const sum = l.reduce((a, b) => a + b, 0);
        l.forEach((v, i) => (shares[i] += v / sum / words.length));
      }

      const ranked = topics
        .map((t, i) => ({ topic: t.topic, share: shares[i] }))
        .sort((a, b) => b.share - a.share);
      const picked = ranked.filter((r) => r.share >= MIN_SHARE).slice(0, MAX_TOPICS);
      return (picked.length ? picked : ranked.slice(0, 1)).map((r) => r.topic);
    },
  };
};

// Trained once per container (cold start) and reused by warm invocations.
export const classifier = train(trainingData);
