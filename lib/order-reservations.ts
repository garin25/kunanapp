import 'server-only';

import { PrismaOrderRepository } from '@/infrastructure/database/repositories/prisma-order.repository';
import { CreateOrderReservationUseCase } from '@/core/application/use-cases/orders/create-order-reservation.use-case';
import { DecideOrderReservationUseCase } from '@/core/application/use-cases/orders/decide-order-reservation.use-case';
import { ExpirePendingOrdersUseCase } from '@/core/application/use-cases/orders/expire-pending-orders.use-case';
import { GetAdminOrdersUseCase } from '@/core/application/use-cases/orders/get-admin-orders.use-case';
import { OrderReservationError } from '@/core/domain/errors/order-reservation.error';
import type {
  ReservationLineInput,
  AdminOrdersPage,
  ReservationAvailability,
} from '@/core/domain/repositories/order.repository.interface';

export { OrderReservationError };
export type {
  ReservationLineInput,
  AdminOrdersPage,
  ReservationAvailability,
};

export type AdminOrder = AdminOrdersPage['orders'][number];

const orderRepository = new PrismaOrderRepository();
const createOrderUseCase = new CreateOrderReservationUseCase(orderRepository);
const decideOrderUseCase = new DecideOrderReservationUseCase(orderRepository);
const expireOrdersUseCase = new ExpirePendingOrdersUseCase(orderRepository);
const getAdminOrdersUseCase = new GetAdminOrdersUseCase(orderRepository);

export async function describeUnavailableReservation(
  unavailableLine: ReservationLineInput,
  lines: ReservationLineInput[]
): Promise<ReservationAvailability> {
  // Batch query para erradicar el N+1
  const allProductIds = [...new Set([unavailableLine.productId, ...lines.map((l) => l.productId)])];
  const productsMap = await orderRepository.findProductsWithVariantsByIds(allProductIds);

  const product = productsMap.get(unavailableLine.productId);
  const variant =
    product && unavailableLine.variantId !== null
      ? (product.variantes.find((candidate) => candidate.id === unavailableLine.variantId) ?? null)
      : null;

  const itemName = product
    ? `${product.nombre}${variant ? ` (${variant.valorAtributo})` : ''}`
    : 'Uno de los productos';

  const isReserved = await orderRepository.hasActiveReservation(
    unavailableLine.productId,
    unavailableLine.variantId
  );

  const availableNames: string[] = [];
  for (const line of lines) {
    if (
      line.productId === unavailableLine.productId &&
      line.variantId === unavailableLine.variantId
    ) {
      continue;
    }

    const otherProduct = productsMap.get(line.productId);
    if (!otherProduct) continue;

    if (otherProduct.variantes.length > 0) {
      const otherVariant =
        line.variantId === null
          ? null
          : (otherProduct.variantes.find((c) => c.id === line.variantId) ?? null);
      if (otherVariant && otherVariant.stock >= line.quantity) {
        availableNames.push(`${otherProduct.nombre} (${otherVariant.valorAtributo})`);
      }
    } else if (
      line.variantId === null &&
      otherProduct.stockGeneral !== null &&
      otherProduct.stockGeneral >= line.quantity
    ) {
      availableNames.push(otherProduct.nombre);
    }
  }

  return {
    unavailableItem: itemName,
    isReserved,
    availableItems: [...new Set(availableNames)],
  };
}

export async function expirePendingOrders(now = new Date()): Promise<number> {
  return expireOrdersUseCase.execute(now);
}

export async function createOrderReservation({
  lines,
  deliveryMethod,
  deliveryDetails,
}: {
  lines: ReservationLineInput[];
  deliveryMethod: string;
  deliveryDetails: string;
}) {
  return createOrderUseCase.execute({ lines, deliveryMethod, deliveryDetails });
}

export async function decideOrderReservation(orderId: number, decision: 'confirm' | 'discard') {
  return decideOrderUseCase.execute({ orderId, decision });
}

export async function getAdminOrders(page = 1): Promise<AdminOrdersPage> {
  return getAdminOrdersUseCase.execute(page);
}
