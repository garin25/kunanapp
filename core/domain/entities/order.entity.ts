export type OrderStatus = 'PENDIENTE' | 'CONFIRMADO' | 'DESCARTADO' | 'EXPIRADO';

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  variantId: number | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  total: number;
  deliveryMethod: string;
  deliveryDetails: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
}
