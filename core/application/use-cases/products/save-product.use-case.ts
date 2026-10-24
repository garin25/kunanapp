import type { IProductRepository } from '@/core/domain/repositories/product.repository.interface';
import type { IImageStorageService } from '@/core/domain/repositories/image-storage.service.interface';
import {
  saveProductInputSchema,
  type SaveProductInputDTO,
} from '@/core/application/dtos/product.dto';
import { ValidationError } from '@/core/domain/errors/domain.error';

export interface SaveProductFiles {
  mainImageFile: File | null;
  galleryFiles: File[];
  variantFiles: (File | null)[];
}

export class SaveProductUseCase {
  constructor(
    private readonly productRepository: IProductRepository,
    private readonly imageStorage: IImageStorageService
  ) {}

  async execute(input: unknown, files: SaveProductFiles): Promise<number> {
    const validated: SaveProductInputDTO = saveProductInputSchema.parse(input);

    if (validated.id) {
      const hasReservations = await this.productRepository.hasPendingReservations(validated.id);
      if (hasReservations) {
        throw new ValidationError(
          'No se puede editar este producto mientras tenga pedidos reservados pendientes de confirmar o vencer.'
        );
      }
    }

    const existing = validated.id ? await this.productRepository.findById(validated.id) : null;
    if (validated.id && !existing) {
      throw new ValidationError('El producto que intentás editar ya no existe.');
    }

    if (!files.mainImageFile && !existing?.mainImageUrl) {
      throw new ValidationError('Seleccioná una imagen principal del producto.');
    }

    const uploadedPublicIds: string[] = [];
    const uploadedUrls = new Map<File, string>();

    try {
      const folderTarget = validated.id ? `kunan-productos/${validated.id}` : 'kunan-productos/nuevos';

      // Subida de imagen principal si viene nuevo archivo
      if (files.mainImageFile) {
        const uploaded = await this.imageStorage.uploadImage(
          files.mainImageFile,
          folderTarget,
          'la imagen principal'
        );
        uploadedPublicIds.push(uploaded.imagePublicId);
        uploadedUrls.set(files.mainImageFile, uploaded.imageUrl);
      }

      // Subida de galería
      for (const galleryFile of files.galleryFiles) {
        const uploaded = await this.imageStorage.uploadImage(
          galleryFile,
          folderTarget,
          'imagen de galería'
        );
        uploadedPublicIds.push(uploaded.imagePublicId);
        uploadedUrls.set(galleryFile, uploaded.imageUrl);
      }

      // Subida de variantes
      for (const variantFile of files.variantFiles) {
        if (variantFile) {
          const uploaded = await this.imageStorage.uploadImage(
            variantFile,
            folderTarget,
            'imagen de variante'
          );
          uploadedPublicIds.push(uploaded.imagePublicId);
          uploadedUrls.set(variantFile, uploaded.imageUrl);
        }
      }

      // Componer URLs de galería manteniendo las existentes que no fueron borradas
      const remainingExistingGallery =
        existing?.secondaryImages
          .filter((img) => !validated.removedGalleryIds.includes(img.id))
          .map((img) => img.imageUrl) ?? [];

      const newGalleryUrls = files.galleryFiles
        .map((f) => uploadedUrls.get(f))
        .filter((url): url is string => Boolean(url));

      const secondaryImageUrls = [...remainingExistingGallery, ...newGalleryUrls];

      const mainImageUrl = files.mainImageFile
        ? uploadedUrls.get(files.mainImageFile) ?? null
        : existing?.mainImageUrl ?? null;

      // Componer variantes
      const mappedVariants = validated.variants.map((v, index) => {
        const fileForVariant = files.variantFiles[index];
        const newUrl = fileForVariant ? uploadedUrls.get(fileForVariant) : null;
        const existingVariantUrl =
          existing?.variants.find(
            (ev) => ev.attribute === v.attribute && ev.value === v.value
          )?.imageUrl ?? null;

        return {
          attribute: v.attribute,
          value: v.value,
          stock: v.stock,
          priceModifier: v.price ?? null,
          imageUrl: newUrl ?? existingVariantUrl,
        };
      });

      return await this.productRepository.saveProduct({
        id: validated.id ?? null,
        name: validated.name,
        description: validated.description ?? null,
        price: validated.price,
        stockGeneral: validated.variants.length > 0 ? null : (validated.stockGeneral ?? 0),
        categoryName: validated.category ?? null,
        brandName: validated.brand ?? null,
        mainImageUrl,
        secondaryImageUrls,
        variants: mappedVariants,
      });
    } catch (error) {
      if (uploadedPublicIds.length > 0) {
        await this.imageStorage.deleteImages(uploadedPublicIds).catch((cleanupError) => {
          console.error('[SaveProductUseCase] Error limpiando imágenes subidas:', cleanupError);
        });
      }
      throw error;
    }
  }
}
