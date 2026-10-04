BEGIN;

--- 1. akun pengguna
INSERT INTO users (id, email, role, password_hash)
VALUES
    ('demo-owner', 'owner@flowops.local', 'owner', '$argon2id$v=19$m=65536,p=4,t=3$3jmfOCbPt90N+RI5IVsqjg$HYEzY2Dy7m/F/bS3u9bo/7Wk2BojREjSkCcgJ2rrcx8'),
    ('demo-operator', 'operator@flowops.local', 'operator', '$argon2id$v=19$m=65536,p=4,t=3$J4QLy+5gOyj3sJzvEGBzhA$SYyvDLE63gVhbDFAqdNQKjU8lQW6X4VN2dSQIRsrtdM')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    password_hash = EXCLUDED.password_hash;

-- 2. data pesanan Contoh 
INSERT INTO orders (id, marketplace_order_id, status, processing_deadline, assignee_id)
VALUES
    ('demo-order-1', 'MP-1001', 'processing', now() + interval '45 minutes', 'demo-operator'),
    ('demo-order-2', 'MP-1002', 'created', now() + interval '6 hours', NULL),
    ('demo-order-3', 'MP-1003', 'complaint_pending', now() + interval '25 minutes', 'demo-operator'),
    ('demo-order-4', 'MP-1004', 'ready_to_ship', now() + interval '50 minutes', 'demo-operator')
ON CONFLICT (id) DO UPDATE SET
    marketplace_order_id = EXCLUDED.marketplace_order_id,
    status = EXCLUDED.status,
    processing_deadline = EXCLUDED.processing_deadline,
    assignee_id = EXCLUDED.assignee_id;

-- 3. Data Riwayat Event Pesanan 
INSERT INTO order_events (order_id, source, source_event_id, event_type, occurred_at)
VALUES
    ('demo-order-1', 'webhook', 'WH-EVT-1001-CREATE', 'order_created', now() - interval '2 hours'),
    ('demo-order-2', 'csv', 'CSV-EVT-1002-IMPORT', 'order_imported', now() - interval '1 hour'),
    ('demo-order-3', 'webhook', 'WH-EVT-1003-COMPLAINT', 'buyer_complaint_filed', now() - interval '30 minutes'),
    ('demo-order-4', 'webhook', 'WH-EVT-1004-RTS', 'ready_to_ship', now() - interval '15 minutes')
ON CONFLICT (source, source_event_id) DO NOTHING;

-- 4. Data Exception Masalah Operasional
DELETE FROM exceptions WHERE order_id IN ('demo-order-1', 'demo-order-3', 'demo-order-4');

INSERT INTO exceptions (order_id, rule_code, priority, status, reason)
VALUES
    ('demo-order-1', 'EX-01', 'high', 'open', 'Pesanan belum ready-to-ship, sisa waktu proses tersisa 45 menit (di bawah ambang 120 menit).'),
    ('demo-order-3', 'EX-05', 'critical', 'in_progress', 'Komplain barang cacat/rusak dilaporkan pembeli dan menunggu tindak lanjut operator.'),
    ('demo-order-4', 'EX-02', 'high', 'open', 'Pesanan sudah siap dikemas tetapi belum diserahkan ke kurir mendekati batas handoff.');

-- 5. Data Catatan Riwayat Tindakan Operator 
INSERT INTO action_logs (exception_id, actor_id, action, note)
SELECT
    e.id,
    'demo-operator',
    'investigate_complaint',
    'Menghubungi pembeli via chat marketplace untuk verifikasi foto dan video unboxing produk.'
FROM exceptions e
WHERE e.order_id = 'demo-order-3' AND e.rule_code = 'EX-05'
LIMIT 1;

INSERT INTO action_logs (exception_id, actor_id, action, note)
SELECT
    e.id,
    'demo-operator',
    'stock_verified',
    'Stok produk di rak B-04 telah dipastikan ada, paket sedang dalam antrean pengemasan akhir.'
FROM exceptions e
WHERE e.order_id = 'demo-order-1' AND e.rule_code = 'EX-01'
LIMIT 1;

COMMIT;
