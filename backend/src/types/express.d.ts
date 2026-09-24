import type { PublicUser } from '../auth/user-repository.js';

declare global {
  namespace Express {
    interface Request {
      user: PublicUser | null;
    }
  }
}

export {};
