import type { IProductRepository } from '@/core/domain/repositories/product.repository.interface';
import { ValidationError } from '@/core/domain/errors/domain.error';

export class DeleteProductUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(productId: number): Promise<void> {
    if (!Number.isInteger(productId) || productId < 1) {
      throw new ValidationError('El ID del producto seleccionado no es válido.');
    }

    const hasReservations = await this.productRepository.hasPendingReservations(productId);
    if (hasReservations) {
      throw new ValidationError(
        'No se puede eliminar este producto mientras tenga pedidos reservados pendientes de confirmar o vencer.'
      );
    }

    await this.productRepository.deleteProduct(productId);
  }
}
