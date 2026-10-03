import { parse } from 'csv-parse/sync';
import { z } from 'zod';

export const MAX_CSV_BYTES = 256 * 1024;
const MAX_ROWS = 1000;
export class InputError extends Error {
  constructor(message: string, public readonly status = 400, public readonly fields: { field: string; message: string }[] = []) {
    super(message);
  }
}

const identifier = z.string().trim().min(1).max(128);
const timestamp = z.iso.datetime({ offset: true }).transform(value => new Date(value).toISOString());
const eventSchema = z.object({
  sourceEventId: identifier,
  marketplaceOrderId: identifier,
  eventType: z.enum(['order_created', 'order_updated', 'complaint_received', 'return_requested']),
  status: z.string().trim().toLowerCase().pipe(z.enum(['new', 'processing', 'ready_to_ship', 'shipped', 'completed', 'cancelled', 'cancellation_pending', 'return_pending'])),
  occurredAt: timestamp,
  processingDeadline: timestamp.nullable().optional().transform(value => value ?? null),
  complaintText: z.string().trim().max(4000).optional()
}).strict();

export type NormalizedEvent = z.output<typeof eventSchema> & { source: 'csv' | 'webhook' };

export function normalizeWebhook(input: unknown): NormalizedEvent {
  const result = eventSchema.safeParse(input);
  if (!result.success) {
    throw new InputError('Event tidak valid.', 400, result.error.issues.map(issue => ({ field: issue.path.join('.') || 'payload', message: issue.message })));
  }
  return { ...result.data, source: 'webhook' };
}

const columns = {
  source_event_id: 'sourceEventId', marketplace_order_id: 'marketplaceOrderId',
  event_type: 'eventType', status: 'status', occurred_at: 'occurredAt',
  processing_deadline: 'processingDeadline', complaint_text: 'complaintText'
} as const;
const required = ['source_event_id', 'marketplace_order_id', 'event_type', 'status', 'occurred_at'];

export function previewCsv(csv: string) {
  if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) throw new InputError('CSV melebihi batas 256 KiB.', 413);
  let records: { record: string[]; info: { lines: number } }[];
  try {
    // The library's array overload omits the wrapper produced by info: true.
    records = parse(csv, { bom: true, skip_empty_lines: true, info: true, max_record_size: MAX_CSV_BYTES }) as unknown as typeof records;
  } catch {
    throw new InputError('Struktur CSV tidak valid. Periksa jumlah kolom dan tanda kutip.');
  }
  if (records.length < 2) throw new InputError('CSV harus memuat header dan setidaknya satu baris data.');
  if (records.length - 1 > MAX_ROWS) throw new InputError('CSV melebihi batas 1000 baris data.', 413);
  const headers = records[0].record.map(value => value.trim());
  if (new Set(headers).size !== headers.length || headers.some(value => !Object.hasOwn(columns, value)) || required.some(value => !headers.includes(value))) {
    throw new InputError('Header CSV tidak valid: kolom wajib harus lengkap, tanpa kolom asing atau duplikat.');
  }
  const events: NormalizedEvent[] = [];
  const errors: { line: number; fields: { field: string; message: string }[] }[] = [];
  for (const { record, info } of records.slice(1)) {
    const input = Object.fromEntries(headers.map((header, index) => {
      const field = columns[header as keyof typeof columns];
      const value = record[index].trim();
      return [field, field === 'processingDeadline' && value === '' ? null : value];
    }));
    try {
      events.push({ ...normalizeWebhook(input), source: 'csv' });
    } catch (error) {
      if (!(error instanceof InputError)) throw error;
      errors.push({ line: info.lines, fields: error.fields });
    }
  }
  return { persisted: false as const, total: records.length - 1, valid: events.length, invalid: errors.length, events, errors };
}
