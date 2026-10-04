import { createHash } from 'node:crypto';
import { dbOf, userIdOf, type Ctx } from '../lib/demo-user';
import { documentInputSchema, proposalInputSchema, recordChangesSchema, type MedicalDocument, type MedicalDocumentInput, type MedicalProposal, type MedicalRecord, type ProposalInput, type RecordChangesInput, type RecordReceipt } from '../../shared/medical-record';

// Stable parsed-input fingerprints make transport retries return the original artifact.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
function fingerprint(prefix: string, input: unknown): string {
  return `${prefix}-${createHash('sha256').update(canonical(input)).digest('hex')}`;
}
async function command<T>(action: string, payload: unknown, ctx?: Ctx): Promise<T> {
  const rows = await dbOf(ctx)('SELECT medical_record_command($1::uuid, $2::text, $3::jsonb) AS result', [userIdOf(ctx), action, JSON.stringify(payload)]);
  return rows[0].result as T;
}
function metadata(document: MedicalDocument & {text?: string}): MedicalDocument {
  const { text: _text, ...result } = document;
  return result;
}
export async function getMedicalRecord(ctx?: Ctx): Promise<MedicalRecord> {
  const record = await command<MedicalRecord>('get', {}, ctx);
  return { revision: record.revision, entries: record.entries.filter(entry => entry.status === 'current').sort((a, b) => a.id.localeCompare(b.id)), documents: record.documents.map(metadata), proposals: record.proposals, history: record.history, demo: record.demo };
}
export async function applyRecordChanges(input: RecordChangesInput, ctx?: Ctx): Promise<RecordReceipt> {
  return command('apply', recordChangesSchema.parse(input), ctx);
}
export async function ingestMedicalDocument(input: MedicalDocumentInput, ctx?: Ctx): Promise<MedicalDocument> {
  const parsed = documentInputSchema.parse(input);
  return metadata(await command<MedicalDocument & {text: string}>('ingest', { ...parsed, id: fingerprint('document', parsed), sha256: createHash('sha256').update(parsed.text).digest('hex'), createdAt: new Date().toISOString() }, ctx));
}
export async function readMedicalDocument(id: string, ctx?: Ctx): Promise<MedicalDocument & {text: string}> {
  return command('read-document', { id }, ctx);
}
export async function proposeDocumentChanges(input: ProposalInput, ctx?: Ctx): Promise<MedicalProposal> {
  const parsed = proposalInputSchema.parse(input);
  return command('propose', { ...parsed, id: fingerprint('proposal', parsed) }, ctx);
}
export async function reviewDocumentProposal(id: string, decision: 'accept' | 'reject', ctx?: Ctx): Promise<RecordReceipt | null> {
  if (decision !== 'accept' && decision !== 'reject') throw new Error('Invalid proposal decision');
  return command('review', { id, decision }, ctx);
}
