'use server';

import { revalidatePath } from 'next/cache';

import {
  createOrderReservation,
  describeUnavailableReservation,
  expirePendingOrders,
  OrderReservationError,
  type ReservationAvailability,
  type ReservationLineInput,
} from '@/lib/order-reservations';

type CreateReservationResult =
  | {
      success: true;
      total: number;
      items: {
        productName: string;
        variantName: string | null;
        unitPrice: number;
        quantity: number;
      }[];
    }
  | {
      success: false;
      error: string;
      availability?: ReservationAvailability;
    };

export async function createOrderReservationAction(input: {
  lines: unknown;
  deliveryMethod: unknown;
  deliveryDetails: unknown;
}): Promise<CreateReservationResult> {
  if (!input || !Array.isArray(input.lines))
    return { success: false, error: 'El pedido no es válido.' };

  const lines: ReservationLineInput[] = [];
  for (const line of input.lines) {
    if (!line || typeof line !== 'object')
      return { success: false, error: 'Hay un producto inválido en el pedido.' };
    const record = line as Record<string, unknown>;
    if (
      typeof record.productId !== 'number' ||
      (record.variantId !== null && typeof record.variantId !== 'number') ||
      typeof record.quantity !== 'number'
    )
      return { success: false, error: 'Hay un producto inválido en el pedido.' };
    lines.push({
      productId: record.productId,
      variantId: record.variantId,
      quantity: record.quantity,
    });
  }

  if (
    typeof input.deliveryMethod !== 'string' ||
    typeof input.deliveryDetails !== 'string'
  )
    return { success: false, error: 'Revisá los datos de entrega.' };

  try {
    await expirePendingOrders();
    const order = await createOrderReservation({
      lines,
      deliveryMethod: input.deliveryMethod,
      deliveryDetails: input.deliveryDetails,
    });
    revalidatePath('/');
    revalidatePath('/admin');
    return {
      success: true,
      total: Number(order.total),
      items: order.items.map((item) => ({
        productName: item.nombreProducto,
        variantName: item.nombreVariante,
        unitPrice: Number(item.precioUnitario),
        quantity: item.cantidad,
      })),
    };
  } catch (error) {
    if (error instanceof OrderReservationError) {
      if (error.unavailableLine)
        return {
          success: false,
          error: error.message,
          availability: await describeUnavailableReservation(
            error.unavailableLine,
            lines
          ),
        };
      return { success: false, error: error.message };
    }
    throw error;
  }
}
