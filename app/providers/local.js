import { classifier } from '../models/local/classifier.js';
import { summarizeText } from '../models/local/summarizer.js';

// Offline provider: a bundled model that is deterministic, needs no keys and costs nothing.
const tasks = {
  classify: (doc) => classifier.predict(`${doc.subject} ${doc.body}`),
  summarize: (doc) => summarizeText(doc),
};

export const createLocalProvider = () => ({
  name: 'local',
  async run(mode, doc) {
    const task = tasks[mode.name];
    if (!task) throw new Error(`Local provider does not support mode "${mode.name}"`);
    return task(doc);
  },
});
