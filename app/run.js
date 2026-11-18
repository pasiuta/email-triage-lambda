#!/usr/bin/env node
// Local Lambda simulator: reads a JSON file, calls the handler the way Lambda would, prints the result.
// Usage: node app/run.js --input sample/emails.json --mode classify --log-level INFO [--provider local]
// The input file can be an array of emails or a full Lambda event: { "mode": "...", "items": [...] }.
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    input: { type: 'string', short: 'i' },
    mode: { type: 'string', short: 'm' }, // falls back to event.mode, then DEFAULT_MODE
    'log-level': { type: 'string', default: 'INFO' },
    provider: { type: 'string', short: 'p' },
  },
});

if (!args.input) {
  console.error('Usage: node app/run.js --input <file.json> --mode <classify|summarize> [--log-level INFO] [--provider local|anthropic|openai]');
  process.exit(1);
}

try {
  process.loadEnvFile(); // loads .env (API keys) if it exists
} catch {
  /* no .env file: fine for the local provider */
}

// The handler reads its config when it is imported, so set the env first and then import it.
process.env.LOG_LEVEL = args['log-level'];
if (args.provider) process.env.MODEL_PROVIDER = args.provider;

try {
  const { handler } = await import('./handler.js');
  const input = JSON.parse(await readFile(args.input, 'utf8'));
  const event = Array.isArray(input) ? { items: input } : input;
  if (args.mode) event.mode = args.mode;

  const result = await handler(event);
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
