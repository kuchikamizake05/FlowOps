export class OrderRepository {
  constructor(orders = []) {
    this.orders = orders;
  }

  findById(id) {
    return this.orders.find((order) => order.id === id) ?? null;
  }
}
