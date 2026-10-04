import argon2 from 'argon2';
import { createApp } from './app.js';
import { SessionStore } from './auth/session-store.js';
import { UserRepository } from './auth/user-repository.js';
import { OrderRepository } from './orders/order-repository.js';
import { PostgresOrderRepository } from './orders/postgres-order-repository.js';
import { PostgresIngestion } from './ingestion/postgres-ingestion.js';
import { pool } from './database/pool.js';

const ownerPassword = process.env.DEMO_OWNER_PASSWORD ?? 'change-this-owner-password';
const operatorPassword = process.env.DEMO_OPERATOR_PASSWORD ?? 'change-this-operator-password';

const users = new UserRepository([
  { id: 'usr-owner', email: 'owner@flowops.local', role: 'owner', passwordHash: await argon2.hash(ownerPassword) },
  { id: 'usr-operator', email: 'operator@flowops.local', role: 'operator', passwordHash: await argon2.hash(operatorPassword) }
]);

const orders = new OrderRepository([
  { id: 'ord-001', marketplaceOrderId: 'DEMO-001', assigneeId: 'usr-operator', status: 'needs_action' },
  { id: 'ord-002', marketplaceOrderId: 'DEMO-002', assigneeId: 'usr-owner', status: 'needs_action' }
]);

const databaseConfigured = Boolean(process.env.DATABASE_URL);
const app = createApp({
  users, sessions: new SessionStore(),
  orders: databaseConfigured ? new PostgresOrderRepository(pool) : orders,
  ingestion: databaseConfigured ? new PostgresIngestion(pool) : undefined
});
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`FlowOps API berjalan pada http://localhost:${port}`));
