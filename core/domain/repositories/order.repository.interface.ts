import type { Order, OrderStatus } from '../entities/order.entity';

export interface ProductStockInfo {
  id: number;
  nombre: string;
  precioBase: number;
  stockGeneral: number | null;
  variantes: {
    id: number;
    nombreAtributo: string;
    valorAtributo: string;
    stock: number;
    precioModificador: number | null;
  }[];
}

export interface ReservationLineInput {
  productId: number;
  variantId: number | null;
  quantity: number;
}

export interface CreatedOrderResult {
  id: number;
  expiraEn: Date;
  total: number;
  items: {
    nombreProducto: string;
    nombreVariante: string | null;
    precioUnitario: number;
    cantidad: number;
  }[];
}

export interface AdminOrdersPage {
  orders: {
    id: number;
    status: OrderStatus;
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
  }[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface ReservationAvailability {
  unavailableItem: string;
  isReserved: boolean;
  availableItems: string[];
}

export interface IOrderRepository {
  findProductsWithVariantsByIds(productIds: number[]): Promise<Map<number, ProductStockInfo>>;
  findProductWithVariantsById(productId: number): Promise<ProductStockInfo | null>;
  executeReservationTransaction(params: {
    lines: ReservationLineInput[];
    deliveryMethod: string;
    deliveryDetails: string;
    expiresAt: Date;
    productsMap: Map<number, ProductStockInfo>;
  }): Promise<CreatedOrderResult>;
  hasActiveReservation(productId: number, variantId?: number | null): Promise<boolean>;
  expireOrders(cutoffDate?: Date): Promise<number>;
  decideOrder(orderId: number, decision: 'confirm' | 'discard'): Promise<OrderStatus>;
  getAdminOrdersPage(page: number, pageSize?: number): Promise<AdminOrdersPage>;
}
