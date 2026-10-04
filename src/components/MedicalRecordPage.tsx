import { useCallback, useEffect, useState } from 'react';
import { FileText, History, MessageCircle, RefreshCw, ShieldCheck, Check, X, ChevronRight } from 'lucide-react';
import { recordKinds, recordSectionLabels, type MedicalEntry, type MedicalRecord, type MedicalProposal, type RecordKind } from '../shared/medical-record';
import './medical-record.css';

const sourceLabel = (entry: MedicalEntry, record: MedicalRecord) => entry.provenance.type === 'legacy_demo' ? 'Sample data' : entry.provenance.type === 'user_chat' ? 'You told Baymax' : entry.provenance.type === 'document' ? record.documents.find(document => document.id === entry.provenance.documentId)?.name ?? 'Document' : 'Imported record';
const fieldLabel = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase());
function EntryDetails({ entry }: { entry: MedicalEntry }) {
  return <dl className="mr-details">{Object.entries(entry.content.data).map(([key, value]) => <div key={key}><dt>{fieldLabel(key)}</dt><dd>{String(value)}</dd></div>)}</dl>;
}
function EntryCard({ entry, record }: { entry: MedicalEntry; record: MedicalRecord }) {
  const source = record.documents.find(document => document.id === entry.provenance.documentId);
  return <article className="mr-entry">
    <div className="mr-entry-heading"><h3>{entry.content.label}</h3><span className={`mr-status mr-status-${entry.content.clinicalStatus}`}>{entry.content.clinicalStatus}</span></div>
    <EntryDetails entry={entry} />
    {entry.content.notes && <p className="mr-note">{entry.content.notes}</p>}
    <div className="mr-entry-meta"><span><ShieldCheck size={13} />{sourceLabel(entry, record)}</span>{entry.content.effectiveDate && <time dateTime={entry.content.effectiveDate}>{entry.content.effectiveDate}</time>}<span>Version {entry.version}</span></div>
    {entry.provenance.quote && <details className="mr-source"><summary>Source excerpt{source ? ` · ${source.name}` : ''}</summary><blockquote>{entry.provenance.quote}</blockquote></details>}
  </article>;
}
function ProposalCard({ proposal, record, busy, onReview }: { proposal: MedicalProposal; record: MedicalRecord; busy: boolean; onReview: (id: string, decision: 'accept' | 'reject') => void }) {
  const document = record.documents.find(item => item.id === proposal.documentId);
  return <article className="mr-proposal">
    <div className="mr-entry-heading"><h3><FileText size={18} />{document?.name ?? 'Medical document'}</h3><span className="mr-status">Awaiting your review</span></div>
    <p className="mr-muted">Review these proposed changes against the source. They are not part of your record yet.</p>
    {proposal.changes.map(({ change, quote }, index) => <div className="mr-proposed-change" key={index}>
      <p><strong>{change.operation === 'add' ? 'Add' : change.operation === 'update' ? 'Correct' : 'Retract'}: {change.operation === 'retract' ? record.entries.find(entry => entry.id === change.id)?.content.label ?? change.id : change.entry.label}</strong></p>
      {change.operation !== 'retract' && <><span className="mr-muted">{recordSectionLabels[change.entry.kind]} · {change.entry.clinicalStatus}{change.entry.effectiveDate ? ` · ${change.entry.effectiveDate}` : ''}</span><dl className="mr-details">{Object.entries(change.entry.data).map(([key, value]) => <div key={key}><dt>{fieldLabel(key)}</dt><dd>{String(value)}</dd></div>)}</dl>{change.entry.notes && <p>{change.entry.notes}</p>}</>}
      {change.operation === 'retract' && <p>{change.reason}</p>}
      {change.operation === 'update' && <p className="mr-muted">Replaces version {change.expectedVersion} of {record.entries.find(entry => entry.id === change.id)?.content.label ?? change.id}.</p>}
      <blockquote>{quote}</blockquote>
    </div>)}
    <div className="mr-actions"><button className="primary" disabled={busy} onClick={() => onReview(proposal.id, 'accept')}><Check size={16} /> Accept changes</button><button className="outline" disabled={busy} onClick={() => onReview(proposal.id, 'reject')}><X size={16} /> Reject</button></div>
  </article>;
}
export function MedicalRecordPage({ onChat }: { onChat: () => void }) {
  const [record, setRecord] = useState<MedicalRecord>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<RecordKind | 'all'>('all');
  const [view, setView] = useState<'record' | 'review' | 'history'>('record');
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch('/medical-record', { cache: 'no-store' }); if (!response.ok) throw new Error('Your medical record could not be loaded.'); setRecord(await response.json()); setError(''); }
    catch { setError('Your medical record could not be loaded. Please try again.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const review = async (id: string, decision: 'accept' | 'reject') => {
    setBusy(true); setNotice('');
    try {
      const response = await fetch('/medical-record/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, decision }) });
      if (!response.ok) throw new Error(response.status === 409 ? 'Your record changed since this proposal was prepared. Ask Baymax to reconcile it with your current record.' : 'These changes could not be reviewed. Please try again.');
      setNotice(decision === 'accept' ? 'Changes saved to your medical record.' : 'Proposal rejected. Your medical record was not changed.');
      await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not review changes.'); }
    finally { setBusy(false); }
  };
  const pending = record?.proposals.filter(proposal => proposal.status === 'pending') ?? [];
  const populated = new Set(record?.entries.map(entry => entry.content.kind));
  return <section className="medical-record-page" aria-label="Medical record">
    <div className="mr-overview"><div><span className="mr-kicker">YOUR HEALTH, CONNECTED</span><h2>A record that grows with you.</h2><p>Tell Baymax about a new medication, a past visit, or a correction. Your saved information stays available across chats, independently of chat history and visit preferences.</p></div><button className="primary" onClick={onChat}><MessageCircle size={17} /> Update with Baymax <ChevronRight size={16} /></button></div>
    {record?.demo && <div className="mr-demo" role="note"><ShieldCheck size={17} /><p>This demo includes synthetic medical information, labeled “Sample data.” It does not establish your personal medical history.</p></div>}
    <div className="mr-toolbar"><div className="mr-tabs" role="group" aria-label="Record views"><button aria-pressed={view === 'record'} onClick={() => setView('record')}>Record</button><button aria-pressed={view === 'review'} onClick={() => setView('review')}>Review {pending.length > 0 && <span>{pending.length}</span>}</button><button aria-pressed={view === 'history'} onClick={() => setView('history')}><History size={15} /> Edit history</button></div><button className="mr-refresh" aria-label="Refresh medical record" disabled={loading || busy} onClick={() => void load()}><RefreshCw size={16} /></button></div>
    {error && <p className="notice" role="alert">{error}</p>}{notice && <p className="mr-success" role="status">{notice}</p>}
    {loading && !record && <p role="status" className="mr-empty">Opening your medical record…</p>}
    {record && view === 'record' && <div className="mr-layout"><aside className="mr-sections" aria-label="Medical sections"><button aria-pressed={section === 'all'} onClick={() => setSection('all')}>All sections <span>{populated.size}/15</span></button>{recordKinds.map(kind => <button key={kind} aria-pressed={section === kind} onClick={() => setSection(kind)}>{recordSectionLabels[kind]}<span>{record.entries.filter(entry => entry.content.kind === kind).length || '—'}</span></button>)}</aside><div className="mr-section-content">{recordKinds.filter(kind => section === 'all' || section === kind).map(kind => {
      const entries = record.entries.filter(entry => entry.content.kind === kind).sort((a, b) => (b.content.effectiveDate ?? b.updatedAt).localeCompare(a.content.effectiveDate ?? a.updatedAt));
      return <section key={kind} aria-label={recordSectionLabels[kind]} className="mr-section"><div className="mr-section-heading"><h2>{recordSectionLabels[kind]}</h2><span>{entries.length ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}` : 'Not provided'}</span></div>{entries.length ? entries.map(entry => <EntryCard key={entry.id} entry={entry} record={record} />) : <p className="mr-unknown">Nothing recorded yet. This means unknown, not confirmed absent.</p>}</section>;
    })}<section className="mr-section" aria-label="Source documents"><div className="mr-section-heading"><h2>Source documents</h2><span>{record.documents.length}</span></div>{record.documents.length ? record.documents.map(document => <div className="mr-document" key={document.id}><FileText size={19} /><div><strong>{document.name}</strong><p>{document.origin.type} · Imported {new Date(document.createdAt).toLocaleDateString()}{document.authoredOn ? ` · Document date ${document.authoredOn}` : ''}</p></div></div>) : <p className="mr-unknown">Attach a medical document in chat and ask Baymax to add it to your record. Extracted facts will appear for review.</p>}</section></div></div>}
    {record && view === 'review' && <div className="mr-review-list">{pending.length ? pending.map(proposal => <ProposalCard key={proposal.id} proposal={proposal} record={record} busy={busy || loading} onReview={(id, decision) => void review(id, decision)} />) : <div className="mr-empty"><ShieldCheck size={30} /><h3>All caught up.</h3><p>Proposed facts from your documents will appear here for review.</p></div>}</div>}
    {record && view === 'history' && <div className="mr-history">{record.history.length ? [...record.history].reverse().map(event => <article key={event.id}><span className="mr-history-dot" /><div><h3>{event.operation === 'add' ? 'Added' : event.operation === 'update' ? 'Corrected' : 'Retracted'} {event.after.content.label}</h3><p>{sourceLabel(event.after, record)} · Version {event.after.version} · <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time></p><details><summary>View change</summary>{event.reason && <p>Reason: {event.reason}</p>}{event.before && <div><strong>Before</strong><p>{event.before.content.label} · {event.before.content.clinicalStatus}</p><EntryDetails entry={event.before} />{event.before.content.notes && <p>{event.before.content.notes}</p>}</div>}<div><strong>{event.operation === 'retract' ? 'Retracted entry' : 'After'}</strong><p>{event.after.content.label} · {event.after.content.clinicalStatus}</p><EntryDetails entry={event.after} />{event.after.content.notes && <p>{event.after.content.notes}</p>}</div></details></div></article>) : <div className="mr-empty"><History size={30} /><h3>Your changes will appear here.</h3><p>Corrections and retractions keep their history.</p></div>}</div>}
    {record && <p className="mr-footer">Revision {record.revision} · Source-linked, reported information · Missing details remain unknown.</p>}
  </section>;
}
