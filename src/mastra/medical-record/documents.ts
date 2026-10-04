import { type Ctx, dbOf, userIdOf } from '../lib/demo-user';
import { getRecordText } from '../lib/records';
import { ingestMedicalDocument } from './store';

/** Promote a visible attachment to an immutable record source, without promoting its facts. */
export async function importChatDocument(id: string, conversationId: string | undefined, ctx: Ctx = {}) {
  if (conversationId) {
    const owned = await dbOf(ctx)('SELECT id FROM conversations WHERE user_id = $1 AND id = $2', [userIdOf(ctx), conversationId]);
    if (!owned.length) throw new Error('Conversation not found');
  }
  const record = await getRecordText(id, conversationId, ctx);
  if (!record) throw new Error('Document not found');
  return ingestMedicalDocument({ name: record.name, mimeType: record.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain', text: record.text, origin: { type: id.startsWith('library:') ? 'library' : 'upload', locator: id, recordId: id, ...(conversationId ? { conversationId } : {}) } }, ctx);
}
