import { randomBytes } from 'node:crypto';
import type { PublicUser } from './user-repository.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

interface Session {
  user: PublicUser;
  expiresAt: number;
}

export class SessionStore {
  #sessions = new Map<string, Session>();

  create(user: PublicUser): { token: string; expiresAt: number } {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + FIFTEEN_MINUTES;
    this.#sessions.set(token, { user, expiresAt });
    return { token, expiresAt };
  }

  find(token: string): PublicUser | null {
    const session = this.#sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      this.#sessions.delete(token);
      return null;
    }
    return session.user;
  }

  revoke(token: string): void {
    this.#sessions.delete(token);
  }
}
