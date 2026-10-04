# Baymax medical record

A longitudinal record of what a person reports and what their medical documents contain. Unknown information stays unknown.

## Language

**Medical record**: The person's structured clinical entries and their sources across conversations.
_Avoid_: Chat history, profile blob

**Clinical entry**: One dated medical fact, event, or note, with a category, source, and revision history.
_Avoid_: Diagnosis (for measurements or unconfirmed findings)

**Source document**: An immutable snapshot of extracted document text used to support clinical entries.
_Avoid_: Computer file (the original file can change)

**Proposed change**: A source-supported addition or correction awaiting the person's review.
_Avoid_: Established fact, verified diagnosis

**Retraction**: Removal of an entry from the current record while retaining its edit history.
_Avoid_: Deletion

**Reported medication**: A medicine the person or a document says they take, including any reported dose.
_Avoid_: Prescription (unless explicitly documented as such)
