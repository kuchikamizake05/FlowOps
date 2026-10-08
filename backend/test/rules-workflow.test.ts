import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateOrderExceptions } from '../src/rules/rules-engine.js';

test('accepted ingestion statuses trigger cancellation and return rules; completed is terminal', () => {
  const now = new Date('2026-10-08T10:00:00Z');
  const evaluate = (status: string) => evaluateOrderExceptions({ id: 'order', status, processingDeadline: now }, now).map(x => x.ruleCode);
  assert.ok(evaluate('cancellation_pending').includes('EX-03'));
  assert.ok(evaluate('return_pending').includes('EX-05'));
  assert.deepEqual(evaluate('completed'), []);
});
