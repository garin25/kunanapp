import { z } from 'zod';

export const reservationLineSchema = z.object({
  productId: z.number().int().positive('El ID del producto es inválido.'),
  variantId: z.number().int().positive('El ID de variante es inválido.').nullable(),
  quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1.').max(100, 'Máximo 100 por ítem.'),
});

export const createOrderReservationSchema = z.object({
  lines: z.array(reservationLineSchema).min(1, 'El pedido no contiene productos válidos.').max(50, 'Máximo 50 líneas.'),
  deliveryMethod: z.enum(['pickup', 'moto', 'correo'], {
    errorMap: () => ({ message: 'El método de entrega no es válido.' }),
  }),
  deliveryDetails: z.string().trim().min(1, 'Revisá los datos de entrega.').max(1000, 'Los datos de entrega superan el límite de caracteres.'),
});

export const decideOrderSchema = z.object({
  orderId: z.number().int().positive('ID de pedido inválido.'),
  decision: z.enum(['confirm', 'discard'], {
    errorMap: () => ({ message: 'La acción seleccionada no es válida.' }),
  }),
});

export type ReservationLineDTO = z.infer<typeof reservationLineSchema>;
export type CreateOrderReservationDTO = z.infer<typeof createOrderReservationSchema>;
export type DecideOrderDTO = z.infer<typeof decideOrderSchema>;
