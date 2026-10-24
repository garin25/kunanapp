'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

import { PrismaOrderRepository } from '@/infrastructure/database/repositories/prisma-order.repository';
import { DecideOrderReservationUseCase } from '@/core/application/use-cases/orders/decide-order-reservation.use-case';
import { GetAdminOrdersUseCase } from '@/core/application/use-cases/orders/get-admin-orders.use-case';
import { AdminSessionService } from '@/infrastructure/services/admin-session.service';
import { OrderReservationError } from '@/core/domain/errors/order-reservation.error';

const orderRepository = new PrismaOrderRepository();
const decideOrderUseCase = new DecideOrderReservationUseCase(orderRepository);
const getAdminOrdersUseCase = new GetAdminOrdersUseCase(orderRepository);

export async function loadAdminOrdersAction(page: number) {
  await AdminSessionService.requireAdmin();
  if (!Number.isInteger(page) || page < 1) {
    return { success: false as const, error: 'La página seleccionada no es válida.' };
  }
  const data = await getAdminOrdersUseCase.execute(page);
  return { success: true as const, data };
}

export async function processOrderAction(
  orderId: number,
  decision: 'confirm' | 'discard'
) {
  await AdminSessionService.requireAdmin();
  if (!Number.isInteger(orderId) || orderId < 1) {
    return { error: 'El pedido seleccionado no es válido.' };
  }
  if (decision !== 'confirm' && decision !== 'discard') {
    return { error: 'La acción seleccionada no es válida.' };
  }
  try {
    await decideOrderUseCase.execute({ orderId, decision });
    revalidatePath('/admin');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    if (error instanceof OrderReservationError) return { error: error.message };
    throw error;
  }
}
