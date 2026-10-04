import { z } from 'zod';

export const recordKinds = ['demographics', 'condition', 'medication', 'allergy', 'observation', 'encounter', 'procedure', 'immunization', 'family-history', 'social-history', 'care-team', 'care-plan', 'clinical-note', 'insurance', 'advance-directive'] as const;
export const recordKindSchema = z.enum(recordKinds);
const short = z.string().trim().min(1).max(1000);
const note = z.string().trim().max(20000);
export const clinicalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Use a valid calendar date');
const base = { label: short, clinicalStatus: z.enum(['active', 'historical', 'resolved', 'unknown']), effectiveDate: clinicalDateSchema.optional(), notes: note.optional() };
const variant = <K extends typeof recordKinds[number], S extends z.ZodRawShape>(kind: K, shape: S) => z.object({ ...base, kind: z.literal(kind), data: z.object(shape).strict() }).strict();
export const entryContentSchema = z.discriminatedUnion('kind', [
  variant('demographics', { name: short.optional(), dateOfBirth: clinicalDateSchema.optional(), sex: short.optional(), gender: short.optional(), pronouns: short.optional(), contact: short.optional(), emergencyContact: short.optional() }),
  variant('condition', { code: short.optional(), onsetDate: clinicalDateSchema.optional(), resolvedDate: clinicalDateSchema.optional(), verification: z.enum(['reported', 'documented', 'unknown']).optional() }),
  variant('medication', { dose: short.optional(), route: short.optional(), frequency: short.optional(), indication: short.optional(), prescriber: short.optional(), startDate: clinicalDateSchema.optional(), endDate: clinicalDateSchema.optional() }),
  variant('allergy', { substance: short.optional(), reaction: short.optional(), severity: z.enum(['mild', 'moderate', 'severe', 'unknown']).optional(), category: z.enum(['drug', 'food', 'environment', 'other', 'unknown']).optional() }),
  variant('observation', { value: z.union([z.number().finite(), short]), unit: short.optional(), referenceLow: z.number().finite().optional(), referenceHigh: z.number().finite().optional(), flag: short.optional(), panel: short.optional() }),
  variant('encounter', { clinician: short.optional(), location: short.optional(), reason: short.optional(), outcome: note.optional() }),
  variant('procedure', { code: short.optional(), clinician: short.optional(), location: short.optional(), outcome: note.optional() }),
  variant('immunization', { vaccine: short.optional(), dose: short.optional(), lot: short.optional(), administeredBy: short.optional(), nextDue: clinicalDateSchema.optional() }),
  variant('family-history', { relation: short, condition: short, onsetAge: z.number().int().min(0).max(150).optional() }),
  variant('social-history', { topic: short, value: short }),
  variant('care-team', { name: short, role: short.optional(), organization: short.optional(), contact: short.optional() }),
  variant('care-plan', { goal: short.optional(), instructions: note.optional(), clinician: short.optional(), followUpDate: clinicalDateSchema.optional() }),
  variant('clinical-note', { text: note.min(1), author: short.optional(), noteType: short.optional() }),
  variant('insurance', { provider: short.optional(), plan: short.optional(), memberId: short.optional(), groupNumber: short.optional() }),
  variant('advance-directive', { directive: note.min(1), representative: short.optional(), location: short.optional() }),
]);
export type EntryContent = z.infer<typeof entryContentSchema>;
export type RecordKind = typeof recordKinds[number];
export const provenanceSchema = z.object({ type: z.enum(['user_chat', 'document', 'legacy_demo', 'legacy_import']), conversationId: short.optional(), messageId: short.optional(), userStatement: note.optional(), documentId: short.optional(), quote: note.optional() }).strict();
export type Provenance = z.infer<typeof provenanceSchema>;
export const recordChangeSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('add'), entry: entryContentSchema }).strict(),
  z.object({ operation: z.literal('update'), id: short, expectedVersion: z.number().int().positive(), entry: entryContentSchema }).strict(),
  z.object({ operation: z.literal('retract'), id: short, expectedVersion: z.number().int().positive(), reason: short }).strict(),
]);
export type RecordChange = z.infer<typeof recordChangeSchema>;
export const recordChangesSchema = z.object({ operationId: z.string().min(1).max(200).refine(id => !id.startsWith("proposal:"), "Reserved operation id"), changes: z.array(recordChangeSchema).min(1).max(50), userStatement: note.min(1), conversationId: short.optional() }).strict();
export type RecordChangesInput = z.infer<typeof recordChangesSchema>;
export const documentInputSchema = z.object({ name: short, mimeType: short, text: z.string().min(1).max(2 * 1024 * 1024), origin: z.object({ type: z.enum(['computer', 'upload', 'library']), locator: short, conversationId: short.optional(), recordId: short.optional() }).strict(), authoredOn: clinicalDateSchema.optional() }).strict();
export type MedicalDocumentInput = z.infer<typeof documentInputSchema>;
export const proposalInputSchema = z.object({ documentId: short, changes: z.array(z.object({ change: recordChangeSchema, quote: z.string().min(1).max(20000) }).strict()).min(1).max(50) }).strict();
export type ProposalInput = z.infer<typeof proposalInputSchema>;
export interface MedicalEntry { id: string; version: number; status: 'current' | 'retracted'; content: EntryContent; provenance: Provenance; createdAt: string; updatedAt: string }
export interface MedicalDocument { id: string; name: string; mimeType: string; origin: MedicalDocumentInput['origin']; authoredOn?: string; sha256: string; createdAt: string }
export interface MedicalProposal { id: string; documentId: string; status: 'pending' | 'accepted' | 'rejected'; changes: ProposalInput['changes']; createdAt: string; reviewedAt?: string }
export interface MedicalEvent { id: string; operationId: string; entryId: string; operation: 'add' | 'update' | 'retract'; reason?: string; before: MedicalEntry | null; after: MedicalEntry; createdAt: string }
export interface RecordReceipt { operationId: string; revision: number; entries: MedicalEntry[] }
export interface MedicalRecord { revision: number; entries: MedicalEntry[]; documents: MedicalDocument[]; proposals: MedicalProposal[]; history: MedicalEvent[]; demo: boolean }
export const recordSectionLabels: Record<RecordKind, string> = { demographics: 'About you', condition: 'Conditions', medication: 'Medications', allergy: 'Allergies', observation: 'Measurements & labs', encounter: 'Visits', procedure: 'Procedures', immunization: 'Immunizations', 'family-history': 'Family history', 'social-history': 'Social history', 'care-team': 'Care team', 'care-plan': 'Care plans', 'clinical-note': 'Clinical notes', insurance: 'Insurance', 'advance-directive': 'Advance directives' };

export const medicalEntrySchema = z.object({ id: short, version: z.number().int().positive(), status: z.enum(['current', 'retracted']), content: entryContentSchema, provenance: provenanceSchema, createdAt: z.string(), updatedAt: z.string() });
export const recordReceiptSchema = z.object({ operationId: short, revision: z.number().int().nonnegative(), entries: z.array(medicalEntrySchema) });
export const medicalProposalSchema = proposalInputSchema.extend({ id: short, status: z.enum(['pending', 'accepted', 'rejected']), createdAt: z.string(), reviewedAt: z.string().optional() });
