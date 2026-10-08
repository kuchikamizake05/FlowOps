# FlowOps API contract

FO-22 defines the integration contract for FO-11, FO-13, FO-14 and future FO-16. Faaid owns this revision following the user's instruction to complete FO-22. This does not claim Rafif has approved it; frontend adoption is tracked separately.

Base URL: `http://localhost:3000`. This is a **single-store demo**, with no tenant model or isolation between stores. Do not send a client-selected storeId.

## Endpoint availability

| Method | Path | Access | Availability |
| --- | --- | --- | --- |
| GET | `/health` | Public | Available |
| POST | `/api/auth/login` | Public | Available |
| GET | `/api/auth/me` | Authenticated | Available |
| POST | `/api/auth/logout` | Authenticated | Available |
| GET | `/api/orders/:id` | Owner or authorized operator | Available; FO-14 adds timeline |
| POST | `/api/ingestion/csv/preview` | Owner | Available |
| POST | `/api/ingestion/webhook/preview` | Owner | Available |
| POST | `/api/ingestion/csv` | Owner | Available with PostgreSQL |
| POST | `/api/ingestion/webhook` | Owner | Available with PostgreSQL |
| GET | `/api/exceptions` | Authenticated | FO-14 queue |
| GET | `/api/exceptions/:id` | Owner or authorized operator | FO-14 detail |
| POST | `/api/exceptions/:id/claim` | Operator | FO-14 claim |
| PATCH | `/api/exceptions/:id/assignee` | Owner | FO-14 assignment |
| PATCH | `/api/exceptions/:id/status` | Owner or assigned operator | FO-14 transition |
| GET | `/api/exceptions/:id/actions` | Owner or authorized operator | FO-14 audit |
| GET | `/api/operators` | Owner | FO-14 directory |
| GET | `/api/notifications` | Authenticated recipient | FO-14 inbox |
| PATCH | `/api/notifications/:id/read` | Authenticated recipient | FO-14 acknowledgment |
| PATCH | `/api/exceptions/:id/triage` | Owner or assigned operator | Planned FO-16; unavailable |

FO-14 requires configured PostgreSQL; unavailable storage returns 503. Sessions remain in memory, expire in 15 minutes and disappear after restart. Database-backed workflow logs in against PostgreSQL users.password_hash; DEMO_OWNER_PASSWORD/DEMO_OPERATOR_PASSWORD only configure in-memory demo mode. Persistent identities satisfy audit foreign keys.

## Conventions and authentication

JSON fields use camelCase. IDs are opaque strings, including bigint IDs; never convert them to JavaScript numbers. Dates use ISO 8601 UTC, such as `2026-10-08T03:00:00.000Z`; missing deadlines are null. UI converts UTC for display.

Exception statuses: `open` (Baru), `in_progress` (Ditangani), `resolved` (Selesai). Priorities: `low`, `medium`, `high`, `critical`. Rule codes: EX-01 through EX-05. Marketplace order status is separate. Display the server reason, not an invented explanation.

Exception assigneeId is a user ID or null and is the workflow authority. Legacy order assignment stays separate; claiming does not overwrite it. version is a positive integer. Every claim/assignment/status mutation requires expectedVersion from the last read. A stale version returns 409: refresh and reconsider rather than retry blindly.

`POST /api/auth/login`, JSON:

```json
{"email":"operator@flowops.local","password":"<configured-password>"}
```

200:

```json
{"token":"<opaque-token>","expiresAt":"2026-10-08T03:15:00.000Z","user":{"id":"usr-operator","email":"operator@flowops.local","role":"operator"}}
```

Email is normalized to lowercase. Invalid input: 400; wrong credentials: 401. Login allows 10 requests per 15 minutes, then 429. Protected routes require `Authorization: Bearer <token>`. GET auth/me returns `{"user":{...}}`; POST logout returns 204 without a body and revokes the token. Password hashes are never returned.

## Permissions

| Operation | Owner | Operator |
| --- | --- | --- |
| Queue | All exceptions | Own assignments and unassigned exceptions (only open items are claimable) |
| Detail / audit | All | Own or unassigned exception |
| Claim | Use assignment route | Self-claim an unassigned active exception |
| Assign / reassign | Existing operator | Forbidden |
| Status | Eligible active exception | Own assigned exception |
| Directory / ingestion | Allowed | Forbidden |
| Notifications | Own inbox | Own inbox |

Order detail access includes owner, legacy order assignee, or an operator assigned to an exception on that order. Seeing an unassigned queue item does not grant access to another operator's full order timeline.

## Queue and detail

`GET /api/exceptions?status=open&priority=high&page=1&pageSize=20`

| Query | Contract |
| --- | --- |
| status | One exception status |
| priority | One priority |
| ruleCode | EX-01 through EX-05 |
| assigneeId | User ID; `unassigned` selects null |
| deadlineBefore | ISO timestamp with timezone; processing deadline filter |
| page | Integer 1–1000000; default 1 |
| pageSize | 1–100; default 20 |

Filters combine with AND without expanding access. Invalid values return 400. Sort priority descending, processing deadline ascending (null last), creation ascending, ID ascending. Pagination follows access checks and filters.

```json
{"items":[{"id":"41","orderId":"ord-001","marketplaceOrderId":"DEMO-001","ruleCode":"EX-01","priority":"high","status":"open","reason":"Pesanan belum Ready-to-Ship mendekati tenggat.","assigneeId":null,"version":1,"processingDeadline":"2026-10-08T04:00:00.000Z","createdAt":"2026-10-08T03:00:00.000Z","updatedAt":"2026-10-08T03:00:00.000Z"}],"page":1,"pageSize":20,"total":1}
```

GET exceptions/41 returns the same fields under `{"exception":{...}}`. GET operators returns `{"items":[{"id":"usr-operator","email":"operator@flowops.local","role":"operator"}]}`. Use directory IDs for assignment.

## Claim, assignment and status

POST exceptions/41/claim:

```json
{"expectedVersion":1}
```

Operator self-claim atomically assigns and moves open to in_progress. Two concurrent claims cannot both succeed; loser receives 409. A stale replay creates no extra audit.

PATCH exceptions/41/assignee (owner):

```json
{"assigneeId":"usr-operator","expectedVersion":1}
```

Requires an existing operator; null/owner/missing users are invalid. Owner assignment sets responsibility and **preserves status**. It does not start handling automatically. An open assigned exception must be moved to in_progress explicitly. Resolved exceptions cannot be reassigned. Repeating the same assignment with the current version returns the unchanged exception without an extra audit/version increment.

PATCH exceptions/41/status:

```json
{"status":"in_progress","expectedVersion":2}
```

After that transition returns version 3, resolve with:

```json
{"status":"resolved","note":"Bukti penyerahan ke kurir telah diperiksa.","expectedVersion":3}
```

Lifecycle: open → in_progress → resolved. Each actual transition increments version. Self-claim starts handling atomically; owner assignment uses the separate transition above. Resolution requires a nonblank trimmed note, maximum 2000 characters. No backwards transition/reopening. Mutation returns `{"exception":{...}}` with updated version/timestamp. Audit and mutation share a transaction; failure rolls back both. Workflow resolution does not change marketplace order status. Requesting the existing status with a valid current version is a no-op; no audit is duplicated.

## Audit and timeline

GET exceptions/41/actions returns records ordered by timestamp then ID:

```json
{"items":[{"id":"91","exceptionId":"41","orderId":"ord-001","actorId":"usr-operator","action":"claim","note":null,"beforeState":{"status":"open","assigneeId":null,"version":1},"afterState":{"status":"in_progress","assigneeId":"usr-operator","version":2},"createdAt":"2026-10-08T03:05:00.000Z"}]}
```

Routine assignment audit is not complaint resolution. Audit actions are claim, assign and status_change; beforeState/afterState contain status, assigneeId and version. Rule detection/escalation uses notifications rather than a fabricated human audit actor.

GET orders/:id preserves `{"order":{id,marketplaceOrderId,assigneeId,status,...}}`; database-backed detail adds deadlines/snapshot time inside order and sibling arrays events/exceptions/actions at the response root. Events include id, orderId, source, sourceEventId, eventType, occurredAt and payload (normalized ingestion JSON). Operators receive only their assigned exception/action rows in these arrays. Distinguish event occurredAt from audit createdAt. Do not infer fulfillment from resolution.

## Notifications

GET notifications supports page/pageSize with the same bounds, plus unreadOnly=true|false. Results are recipient-scoped, newest first. PATCH notifications/:id/read accepts `{}` and acknowledgment is idempotent. Another user's notification cannot be read or changed.

Inbox response:

```json
{"items":[{"id":"101","recipientId":"usr-operator","exceptionId":"41","kind":"new","priority":"high","readAt":null,"createdAt":"2026-10-08T03:00:00.000Z"}],"total":1,"page":1,"pageSize":20}
```

Read acknowledgment returns `{"notification":{...}}` with a UTC readAt timestamp. Missing or another recipient's ID returns 404 to avoid exposing inbox existence. Unknown JSON/query fields are rejected. Exception/notification IDs must be positive decimal strings within PostgreSQL bigint range; malformed identifiers return 400 rather than 404.

New active exceptions and priority increases create durable in-app notifications with kind new or escalation. Owners receive these, and operators receive unassigned notices or notices for their own assignment. Claim/assignment/status changes also notify the resulting assignee with kind claim, assign or status_change. Unchanged evaluation/event replay creates no extra notification. This does not guarantee email or push delivery.

## Ingestion

See [ingestion.md](ingestion.md) for exact fields/enums/CSV rules. CSV uses raw text/csv (256 KiB, 1000 records), webhook JSON (32 KiB, one event). Preview never writes data. Persistent result:

```json
{"persisted":true,"total":2,"valid":1,"invalid":1,"accepted":1,"duplicates":0,"stale":0,"errors":[{"line":3,"field":"status","message":"<validation-reason>"}]}
```

Invalid CSV records allow valid records to save. Structural failure (400) or conflicting event identity (409) rolls back the batch. valid=accepted+duplicates; total=valid+invalid; stale is part of accepted history-only events. Accepted events synchronize rules transactionally; replay has no repeated workflow side effects.

EX-04 pure evaluation exists but persisted CSV/webhook lacks shipping-label flags; end-to-end label detection is limited until those fields exist. Accepted complaint/return/cancellation names are mapped to rules without requiring unsupported event names.

Canonical ingestion mapping: completed is terminal for deadline rules; cancellation_pending triggers EX-03; complaint_received and return_requested events, or return_pending status, trigger EX-05. Assignment/claim alone does not suppress EX-05. Resolving the finding records handling; re-evaluating the same resolved snapshot does not silently reopen it. A subsequent new complaint snapshot may create a new finding. Rule synchronization can change an active exception's version, so a previously read mutation version may become stale even without another operator's action.

## Planned AI (FO-15 / FO-16)

No AI endpoint is implemented by FO-14. Label prototypes as demo. Proposed detail field: `triage: {source: "ai" | "manual", category, summary, suggestedAction, confidence, correctedBy, updatedAt} | null`.

Proposed PATCH exceptions/:id/triage:

```json
{"category":"<category>","summary":"<operator-summary>","suggestedAction":"<action>","note":"<correction-reason>","expectedVersion":3}
```

Would return exception wrapper, require owner/assigned operator and audit. Categories, bounds and model failure fallback must be finalized with FO-15. AI cannot automatically assign or resolve.

## Errors and compatibility

Errors preserve `{"error":"<message>"}`; validation may add fields. Use HTTP status, not translated message text, for client behavior.

| Status | Meaning |
| --- | --- |
| 400 | Invalid input/enum, missing version, blank resolution note, malformed JSON |
| 401 | Missing/expired/revoked session |
| 403 | Forbidden actor or recipient |
| 404 | Missing ID |
| 409 | Stale version, competing claim, invalid transition, event identity conflict |
| 413 | Body too large |
| 415 | Wrong Content-Type |
| 429 | Login limit |
| 500 | Unexpected server failure; no SQL/secret details |
| 503 | Required database unavailable/unconfigured |

Examples: `{"expectedVersion":0}` → 400; resolve with whitespace note → 400; unauthenticated queue → 401; operator assignment route → 403; missing exception → 404; outdated claim version → 409.

Frontend backendFetch currently permits GET/POST JSON. Extend it for PATCH and raw CSV instead of JSON-stringifying CSV. Preserve 204, auth failures, conflicts and network errors. Current dashboard/queue demo data is not evidence of live integration.

## Change log

2026-10-08: FO-22 defines persistent ingestion, workflow/versioning, permissions, audit, notifications, pagination and planned AI. Auth/ingestion wrappers remain compatible. Frontend adoption is separate. Contract changes must update this document, backend HTTP tests and frontend adapters together.
