import { SensitiveDataFilter } from '@mastra/observability';
const fields = new Set(['entries', 'entry', 'documents', 'proposals', 'proposal', 'history', 'changes', 'userstatement', 'quote', 'text', 'conditions', 'medications', 'allergies', 'notes', 'dateofbirth', 'name', 'medicalupdatemessageid', 'content', 'label', 'locator', 'age', 'dateofbirth', 'contact', 'brief']);
function redact(value: unknown, seen = new WeakMap<object, unknown>()): unknown {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (Array.isArray(value)) { const result: unknown[] = []; seen.set(value, result); for (const item of value) result.push(redact(item, seen)); return result; }
  const result: Record<string, unknown> = {}; seen.set(value, result);
  for (const [key, item] of Object.entries(value)) result[key] = fields.has(key.toLowerCase().replace(/[^a-z]/g, '')) ? '[REDACTED]' : redact(item, seen);
  return result;
}
/** Redact entire clinical objects/arrays, not only string leaves. Trace filtering never mutates tool receipts. */
export function medicalTraceFilter() {
  const standard = new SensitiveDataFilter();
  return { name: 'medical-record-trace-filter', shutdown: async () => {}, process(span?: Parameters<typeof standard.process>[0]) {
    if (!span) return span;
    for (const field of ['attributes', 'metadata', 'input', 'output', 'errorInfo', 'requestContext'] as const) {
      if (span[field] !== undefined) span[field] = redact(span[field]) as typeof span[typeof field];
    }
    return span;
  } };
}
