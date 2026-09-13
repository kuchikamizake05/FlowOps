import { randomBytes } from 'node:crypto';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export class SessionStore {
  #sessions = new Map();

  create(user) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + FIFTEEN_MINUTES;
    this.#sessions.set(token, { user, expiresAt });
    return { token, expiresAt };
  }

  find(token) {
    const session = this.#sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      this.#sessions.delete(token);
      return null;
    }
    return session.user;
  }

  revoke(token) {
    this.#sessions.delete(token);
  }
}
