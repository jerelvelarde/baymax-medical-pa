import { registerApiRoute } from '@mastra/core/server';
import { createMedicalRecordHandler } from '../medical-record/handler';
const handler = createMedicalRecordHandler();
export const medicalRecordRoutes = [
  registerApiRoute('/medical-record', { method: 'GET', handler: c => handler(c.req.raw) }),
  registerApiRoute('/medical-record/document', { method: 'GET', handler: c => handler(c.req.raw) }),
  ...['change', 'documents', 'import', 'proposals', 'review'].map(path => registerApiRoute(`/medical-record/${path}`, { method: 'POST', handler: c => handler(c.req.raw) })),
];
