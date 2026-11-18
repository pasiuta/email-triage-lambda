// Shared logic for any chat-style LLM API (Template Method).
// A concrete provider supplies only `complete({ system, text, maxTokens }) -> string`.
export const createLlmProvider = ({ name, complete, maxInputChars }) => ({
  name,
  async run(mode, { subject, body }) {
    // Cost guard: send a trimmed plain-text email, never the raw payload.
    const text = `Subject: ${subject}\n\n${body}`.slice(0, maxInputChars);
    const raw = await complete({ system: mode.prompt.system, text, maxTokens: mode.prompt.maxTokens });
    return mode.parse(raw ?? '');
  },
});

export const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see .env.example)`);
  return value;
};
