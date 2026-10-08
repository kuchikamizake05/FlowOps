import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { SessionStore } from '../src/auth/session-store.js';
import { UserRepository } from '../src/auth/user-repository.js';
import { OrderRepository } from '../src/orders/order-repository.js';

test('workflow endpoints require authentication before storage access', async () => {
  const app = createApp({users:new UserRepository(), sessions:new SessionStore(), orders:new OrderRepository()});
  for (const path of ['/api/exceptions','/api/exceptions/1','/api/exceptions/1/actions','/api/notifications','/api/operators']) {
    assert.equal((await request(app).get(path)).status, 401, path);
  }
});

test('workflow endpoints explicitly report unavailable storage', async () => {
  const sessions = new SessionStore();
  const token = sessions.create({id:'owner',email:'owner@test.local',role:'owner'}).token;
  const app = createApp({users:new UserRepository(), sessions, orders:new OrderRepository()});
  assert.equal((await request(app).get('/api/exceptions').set('Authorization',`Bearer ${token}`)).status,503);
});
