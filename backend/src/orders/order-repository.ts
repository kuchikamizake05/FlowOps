export interface Order {
  id: string;
  marketplaceOrderId?: string;
  assigneeId: string | null;
  status?: string;
}

export interface OrderReader {
  findById(id: string): Order | null | Promise<Order | null>;
}

export class OrderRepository {
  constructor(private readonly orders: Order[] = []) {}

  findById(id: string): Order | null {
    return this.orders.find((order) => order.id === id) ?? null;
  }
}
