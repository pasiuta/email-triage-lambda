import { classify } from './classify.js';
import { summarize } from './summarize.js';

// Mode registry. To add a mode, create one file like classify.js and list it here.
export const modes = new Map([classify, summarize].map((mode) => [mode.name, mode]));
