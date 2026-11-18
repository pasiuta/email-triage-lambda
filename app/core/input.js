// Validates one raw item and turns it into a clean document. Never throws:
// it returns { error } instead, so one bad item cannot break the batch.
export const toDocument = (item) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return { error: 'invalid_input' };

  const { subject = '', body = '' } = item;
  if (typeof subject !== 'string' || typeof body !== 'string') return { error: 'invalid_input' };

  const doc = { subject: subject.trim(), body: body.trim() };
  return doc.subject || doc.body ? doc : { error: 'empty_input' };
};
