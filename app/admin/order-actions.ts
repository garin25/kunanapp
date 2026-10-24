'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/admin-auth';
import {
  decideOrderReservation,
  expirePendingOrders,
  getAdminOrders,
  OrderReservationError,
} from '@/lib/order-reservations';

export async function loadAdminOrdersAction(page: number) {
  await requireAdmin();
  if (!Number.isInteger(page) || page < 1)
    return {
      success: false as const,
      error: 'La página seleccionada no es válida.',
    };
  return { success: true as const, data: await getAdminOrders(page) };
}

export async function processOrderAction(
  orderId: number,
  decision: 'confirm' | 'discard'
) {
  await requireAdmin();
  if (!Number.isInteger(orderId) || orderId < 1)
    return { error: 'El pedido seleccionado no es válido.' };
  if (decision !== 'confirm' && decision !== 'discard')
    return { error: 'La acción seleccionada no es válida.' };

  try {
    await expirePendingOrders();
    await decideOrderReservation(orderId, decision);
  } catch (error) {
    if (error instanceof OrderReservationError)
      return { error: error.message };
    throw error;
  }

  revalidatePath('/admin');
  revalidatePath('/');
  return { success: true };
}
