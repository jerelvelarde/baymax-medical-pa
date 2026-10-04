# Longitudinal Medical Record Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development for the store and UI modules, then independently review integrated behavior.

Goal: Establish a persistent user medical record, editable through chat, with reviewed document ingestion.
Architecture: Typed shared clinical entries; transactional Postgres persistence; trusted user context; Mastra read/change/propose tools; document review UI and history. Computer/files consume a standalone ingestion interface.
Tech stack: TypeScript, Zod, Postgres/PGlite, Mastra, React, Playwright.

- [x] Define validated shared entry/document/change/proposal schemas and terminology; test dates, missing data, bounded content and payload types.
- [x] Implement migration007 and MedicalRecordStore with atomic/versioned/idempotent writes, legacy bootstrap, immutable documents, quote-grounded proposals, acceptance/rejection and audit history; test persistence and cross-user isolation.
- [x] Implement canonical profile projections, trusted tool context, routes, agent tools/instructions, and document bridge contract without editing computer/files code.
- [x] Build record UI, document review, section/source/status browsing and history; integrate nav and chat receipts while preserving existing flows.
- [x] Verify full tests, builds, actual database/route/tool smoke and browser review; fix review findings, document setup/identity limits, and prepare changes for review.
