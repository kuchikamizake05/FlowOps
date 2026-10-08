# FO-22 and FO-14 Implementation Plan

**Goal:** Define the full API contract and ship persistent exception assignment, handling, audit and notifications on branch 539398.

**Architecture:** PostgreSQL transactions lock individual exceptions for mutations. A dedicated workflow store/router supports role checks, paginated reads and durable notification inboxes. Rules evaluate and publish changes within the ingestion transaction.

**Tech stack:** TypeScript, Express 5, PostgreSQL, node:test, supertest.

**Spec:** fo22-fo14-design.md (approved by the user).

## Constraints

- Current single-store demo; keep authentication and ingestion response compatibility.
- Worker A owns docs/api.md; worker B owns workflow store/schema/tests; primary owns routes/auth/rules/ingestion integration.
- Tests must fail for missing behavior before business logic edits. Run npm audit before local checkpoint commits; primary coordinates commits.

## Task 1: Persistent workflow

- [ ] Add backend/test/workflow.test.ts testing concurrent claims, actor access, stale versions, resolve note, audit, pagination and inbox scope. Run `npx tsx --test test/workflow.test.ts` with isolated TEST_DATABASE_URL; verify missing-module RED.
- [ ] Extend backend/database/schema.sql with exception assignee/version/updated_at, audit before/after, notification table and dedupe keys.
- [ ] Create backend/src/workflow/postgres-workflow.ts exporting PostgresWorkflow with list/detail/claim/assign/transition/actions/notifications/readNotification/canAccessOrder methods. Every mutation accepts PublicUser and uses database transaction/row locking; expectedVersion guards stale writes.
- [ ] Rerun workflow tests and npm run typecheck; verify GREEN, audit dependencies and checkpoint.

## Task 2: HTTP and identity integration

- [ ] Add backend/test/workflow-api.test.ts verifying real HTTP owner/operator requests; claim route initially 404 must become 200, competing claim 409, foreign operator 403, unauthenticated 401, malformed body 400.
- [ ] Create workflow router and inject optional PostgresWorkflow into createApp. Register authenticated queue/detail/claim/assignee/status/actions/inbox routes. Validate IDs, query filters, versions and note sizes with zod; preserve error wrapper.
- [ ] Add optional PostgreSQL user lookup to existing UserRepository compatibility and configure server database user repository; expose operator directory for owner assignment. Extend order detail read permissions for assigned exceptions and include timeline fields.
- [ ] Rerun API and old authentication tests, typecheck and build.

## Task 3: Rules ingestion and notifications

- [ ] Write failing tests for valid FO11 complaint/return/cancellation payloads generating exceptions, replay producing no extra notifications, priority escalation producing one new notification, and assignment audit not suppressing EX05.
- [ ] Extract transaction-aware rule sync accepting pg PoolClient; keep existing public syncOrderExceptions adapter. Lock order consistently with ingestion and persist active exception uniqueness, notifications and structured audit only on actual changes.
- [ ] Invoke rule sync after accepted events from PostgresIngestion before COMMIT; map statuses/events accepted by FO11 to rule inputs. Preserve stale-event handling.
- [ ] Rerun ingestion/rules/workflow integration tests; inspect actual SQL counts and rollback behavior.

## Task 4: Contract in parallel

- [ ] Rewrite docs/api.md with endpoint availability, auth, roles, status/time/error conventions, current/planned response examples, paginated queue, assignment/status/version mutations, audit, notification, CSV and AI correction plans.
- [ ] Reconcile examples against implemented types and HTTP tests; document single-store and EX04 shipping-input limits and frontend adapter follow-up.

## Task 5: Final verification

- [ ] Run all backend tests with real isolated PostgreSQL, typecheck/build and scoped coverage (80%+ for workflow logic).
- [ ] Run frontend typecheck/build where available to catch compatibility regressions; inspect diff and run npm audit.
- [ ] Update implementation status and README; create local commits on 539398 and report evidence plus any pending frontend integration. External push/merge/issue edits require task-specific user authorization.
