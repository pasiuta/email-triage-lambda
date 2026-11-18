const STOP_WORDS = new Set(
  ('the and for with that this from are was were been have has had will would can could ' +
    'you your our ours we they them their its his her she him not but all any about into ' +
    'please hi hello dear regards thanks thank best kind also just let know there here ' +
    'what when which who how out more some than then very per via').split(' '),
);

export const tokenize = (text) =>
  (text.toLowerCase().match(/[a-z]{3,}/g) ?? [])
    .filter((w) => !STOP_WORDS.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));

// Splits on sentence punctuation or line breaks.
export const splitSentences = (text) =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
