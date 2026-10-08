import type pg from 'pg';
import { UserRepository, type User } from './user-repository.js';

export class PostgresUserRepository extends UserRepository {
  constructor(private readonly pool: pg.Pool) {
    super();
  }
  override async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT id,email,role,password_hash FROM users WHERE email=$1',
      [email],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          email: row.email,
          role: row.role,
          passwordHash: row.password_hash,
        }
      : null;
  }
}
