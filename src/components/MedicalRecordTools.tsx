import { makeAssistantToolUI } from '@assistant-ui/react';
import { ChevronRight } from 'lucide-react';
import type { RecordReceipt, MedicalProposal } from '../shared/medical-record';
const openRecord = () => window.dispatchEvent(new CustomEvent('baymax:open-medical-record'));
export const MedicalChangeTool = makeAssistantToolUI<unknown, RecordReceipt & { saved: boolean }>({
  toolName: 'change-medical-record',
  render: ({ result, status }) => result?.saved ? <div className="mr-tool-receipt"><strong>Medical record updated</strong><p>{result.entries.map(entry => `${entry.status === 'retracted' ? 'Retracted' : entry.version > 1 ? 'Corrected' : 'Added'}: ${entry.content.label}`).join(' · ')}</p><button onClick={openRecord}>View record and history <ChevronRight size={14} /></button></div> : <p className="fine" role="status">{status.type === 'running' ? 'Saving your medical update…' : 'This medical update was not saved.'}</p>,
});
export const MedicalProposalTool = makeAssistantToolUI<unknown, { requiresReview: boolean; proposal: MedicalProposal }>({
  toolName: 'propose-medical-document-changes',
  render: ({ result, status }) => result?.proposal ? <div className="mr-tool-receipt"><strong>{result.proposal.status === "pending" ? "Document changes ready to review" : result.proposal.status === "accepted" ? "Document changes already accepted" : "Document changes already rejected"}</strong><p>{result.proposal.status === "pending" ? `${result.proposal.changes.length} proposed changes. Review the source excerpts before adding them to your record.` : "This is the original proposal. No duplicate changes were added."}</p><button onClick={openRecord}>Open medical record <ChevronRight size={14} /></button></div> : <p className="fine" role="status">{status.type === 'running' ? 'Preparing document changes…' : 'No document changes were saved.'}</p>,
});
