export const summarize = {
  name: 'summarize',
  outputKey: 'summary',
  prompt: {
    system: 'Summarize the email in 1-2 sentences (max 40 words). Reply with the summary only.',
    maxTokens: 80,
  },
  parse: (raw) => raw.replace(/\s+/g, ' ').trim(),
};
