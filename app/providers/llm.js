export const createLlmProvider = ({ name, complete, maxInputChars }) => ({
  name,
  async run(mode, { subject, body }) {
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
