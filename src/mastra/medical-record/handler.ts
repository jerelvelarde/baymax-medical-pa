import { z } from 'zod';
import { documentInputSchema, recordChangesSchema, proposalInputSchema } from '../../shared/medical-record';
import { type Ctx } from '../lib/demo-user';
import { allowsBrowserWrite } from '../persistence/session';
import { getMedicalRecord, applyRecordChanges, ingestMedicalDocument, readMedicalDocument, proposeDocumentChanges, reviewDocumentProposal } from './store';
import { importChatDocument } from './documents';

const reviewSchema = z.object({ id: z.string().min(1).max(200), decision: z.enum(['accept', 'reject']) }).strict();
const importSchema = z.object({ id: z.string().min(1).max(200), conversationId: z.string().min(1).max(100).optional() }).strict();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
/** Injectable trusted context for tests and a future authenticated server. */
export function createMedicalRecordHandler(ctx: Ctx = {}) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/medical-record') return json(await getMedicalRecord(ctx));
      if (request.method === 'GET' && url.pathname === '/medical-record/document') {
        const doc = await readMedicalDocument(url.searchParams.get('id') ?? '', ctx);
        const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
        return json({ ...doc, text: doc.text.slice(offset, offset + 20000), offset, totalChars: doc.text.length, truncated: offset + 20000 < doc.text.length });
      }
      if (request.method !== 'POST') return json({ error: 'Not found' }, 404);
      if (!allowsBrowserWrite(request)) return json({ error: 'This request must come from the app.' }, 403);
      const contentLength = Number(request.headers.get('content-length') ?? 0);
      if (contentLength > 8 * 1024 * 1024) return json({ error: 'Request too large' }, 413);
      const text = await request.text();
      if (Buffer.byteLength(text) > 8 * 1024 * 1024) return json({ error: 'Request too large' }, 413);
      const body: unknown = JSON.parse(text);
      switch (url.pathname) {
        case '/medical-record/change': return json(await applyRecordChanges(recordChangesSchema.parse(body), ctx));
        case '/medical-record/documents': return json(await ingestMedicalDocument(documentInputSchema.parse(body), ctx));
        case '/medical-record/import': { const parsed = importSchema.parse(body); return json(await importChatDocument(parsed.id, parsed.conversationId, ctx)); }
        case '/medical-record/proposals': return json(await proposeDocumentChanges(proposalInputSchema.parse(body), ctx));
        case '/medical-record/review': { const parsed = reviewSchema.parse(body); return json({ receipt: await reviewDocumentProposal(parsed.id, parsed.decision, ctx) }); }
        default: return json({ error: 'Not found' }, 404);
      }
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: 'Invalid medical record request' }, 400);
      const message = error instanceof Error ? error.message : '';
      if (/not found/i.test(message)) return json({ error: 'Record or document not found' }, 404);
      if (/conflict|version|already|operation|reviewed|rejected/i.test(message)) return json({ error: 'The record changed. Refresh and review the current entries before trying again.' }, 409);
      if (/quote|source|document|payload|invalid/i.test(message)) return json({ error: 'The change could not be validated against its source.' }, 422);
      console.warn('Medical record request failed');
      return json({ error: 'Your medical record is unavailable. Please try again.' }, 503);
    }
  };
}
