import { createLocalProvider } from './local.js';
import { createAnthropicProvider } from './anthropic.js';
import { createOpenAiProvider } from './openai.js';

const factories = {
  local: createLocalProvider,
  anthropic: createAnthropicProvider,
  openai: createOpenAiProvider,
};

export const createProvider = (config) => {
  const factory = factories[config.provider];
  if (!factory) {
    throw new Error(`Unknown MODEL_PROVIDER "${config.provider}". Use one of: ${Object.keys(factories).join(', ')}`);
  }
  return factory(config);
};
