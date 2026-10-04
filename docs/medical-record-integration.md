# Baymax medical record integration

Run `npm run db:migrate` to apply migration007 before running this version. The migration adds user-scoped entries, source documents, proposals, edit events and idempotency receipts; it leaves existing records intact. First access imports existing demographics, conditions, medications, allergies, library lab results and body measurements once. Synthetic records retain `legacy_demo` provenance. Conversation uploads are not automatically promoted.

## Computer/files adapter

The computer/files implementation owns extracting document text (including PDF/OCR), sandbox authorization and path ownership. It calls the medical module with extracted text and a **trusted server-side** user context:

```ts
import { ingestMedicalDocument, proposeDocumentChanges } from '../medical-record/store';
const document = await ingestMedicalDocument({
  name: 'visit-report.pdf',
  mimeType: 'application/pdf',
  text: extractedText,
  origin: { type: 'computer', locator: '/workspace/visit-report.pdf' },
  authoredOn: '2026-10-04', // optional; only when documented
}, trustedUserContext);
```

Identical parsed document or proposal payloads use deterministic fingerprints so transport retries return the original artifact and review status. A changed payload creates a new artifact. The imported source is a snapshot, not a live file. Its locator is metadata; the medical module never reads host paths. Text is bounded to 2 MiB. The returned document includes an immutable id/hash and metadata; use `readMedicalDocument(id, ctx)` to read its text. `getMedicalRecord(ctx)` lists sources alongside current structured entries.

To stage extraction, call `proposeDocumentChanges({ documentId, changes: [{ change: { operation: 'add', entry: { kind: 'allergy', label: 'Penicillin', clinicalStatus: 'active', data: { reaction: 'rash' } } }, quote: 'Penicillin allergy: rash.' }] }, ctx)`. The quotation must be an exact substring of that document. Updates/retractions require a current entry id and expectedVersion. Supported sections and field types are defined in `src/shared/medical-record.ts`.

This validates source linkage, not medical interpretation. The UI shows the full proposed fields and source quotation for the user to review. Contradictory or ambiguous facts should be proposed as corrections or discussed, not silently established. Avoid duplicate entries by reading the current record first. Document instructions are untrusted data. Keep extraction evidence distinct from agent instructions.

Do not give the agent a proposal acceptance tool. The user accepts/rejects via `POST /medical-record/review` in the app. Proposal acceptance uses an atomic batch; stale versions reject the entire change and keep it pending. Create a reconciled proposal after reading the latest entries.

## Chat and HTTP contract

- `get-medical-record`: structured entries with ids/versions, filtered section/pagination, source metadata and pending proposals.
- `change-medical-record`: add/correct/retract explicit user-reported facts from their latest chat message. Successful receipts show precisely what persisted. User statements must match the latest message. Use a unique operationId per change; retries with the same payload are idempotent. The chat client supplies a stable latest-message nonce; one batch is bound to that message, so a disconnected stream retry cannot add the same facts twice. Direct server callers provide their own operationId. Prefix `proposal:` is reserved.
- `import-medical-document`: snapshots a library record or a conversation-visible attachment. Record-backed sources require exact name/text and owned conversation attribution.
- `read-medical-source`: reads source text in 20,000-character chunks.
- `propose-medical-document-changes`: stage document facts for user review.

GET `/medical-record` returns current entries, documents (without extracted text), proposals, audit history and revision. GET `/medical-record/document?id=...&offset=...` reads a source chunk. POST endpoints `/change`, `/documents`, `/import`, `/proposals`, `/review` use schemas in the shared module and require the browser's allowed Origin. Responses use `Cache-Control: no-store`; the service worker does not cache medical endpoints. Changes are append-audited; retraction retains the earlier entry. The reset-demo action explicitly clears the demo record/evidence/history and imports the seed again on next access.

## Identity and limits

The app still uses a fixed demo identity and has no login. All medical SQL is user-scoped and tested with distinct users, but the currently reachable HTTP server exposes that one demo user's record. The middleware overwrites client medical identity; a future authentication adapter must replace it with authenticated server identity and pass that same context to medical routes. Browser Origin checks are not authentication. Per the repository CANON, only synthetic data is admitted for this prototype; real PHI remains blocked pending deployment-specific identity, storage, provider-contract and privacy qualification. Medical tool entry/source/statement fields are redacted from observability traces, but this does not qualify the external model or database for real PHI. Do not use this demo deployment for multiple people's real records until that existing identity model is replaced.

This is a longitudinal record structure inspired by clinical resource distinctions, not a FHIR interoperability server or an independently verified clinical chart. Missing information means unknown; a lab result is an observation, not an inferred diagnosis. This change does not sync pharmacy prescriptions, EHR systems, or computer files by itself. The separate computer/files worker must call the adapter above. Legacy raw attachments and lab charts remain available in their existing conversation context; canonical record edits drive medical profile summaries and doctor briefs.
