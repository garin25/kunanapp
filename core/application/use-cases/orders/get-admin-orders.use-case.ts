import type { IOrderRepository } from '@/core/domain/repositories/order.repository.interface';

export class GetAdminOrdersUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(page = 1, pageSize = 20) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    // Expira preventivamente órdenes vencidas
    await this.orderRepository.expireOrders(new Date());
    return this.orderRepository.getAdminOrdersPage(safePage, pageSize);
  }
}
