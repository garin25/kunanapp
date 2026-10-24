import { prisma } from '../prisma.client';
import type {
  IOrderRepository,
  ProductStockInfo,
  ReservationLineInput,
  CreatedOrderResult,
  AdminOrdersPage,
} from '@/core/domain/repositories/order.repository.interface';
import type { OrderStatus } from '@/core/domain/entities/order.entity';
import { OrderReservationError } from '@/core/domain/errors/order-reservation.error';

export class PrismaOrderRepository implements IOrderRepository {
  async findProductsWithVariantsByIds(productIds: number[]): Promise<Map<number, ProductStockInfo>> {
    const uniqueIds = [...new Set(productIds)];
    const products = await prisma.producto.findMany({
      where: { id: { in: uniqueIds } },
      include: {
        variantes: {
          select: {
            id: true,
            nombreAtributo: true,
            valorAtributo: true,
            stock: true,
            precioModificador: true,
          },
        },
      },
    });

    const map = new Map<number, ProductStockInfo>();
    for (const p of products) {
      map.set(p.id, {
        id: p.id,
        nombre: p.nombre,
        precioBase: Number(p.precioBase),
        stockGeneral: p.stockGeneral,
        variantes: p.variantes.map((v) => ({
          id: v.id,
          nombreAtributo: v.nombreAtributo,
          valorAtributo: v.valorAtributo,
          stock: v.stock,
          precioModificador: v.precioModificador !== null ? Number(v.precioModificador) : null,
        })),
      });
    }
    return map;
  }

  async findProductWithVariantsById(productId: number): Promise<ProductStockInfo | null> {
    const p = await prisma.producto.findUnique({
      where: { id: productId },
      include: {
        variantes: {
          select: {
            id: true,
            nombreAtributo: true,
            valorAtributo: true,
            stock: true,
            precioModificador: true,
          },
        },
      },
    });

    if (!p) return null;

    return {
      id: p.id,
      nombre: p.nombre,
      precioBase: Number(p.precioBase),
      stockGeneral: p.stockGeneral,
      variantes: p.variantes.map((v) => ({
        id: v.id,
        nombreAtributo: v.nombreAtributo,
        valorAtributo: v.valorAtributo,
        stock: v.stock,
        precioModificador: v.precioModificador !== null ? Number(v.precioModificador) : null,
      })),
    };
  }

  async executeReservationTransaction({
    lines,
    deliveryMethod,
    deliveryDetails,
    expiresAt,
    productsMap,
  }: {
    lines: ReservationLineInput[];
    deliveryMethod: string;
    deliveryDetails: string;
    expiresAt: Date;
    productsMap: Map<number, ProductStockInfo>;
  }): Promise<CreatedOrderResult> {
    return prisma.$transaction(async (tx) => {
      let total = 0;
      const orderItemsToInsert: {
        productoId: number;
        varianteId: number | null;
        nombreProducto: string;
        nombreVariante: string | null;
        precioUnitario: number;
        cantidad: number;
      }[] = [];

      for (const line of lines) {
        const product = productsMap.get(line.productId);
        if (!product) {
          throw new OrderReservationError('Uno de los productos ya no está disponible.');
        }

        let unitPrice = product.precioBase;
        let variantInfo: { id: number; label: string } | null = null;

        if (product.variantes.length > 0) {
          if (line.variantId === null) {
            throw new OrderReservationError(`Elegí una variante para ${product.nombre}.`);
          }
          const variant = product.variantes.find((v) => v.id === line.variantId);
          if (!variant) {
            throw new OrderReservationError(`La variante elegida de ${product.nombre} no existe.`);
          }

          const updateResult = await tx.variante.updateMany({
            where: {
              id: variant.id,
              productoId: product.id,
              stock: { gte: line.quantity },
            },
            data: { stock: { decrement: line.quantity } },
          });

          if (updateResult.count === 0) {
            throw new OrderReservationError(
              `No hay stock suficiente de ${product.nombre} (${variant.valorAtributo}).`,
              line
            );
          }

          unitPrice = variant.precioModificador !== null ? variant.precioModificador : unitPrice;
          variantInfo = {
            id: variant.id,
            label: `${variant.nombreAtributo}: ${variant.valorAtributo}`,
          };
        } else {
          if (line.variantId !== null) {
            throw new OrderReservationError(`La variante elegida de ${product.nombre} ya no está disponible.`);
          }

          const updateResult = await tx.producto.updateMany({
            where: {
              id: product.id,
              stockGeneral: { gte: line.quantity },
            },
            data: { stockGeneral: { decrement: line.quantity } },
          });

          if (updateResult.count === 0) {
            throw new OrderReservationError(`No hay stock suficiente de ${product.nombre}.`, line);
          }
        }

        total += unitPrice * line.quantity;
        if (!Number.isFinite(total) || total > 99_999_999.99) {
          throw new OrderReservationError('El total del pedido supera el monto permitido.');
        }

        orderItemsToInsert.push({
          productoId: product.id,
          varianteId: variantInfo?.id ?? null,
          nombreProducto: product.nombre,
          nombreVariante: variantInfo?.label ?? null,
          precioUnitario: unitPrice,
          cantidad: line.quantity,
        });
      }

      const createdOrder = await tx.pedido.create({
        data: {
          estado: 'PENDIENTE',
          total,
          metodoEntrega: deliveryMethod,
          detalleEntrega: deliveryDetails,
          expiraEn: expiresAt,
          items: { create: orderItemsToInsert },
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

      return {
        id: createdOrder.id,
        expiraEn: createdOrder.expiraEn,
        total: Number(createdOrder.total),
        items: createdOrder.items.map((i) => ({
          ...i,
          precioUnitario: Number(i.precioUnitario),
        })),
      };
    });
  }

  async hasActiveReservation(productId: number, variantId?: number | null): Promise<boolean> {
    const reservation = await prisma.itemPedido.findFirst({
      where: {
        productoId: productId,
        ...(variantId !== undefined ? { varianteId: variantId } : {}),
        pedido: { estado: 'PENDIENTE', expiraEn: { gt: new Date() } },
      },
      select: { id: true },
    });
    return Boolean(reservation);
  }

  async expireOrders(cutoffDate = new Date()): Promise<number> {
    const expiredOrders = await prisma.pedido.findMany({
      where: { estado: 'PENDIENTE', expiraEn: { lte: cutoffDate } },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    let expiredCount = 0;
    for (const { id } of expiredOrders) {
      const didExpire = await prisma.$transaction(async (tx) => {
        const update = await tx.pedido.updateMany({
          where: { id, estado: 'PENDIENTE', expiraEn: { lte: cutoffDate } },
          data: { estado: 'EXPIRADO' },
        });
        if (update.count === 0) return false;

        const items = await tx.itemPedido.findMany({ where: { pedidoId: id } });
        for (const item of items) {
          if (item.varianteId !== null) {
            await tx.variante.updateMany({
              where: { id: item.varianteId, productoId: item.productoId },
              data: { stock: { increment: item.cantidad } },
            });
          } else {
            await tx.producto.updateMany({
              where: { id: item.productoId },
              data: { stockGeneral: { increment: item.cantidad } },
            });
          }
        }
        return true;
      });

      if (didExpire) expiredCount++;
    }

    return expiredCount;
  }

  async decideOrder(orderId: number, decision: 'confirm' | 'discard'): Promise<OrderStatus> {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const order = await tx.pedido.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order || order.estado !== 'PENDIENTE') {
        throw new OrderReservationError('El pedido ya fue procesado o no existe.');
      }

      if (decision === 'confirm' && order.expiraEn <= now) {
        throw new OrderReservationError(
          'La reserva venció. El stock fue liberado; el pedido debe revisarse nuevamente.'
        );
      }

      const nextStatus: OrderStatus = decision === 'confirm' ? 'CONFIRMADO' : 'DESCARTADO';
      const updated = await tx.pedido.updateMany({
        where: {
          id: orderId,
          estado: 'PENDIENTE',
          ...(decision === 'confirm' ? { expiraEn: { gt: now } } : {}),
        },
        data: { estado: nextStatus },
      });

      if (updated.count === 0) {
        throw new OrderReservationError('El pedido ya fue procesado o su reserva venció.');
      }

      if (decision === 'discard') {
        for (const item of order.items) {
          if (item.varianteId !== null) {
            await tx.variante.updateMany({
              where: { id: item.varianteId, productoId: item.productoId },
              data: { stock: { increment: item.cantidad } },
            });
          } else {
            await tx.producto.updateMany({
              where: { id: item.productoId },
              data: { stockGeneral: { increment: item.cantidad } },
            });
          }
        }
      }

      return nextStatus;
    });
  }

  async getAdminOrdersPage(page: number, pageSize = 20): Promise<AdminOrdersPage> {
    const total = await prisma.pedido.count();
    const pageCount = Math.ceil(total / pageSize);
    const safePage = Math.min(page, Math.max(pageCount, 1));

    const orders = await prisma.pedido.findMany({
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
      include: { items: { orderBy: { id: 'asc' } } },
    });

    return {
      orders: orders.map((order) => ({
        id: order.id,
        status: order.estado as OrderStatus,
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
}
