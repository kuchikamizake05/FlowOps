export type UserRole = 'owner' | 'operator';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  passwordHash: string;
}

export type PublicUser = Pick<User, 'id' | 'email' | 'role'>;

export class UserRepository {
  constructor(private readonly users: User[] = []) {}

  findByEmail(email: string): User | null {
    return this.users.find((user) => user.email === email) ?? null;
  }
}
