# FO-14 / FO-22 verification

Date: 8 October 2026. Branch: `539398`. Base: `08575da`.

## Results

- 49 backend tests passed, 0 failed, 0 skipped, using isolated PostgreSQL.
- Backend typecheck and build passed.
- npm audit: 0 vulnerabilities after proxy-addr lockfile update.
- Node V8 coverage scoped to workflow, PostgreSQL authentication, ingestion and rules: 99.43% lines, 95.94% branches, 100% functions.
- Workflow store: 100% lines, 99.15% branches. Workflow router: 100% lines, 96.67% branches.

## Verified behavior

- Two simultaneous claims produce one winner and one HTTP 409, with one assignment audit.
- Owner assignment, explicit handling/completion transitions, mandatory resolution note, version conflicts, operator access and rollback.
- Queue filters/pagination and authorized order event/action timelines.
- Recipient-only inbox, idempotent read acknowledgment and notification deduplication.
- PostgreSQL authentication resolves the database identity used by audit foreign keys.
- Ingestion replay and concurrent rule synchronization do not duplicate active findings or notification deliveries.
- Late complaint/return events trigger rules using current snapshot and stored history without overwriting the current order status.
- New triggers update active finding watermarks; resolution does not cause the same complaint to reopen.
- A new cancellation request after an older decision requires another response.

## Limits and follow-up

This is a single-store demo, with in-memory sessions. EX-04 shipping-label inputs are not yet carried by persistent ingestion. Rule checks run on accepted events or explicit sync; there is no periodic deadline scheduler. Notifications are a persistent API inbox, not push delivery. Frontend API adoption remains FO-13/FO-21 work; the contract marks AI routes as planned.

Frontend clean-install verification was attempted, but the existing frontend lockfile is inconsistent (`@emnapi/wasi-threads` / `@emnapi/core`), so npm ci failed before frontend typecheck/build. No frontend files were modified by this task. Repair the frontend lockfile as part of frontend/CI follow-up.

## Reproduce

Set TEST_DATABASE_URL to an isolated PostgreSQL test database and DATABASE_URL to the same value. From the repository root, run `npm test`, `npm run typecheck`, `npm run build`, and `npm audit`. The workflow/rules integration suites use randomly named schemas and clean them afterward. Existing database tests seed the selected test database, so never use a production URL.

For scoped coverage, use Node 24 with `node --import tsx --test --test-concurrency=1 --experimental-test-coverage --test-coverage-include='backend/src/workflow/**' --test-coverage-include='backend/src/auth/postgres-user-repository.ts' --test-coverage-include='backend/src/rules/rules-engine.ts' --test-coverage-include='backend/src/ingestion/postgres-ingestion.ts' backend/test/*.test.ts`.
