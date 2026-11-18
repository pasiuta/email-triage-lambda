import { tokenize, splitSentences } from './text.js';

// Extractive summarizer (a classic frequency-based approach, like early TextRank baselines).
// A sentence scores higher when it uses the email's frequent words, words from the subject,
// and when it comes first. The top 1-2 sentences are returned in their original order.
const MAX_SENTENCES = 2;
const MAX_CHARS = 280;
const MIN_WORDS = 3;

const GREETING = /^(dear|hi|hello|hey|good (morning|afternoon|evening))\b[^,.!?]{0,40},\s*/i;

const stripGreeting = (s) => {
  const rest = s.replace(GREETING, '');
  return rest.charAt(0).toUpperCase() + rest.slice(1);
};

const clip = (s) => (s.length <= MAX_CHARS ? s : `${s.slice(0, MAX_CHARS - 1).trimEnd()}…`);

export const summarizeText = ({ subject, body }) => {
  const sentences = splitSentences(body).map(stripGreeting).filter((s) => tokenize(s).length >= MIN_WORDS);
  if (!sentences.length) return clip(body || subject);

  const freq = new Map();
  for (const w of tokenize(body)) freq.set(w, (freq.get(w) ?? 0) + 1);
  const subjectWords = new Set(tokenize(subject));

  const best = sentences
    .map((text, index) => {
      const words = tokenize(text);
      const weight = words.reduce((sum, w) => sum + (freq.get(w) ?? 0) + (subjectWords.has(w) ? 2 : 0), 0);
      return { text, index, score: weight / Math.sqrt(words.length) + (index === 0 ? 1 : 0) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SENTENCES)
    .sort((a, b) => a.index - b.index);

  const summary = best.map((s) => s.text).join(' ');
  return summary.length <= MAX_CHARS ? summary : clip(best.reduce((a, b) => (a.score >= b.score ? a : b)).text);
};
