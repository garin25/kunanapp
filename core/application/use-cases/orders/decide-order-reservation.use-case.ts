import type { IOrderRepository } from '@/core/domain/repositories/order.repository.interface';
import { decideOrderSchema, type DecideOrderDTO } from '@/core/application/dtos/order.dto';

export class DecideOrderReservationUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(input: unknown) {
    const validated: DecideOrderDTO = decideOrderSchema.parse(input);
    await this.orderRepository.expireOrders(new Date());
    return this.orderRepository.decideOrder(validated.orderId, validated.decision);
  }
}
