import { DomainError } from './domain.error';

export interface UnavailableLineReference {
  productId: number;
  variantId: number | null;
  quantity: number;
}

export class OrderReservationError extends DomainError {
  constructor(
    message: string,
    readonly unavailableLine?: UnavailableLineReference
  ) {
    super(message);
    this.name = 'OrderReservationError';
  }
}
