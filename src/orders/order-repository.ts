export interface Order {
  id: string;
  marketplaceOrderId?: string;
  assigneeId: string;
  status?: string;
}

export class OrderRepository {
  constructor(private readonly orders: Order[] = []) {}

  findById(id: string): Order | null {
    return this.orders.find((order) => order.id === id) ?? null;
  }
}
