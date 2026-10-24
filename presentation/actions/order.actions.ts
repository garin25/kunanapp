'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { PrismaOrderRepository } from '@/infrastructure/database/repositories/prisma-order.repository';
import { CreateOrderReservationUseCase } from '@/core/application/use-cases/orders/create-order-reservation.use-case';
import { DecideOrderReservationUseCase } from '@/core/application/use-cases/orders/decide-order-reservation.use-case';
import { GetAdminOrdersUseCase } from '@/core/application/use-cases/orders/get-admin-orders.use-case';
import { OrderReservationError } from '@/core/domain/errors/order-reservation.error';
import { AdminSessionService } from '@/infrastructure/services/admin-session.service';

const orderRepository = new PrismaOrderRepository();
const createOrderUseCase = new CreateOrderReservationUseCase(orderRepository);
const decideOrderUseCase = new DecideOrderReservationUseCase(orderRepository);
const getAdminOrdersUseCase = new GetAdminOrdersUseCase(orderRepository);

export async function createOrderReservationAction(input: unknown) {
  try {
    const order = await createOrderUseCase.execute(input);
    revalidatePath('/');
    revalidatePath('/admin');
    return {
      success: true as const,
      data: order,
      total: order.total,
      items: order.items,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false as const,
        error: error.errors[0]?.message ?? 'El pedido no es válido.',
      };
    }
    if (error instanceof OrderReservationError) {
      return {
        success: false as const,
        error: error.message,
      };
    }
    console.error('[createOrderReservationAction] Error no esperado:', error);
    return {
      success: false as const,
      error: 'Ocurrió un error al procesar el pedido.',
    };
  }
}

export async function loadAdminOrdersAction(page: number) {
  await AdminSessionService.requireAdmin();
  try {
    const data = await getAdminOrdersUseCase.execute(page);
    return { success: true as const, data };
  } catch (error) {
    console.error('[loadAdminOrdersAction] Error:', error);
    return {
      success: false as const,
      error: 'No se pudieron cargar los pedidos.',
    };
  }
}

export async function processOrderAction(orderId: number, decision: 'confirm' | 'discard') {
  await AdminSessionService.requireAdmin();
  try {
    await decideOrderUseCase.execute({ orderId, decision });
    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true as const };
  } catch (error) {
    if (error instanceof OrderReservationError) {
      return { error: error.message };
    }
    console.error('[processOrderAction] Error:', error);
    return { error: 'Ocurrió un error al procesar la reserva.' };
  }
}
