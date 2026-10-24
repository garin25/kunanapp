import 'server-only';

import { CloudinaryImageStorageService } from '@/infrastructure/services/cloudinary-image-storage.service';

const storage = new CloudinaryImageStorageService();

export function uploadHeroImage(file: File) {
  return storage.uploadImage(file, 'kunan-hero', 'la imagen del carrusel');
}

export function uploadProductImage(file: File, productId: number) {
  return storage.uploadImage(
    file,
    `kunan-productos/${productId}`,
    'la imagen del producto'
  );
}

export function deleteCloudinaryImage(publicId: string) {
  return storage.deleteImage(publicId);
}
