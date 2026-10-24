import type { IOrderRepository } from '@/core/domain/repositories/order.repository.interface';
import {
  createOrderReservationSchema,
  type CreateOrderReservationDTO,
} from '@/core/application/dtos/order.dto';
import { ORDER_RESERVATION_HOURS } from '@/lib/order-config';

export class CreateOrderReservationUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(input: unknown) {
    const validated: CreateOrderReservationDTO = createOrderReservationSchema.parse(input);

    // Mantenimiento preventivo: liberar reservas vencidas antes de evaluar stock
    await this.orderRepository.expireOrders(new Date());

    // Carga por lote (Batch) de productos y variantes para erradicar el problema N+1
    const productIds = validated.lines.map((l) => l.productId);
    const productsMap = await this.orderRepository.findProductsWithVariantsByIds(productIds);

    const expiresAt = new Date(
      Date.now() + ORDER_RESERVATION_HOURS * 60 * 60 * 1000
    );

    return this.orderRepository.executeReservationTransaction({
      lines: validated.lines,
      deliveryMethod: validated.deliveryMethod,
      deliveryDetails: validated.deliveryDetails,
      expiresAt,
      productsMap,
    });
  }
}
