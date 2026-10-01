import assert from 'node:assert/strict';
import test from 'node:test';
import argon2 from 'argon2';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { SessionStore } from '../src/auth/session-store.js';
import { UserRepository } from '../src/auth/user-repository.js';
import { OrderRepository } from '../src/orders/order-repository.js';

async function testApp() {
  const passwordHash = await argon2.hash('password-yang-cukup-panjang');
  return createApp({
    users: new UserRepository([
      { id: 'owner-1', email: 'owner@flowops.test', role: 'owner', passwordHash },
      { id: 'operator-1', email: 'operator@flowops.test', role: 'operator', passwordHash },
      { id: 'operator-2', email: 'operator2@flowops.test', role: 'operator', passwordHash }
    ]),
    sessions: new SessionStore(),
    orders: new OrderRepository([
      { id: 'order-owner', assigneeId: 'owner-1' },
      { id: 'order-operator', assigneeId: 'operator-1' }
    ])
  });
}

async function login(app: Awaited<ReturnType<typeof testApp>>, email: string): Promise<string> {
  const response = await request(app).post('/api/auth/login').send({ email, password: 'password-yang-cukup-panjang' });
  assert.equal(response.status, 200);
  return response.body.token as string;
}

test('login mengembalikan sesi tanpa password hash', async () => {
  const app = await testApp();
  const response = await request(app).post('/api/auth/login').send({
    email: 'owner@flowops.test', password: 'password-yang-cukup-panjang'
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, 'owner');
  assert.equal('passwordHash' in response.body.user, false);
});

test('operator tidak dapat membaca order milik pengguna lain', async () => {
  const app = await testApp();
  const token = await login(app, 'operator@flowops.test');
  const response = await request(app).get('/api/orders/order-owner').set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 403);
});

test('owner dapat membaca seluruh order, operator dapat membaca tugasnya sendiri', async () => {
  const app = await testApp();
  const ownerToken = await login(app, 'owner@flowops.test');
  const operatorToken = await login(app, 'operator@flowops.test');

  const ownerResponse = await request(app).get('/api/orders/order-operator').set('Authorization', `Bearer ${ownerToken}`);
  const operatorResponse = await request(app).get('/api/orders/order-operator').set('Authorization', `Bearer ${operatorToken}`);
  assert.equal(ownerResponse.status, 200);
  assert.equal(operatorResponse.status, 200);
});
