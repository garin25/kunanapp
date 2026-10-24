import type { IOrderRepository } from '@/core/domain/repositories/order.repository.interface';

export class ExpirePendingOrdersUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(cutoffDate = new Date()): Promise<number> {
    return this.orderRepository.expireOrders(cutoffDate);
  }
}
