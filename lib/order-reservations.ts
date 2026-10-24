import 'server-only';

import { prisma } from '@/lib/prisma';
import { ORDER_RESERVATION_HOURS } from '@/lib/order-config';

const millisecondsPerHour = 60 * 60 * 1000;

export type ReservationLineInput = {
  productId: number;
  variantId: number | null;
  quantity: number;
};

export type AdminOrder = {
  id: number;
  status: 'PENDIENTE' | 'CONFIRMADO' | 'DESCARTADO' | 'EXPIRADO';
  total: number;
  deliveryMethod: string;
  deliveryDetails: string;
  expiresAt: string;
  createdAt: string;
  items: {
    id: number;
    productName: string;
    variantName: string | null;
    unitPrice: number;
    quantity: number;
  }[];
};

export type AdminOrdersPage = {
  orders: AdminOrder[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export class OrderReservationError extends Error {
  constructor(
    message: string,
    readonly unavailableLine?: ReservationLineInput
  ) {
    super(message);
  }
}

export type ReservationAvailability = {
  unavailableItem: string;
  isReserved: boolean;
  availableItems: string[];
};

export async function describeUnavailableReservation(
  unavailableLine: ReservationLineInput,
  lines: ReservationLineInput[]
): Promise<ReservationAvailability> {
  const product = await prisma.producto.findUnique({
    where: { id: unavailableLine.productId },
    include: { variantes: true },
  });
  const variant =
    product && unavailableLine.variantId !== null
      ? (product.variantes.find(
          (candidate) => candidate.id === unavailableLine.variantId
        ) ?? null)
      : null;
  const itemName = product
    ? `${product.nombre}${variant ? ` (${variant.valorAtributo})` : ''}`
    : 'Uno de los productos';
  const activeReservation = await prisma.itemPedido.findFirst({
    where: {
      productoId: unavailableLine.productId,
      varianteId: unavailableLine.variantId,
      pedido: { estado: 'PENDIENTE', expiraEn: { gt: new Date() } },
    },
    select: { id: true },
  });
  const availableNames: string[] = [];
  for (const line of lines) {
    if (
      line.productId === unavailableLine.productId &&
      line.variantId === unavailableLine.variantId
    )
      continue;

    const otherProduct = await prisma.producto.findUnique({
      where: { id: line.productId },
      include: { variantes: true },
    });
    if (!otherProduct) continue;

    if (otherProduct.variantes.length > 0) {
      const otherVariant =
        line.variantId === null
          ? null
          : (otherProduct.variantes.find(
              (candidate) => candidate.id === line.variantId
            ) ?? null);
      if (otherVariant && otherVariant.stock >= line.quantity)
        availableNames.push(
          `${otherProduct.nombre} (${otherVariant.valorAtributo})`
        );
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
    isReserved: Boolean(activeReservation),
    availableItems: [...new Set(availableNames)],
  };
}

export async function expirePendingOrders(now = new Date()) {
  const expiredOrders = await prisma.pedido.findMany({
    where: { estado: 'PENDIENTE', expiraEn: { lte: now } },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  let expiredCount = 0;
  for (const { id } of expiredOrders) {
    const didExpire = await prisma.$transaction(async (transaction) => {
      const result = await transaction.pedido.updateMany({
        where: { id, estado: 'PENDIENTE', expiraEn: { lte: now } },
        data: { estado: 'EXPIRADO' },
      });
      if (result.count === 0) return false;

      const items = await transaction.itemPedido.findMany({
        where: { pedidoId: id },
      });
      for (const item of items) {
        if (item.varianteId !== null) {
          await transaction.variante.updateMany({
            where: { id: item.varianteId, productoId: item.productoId },
            data: { stock: { increment: item.cantidad } },
          });
        } else {
          await transaction.producto.updateMany({
            where: { id: item.productoId },
            data: { stockGeneral: { increment: item.cantidad } },
          });
        }
      }
      return true;
    });

    if (didExpire) expiredCount += 1;
  }

  return expiredCount;
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
  if (!lines.length || lines.length > 50)
    throw new OrderReservationError('El pedido no contiene productos válidos.');
  if (!['pickup', 'moto', 'correo'].includes(deliveryMethod))
    throw new OrderReservationError('El método de entrega no es válido.');
  if (!deliveryDetails.trim() || deliveryDetails.length > 1000)
    throw new OrderReservationError('Revisá los datos de entrega.');

  const expiresAt = new Date(
    Date.now() + ORDER_RESERVATION_HOURS * millisecondsPerHour
  );

  return prisma.$transaction(async (transaction) => {
    let total = 0;
    const orderItems: {
      productoId: number;
      varianteId: number | null;
      nombreProducto: string;
      nombreVariante: string | null;
      precioUnitario: number;
      cantidad: number;
    }[] = [];

    for (const line of lines) {
      if (
        !Number.isInteger(line.productId) ||
        line.productId < 1 ||
        !Number.isInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 100
      )
        throw new OrderReservationError('Hay una cantidad de producto inválida.');

      const product = await transaction.producto.findUnique({
        where: { id: line.productId },
        include: { variantes: true },
      });
      if (!product)
        throw new OrderReservationError(
          'Uno de los productos del pedido ya no está disponible.'
        );

      let variant = null;
      let unitPrice = Number(product.precioBase);
      if (product.variantes.length > 0) {
        if (line.variantId === null)
          throw new OrderReservationError(
            `Elegí una variante para ${product.nombre}.`
          );
        variant =
          product.variantes.find(
            (candidate) => candidate.id === line.variantId
          ) ?? null;
        if (!variant)
          throw new OrderReservationError(
            `La variante elegida de ${product.nombre} ya no está disponible.`
          );
        const reserved = await transaction.variante.updateMany({
          where: {
            id: variant.id,
            productoId: product.id,
            stock: { gte: line.quantity },
          },
          data: { stock: { decrement: line.quantity } },
        });
        if (reserved.count === 0)
          throw new OrderReservationError(
            `No hay stock suficiente de ${product.nombre} (${variant.valorAtributo}).`,
            line
          );
        unitPrice =
          variant.precioModificador === null
            ? unitPrice
            : Number(variant.precioModificador);
      } else {
        if (line.variantId !== null)
          throw new OrderReservationError(
            `La variante elegida de ${product.nombre} ya no está disponible.`
          );
        const reserved = await transaction.producto.updateMany({
          where: {
            id: product.id,
            stockGeneral: { gte: line.quantity },
          },
          data: { stockGeneral: { decrement: line.quantity } },
        });
        if (reserved.count === 0)
          throw new OrderReservationError(
            `No hay stock suficiente de ${product.nombre}.`,
            line
          );
      }

      total += unitPrice * line.quantity;
      if (!Number.isFinite(total) || total > 99_999_999.99)
        throw new OrderReservationError(
          'El total del pedido supera el monto permitido.'
        );
      orderItems.push({
        productoId: product.id,
        varianteId: variant?.id ?? null,
        nombreProducto: product.nombre,
        nombreVariante: variant
          ? `${variant.nombreAtributo}: ${variant.valorAtributo}`
          : null,
        precioUnitario: unitPrice,
        cantidad: line.quantity,
      });
    }

    return transaction.pedido.create({
      data: {
        estado: 'PENDIENTE',
        total,
        metodoEntrega: deliveryMethod,
        detalleEntrega: deliveryDetails.trim(),
        expiraEn: expiresAt,
        items: { create: orderItems },
      },
      select: {
        id: true,
        expiraEn: true,
        total: true,
        items: {
          select: {
            nombreProducto: true,
            nombreVariante: true,
            precioUnitario: true,
            cantidad: true,
          },
        },
      },
    });
  });
}

export async function decideOrderReservation(
  orderId: number,
  decision: 'confirm' | 'discard'
) {
  const now = new Date();
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.pedido.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.estado !== 'PENDIENTE')
      throw new OrderReservationError(
        'El pedido ya fue procesado o no existe.'
      );

    if (decision === 'confirm' && order.expiraEn <= now)
      throw new OrderReservationError(
        'La reserva venció. El stock fue liberado; el pedido debe revisarse nuevamente.'
      );

    const nextStatus =
      decision === 'confirm' ? 'CONFIRMADO' : 'DESCARTADO';
    const updated = await transaction.pedido.updateMany({
      where: {
        id: orderId,
        estado: 'PENDIENTE',
        ...(decision === 'confirm' ? { expiraEn: { gt: now } } : {}),
      },
      data: { estado: nextStatus },
    });
    if (updated.count === 0)
      throw new OrderReservationError(
        'El pedido ya fue procesado o su reserva venció.'
      );

    if (decision === 'discard') {
      for (const item of order.items) {
        if (item.varianteId !== null) {
          await transaction.variante.updateMany({
            where: { id: item.varianteId, productoId: item.productoId },
            data: { stock: { increment: item.cantidad } },
          });
        } else {
          await transaction.producto.updateMany({
            where: { id: item.productoId },
            data: { stockGeneral: { increment: item.cantidad } },
          });
        }
      }
    }

    return nextStatus;
  });
}

export async function getAdminOrders(page = 1): Promise<AdminOrdersPage> {
  const pageSize = 20;
  const currentPage = Number.isInteger(page) && page > 0 ? page : 1;
  await expirePendingOrders();
  const total = await prisma.pedido.count();
  const pageCount = Math.ceil(total / pageSize);
  const safePage = Math.min(currentPage, Math.max(pageCount, 1));
  const orders = await prisma.pedido.findMany({
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
    include: { items: { orderBy: { id: 'asc' } } },
  });

  return {
    orders: orders.map((order) => ({
      id: order.id,
      status: order.estado,
      total: Number(order.total),
      deliveryMethod: order.metodoEntrega,
      deliveryDetails: order.detalleEntrega,
      expiresAt: order.expiraEn.toISOString(),
      createdAt: order.creadoEn.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.nombreProducto,
        variantName: item.nombreVariante,
        unitPrice: Number(item.precioUnitario),
        quantity: item.cantidad,
      })),
    })),
    page: safePage,
    pageSize,
    total,
    pageCount,
  };
}
