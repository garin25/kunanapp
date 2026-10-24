'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

import { PrismaOrderRepository } from '@/infrastructure/database/repositories/prisma-order.repository';
import { CreateOrderReservationUseCase } from '@/core/application/use-cases/orders/create-order-reservation.use-case';
import { OrderReservationError } from '@/core/domain/errors/order-reservation.error';
import { describeUnavailableReservation } from '@/lib/order-reservations';
import type { ReservationLineInput, ReservationAvailability } from '@/core/domain/repositories/order.repository.interface';

const orderRepository = new PrismaOrderRepository();
const createOrderUseCase = new CreateOrderReservationUseCase(orderRepository);

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
  try {
    const order = await createOrderUseCase.execute(input);
    revalidatePath('/');
    revalidatePath('/admin');
    return {
      success: true,
      total: order.total,
      items: order.items.map((item) => ({
        productName: item.nombreProducto,
        variantName: item.nombreVariante,
        unitPrice: Number(item.precioUnitario),
        quantity: item.cantidad,
      })),
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, error: error.errors[0]?.message ?? 'El pedido no es válido.' };
    }
    if (error instanceof OrderReservationError) {
      if (error.unavailableLine) {
        const lines = Array.isArray(input.lines)
          ? (input.lines as ReservationLineInput[])
          : [];
        return {
          success: false,
          error: error.message,
          availability: await describeUnavailableReservation(error.unavailableLine, lines),
        };
      }
      return { success: false, error: error.message };
    }
    throw error;
  }
}
