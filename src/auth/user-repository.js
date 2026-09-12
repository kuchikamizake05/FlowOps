export class UserRepository {
  constructor(users = []) {
    this.users = users;
  }

  findByEmail(email) {
    return this.users.find((user) => user.email === email) ?? null;
  }
}
