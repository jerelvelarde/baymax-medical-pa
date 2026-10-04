import type { Ctx } from '../lib/demo-user';
import { getMedicalRecord } from './store';

/** Canonical projection: a retracted fact must never reappear from legacy tables. */
export async function medicalProfile(ctx: Ctx = {}, includeDemo = true) {
  const record = await getMedicalRecord(ctx);
  const entries = record.entries.filter(entry => entry.status === 'current' && (includeDemo || entry.provenance.type !== 'legacy_demo'));
  const demographics = entries.filter(entry => entry.content.kind === 'demographics').sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const data = Object.assign({}, ...demographics.map(entry => entry.content.kind === 'demographics' ? entry.content.data : {})) as { name?: string; dateOfBirth?: string };
  const reportedNotes = demographics.map(entry => entry.content.notes).filter(Boolean).join(' ');
  let age: number | undefined;
  if (data?.dateOfBirth) {
    const now = new Date(); const birth = new Date(`${data.dateOfBirth}T00:00:00Z`);
    age = now.getUTCFullYear() - birth.getUTCFullYear() - (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate()) ? 1 : 0);
    if (age < 0) age = undefined;
  }
  const labels = (kind: string) => entries.filter(entry => entry.content.kind === kind).map(entry => {
    const content = entry.content;
    const details = content.kind === 'medication' ? [content.data.dose, content.data.frequency].filter(Boolean).join(', ') : content.kind === 'allergy' ? content.data.reaction : undefined;
    return `${content.label}${details ? ` — ${details}` : ''}${content.clinicalStatus !== 'active' ? ` (${content.clinicalStatus})` : ''}`;
  });
  return { name: data?.name ?? 'Not provided', ...(age === undefined ? {} : { age }), conditions: labels('condition'), medications: labels('medication'), allergies: labels('allergy'), notes: `${reportedNotes ? `${reportedNotes} ` : ""}${includeDemo && record.demo ? 'Includes clearly labeled synthetic demo entries. ' : ''}Missing entries mean not provided, not confirmed absent. This record contains user-reported and document-supported information, not independently verified diagnoses.` };
}
