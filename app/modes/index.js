import { classify } from './classify.js';
import { summarize } from './summarize.js';

export const modes = new Map([classify, summarize].map((mode) => [mode.name, mode]));
