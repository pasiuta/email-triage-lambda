import { createLocalProvider } from './local.js';
import { createAnthropicProvider } from './anthropic.js';

// Provider factory (Strategy pattern). Every provider has the same interface:
//   { name: string, run(mode, { subject, body }): Promise<result> }
// To add a backend, write one file and add one line here.
const factories = {
  local: createLocalProvider,
  anthropic: createAnthropicProvider,
};

export const createProvider = (config) => {
  const factory = factories[config.provider];
  if (!factory) {
    throw new Error(`Unknown MODEL_PROVIDER "${config.provider}". Use one of: ${Object.keys(factories).join(', ')}`);
  }
  return factory(config);
};
