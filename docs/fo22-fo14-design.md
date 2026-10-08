# FO-22 and FO-14 implementation design

## Scope

Use branch `539398`, based on current main. FO-22 defines the complete frontend/backend contract; FO-14 implements persistent exception handling. Preserve existing authentication and ingestion response shapes. Document implemented versus planned endpoints explicitly. No frontend implementation or AI service is included.

## Storage and access

Keep the current single-store demo and document that multi-store isolation is not implemented. Owner can review all exceptions, assign/reassign operators, and read audit records. Operators can claim an unassigned exception and modify only their assigned exceptions. Use PostgreSQL user identities when database-backed handling is enabled so session actor IDs satisfy database foreign keys.

Exception assignee is the workflow authority. Order-detail access must include assignments to exceptions on that order, while retaining existing order assignment compatibility. Do not let claiming an exception silently overwrite another order assignment. Frontend currently supports GET/POST JSON only: document PATCH/raw CSV client changes needed for later frontend integration.

Add exception assignee/version/update timestamps, structured before/after audit data, and durable in-app notifications through repeatable migrations. Use row locks and transaction boundaries so only one concurrent claim succeeds. Conflicts return HTTP 409. Status values remain `open`, `in_progress`, `resolved` (Baru, Ditangani, Selesai). Claim transitions open to in_progress. Resolve requires a nonblank bounded note; resolved exceptions cannot be reassigned or silently reopened.

## HTTP contract

- GET /api/exceptions: authorized queue with priority/status/assignee/deadline filters, deterministic priority/deadline/created/id ordering and bounded pagination.
- GET /api/exceptions/:id: detail and assignment/version metadata.
- POST /api/exceptions/:id/claim: operator claims unassigned exception atomically.
- PATCH /api/exceptions/:id/assignee: owner assigns/reassigns an operator.
- PATCH /api/exceptions/:id/status: authorized transition with note and expected version.
- GET /api/exceptions/:id/actions: persistent audit records.
- GET /api/notifications and PATCH /api/notifications/:id/read: recipient-scoped notification inbox and read acknowledgment.
- GET /api/orders/:id: preserve existing order wrapper; extend with authorized events/exceptions/actions for timeline.
- Document authentication, ingestion, planned AI triage/correction contracts, errors, examples, UTC timestamps and demo limitations in docs/api.md.

## Rules and notifications

Integrate accepted ingestion with rule synchronization inside a transaction. Persist one active exception per order/rule; serialize competing rule evaluations. Emit notifications only when a new exception is created or priority rises. Event replay and unchanged evaluations produce no extra audit or notification. Assignment/status audit includes actor, order/exception, before/after values, timestamp and note. Routine workflow audit must not count as complaint resolution merely because an audit row exists.

Reconcile FO-11 accepted status/event names with FO-12 rule predicates (completed versus delivered, complaint_received/return_requested versus complaint_filed). Rules currently omit shipping flags in database evaluation: document this remaining EX-04 input limitation rather than claim complete detection from every ingestion payload.

## Verification

Write failing tests before implementation. Test simultaneous claims with real PostgreSQL, forbidden operator access, owner reassignment, invalid transitions and notes, rollback, repeated ingestion/rules, priority escalation deduplication, recipient scoping, filters/pagination and HTTP errors. Run existing tests, typecheck, build and dependency audit; measure new workflow coverage. Use an isolated test database.

## Parallel ownership

One worker owns docs/api.md and contract examples; another owns the workflow backend/routes/storage and tests. Integration changes in app/server/rules/ingestion are coordinated by the primary agent. All changes stay on the same requested branch.

## Decision

Recommended: transactional PostgreSQL handling and durable notifications, with current single-store scope explicit. An in-memory workflow would lose evidence on restart; a full multi-tenant redesign would expand these two issues substantially. Neither is recommended for this iteration.
