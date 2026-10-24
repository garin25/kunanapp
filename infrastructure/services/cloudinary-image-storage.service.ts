import 'server-only';
import { createHash } from 'node:crypto';
import type {
  IImageStorageService,
  UploadedImageResult,
} from '@/core/domain/repositories/image-storage.service.interface';

export class CloudinaryImageStorageService implements IImageStorageService {
  private get credentials() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Faltan configurar las variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.'
      );
    }
    return { cloudName, apiKey, apiSecret };
  }

  private sign(params: Record<string, string>, secret: string): string {
    const serialized = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return createHash('sha1').update(`${serialized}${secret}`).digest('hex');
  }

  async uploadImage(file: File, folder: string, label = 'la imagen'): Promise<UploadedImageResult> {
    const { cloudName, apiKey, apiSecret } = this.credentials;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const publicId = crypto.randomUUID();

    const parameters = { folder, public_id: publicId, timestamp };
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
    formData.append('public_id', publicId);
    formData.append('signature', this.sign(parameters, apiSecret));

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
      { method: 'POST', body: formData }
    );

    const result: unknown = await response.json();
    if (!response.ok || !result || typeof result !== 'object') {
      throw new Error(`Cloudinary no pudo guardar ${label}.`);
    }

    const data = result as Record<string, unknown>;
    if (typeof data.secure_url !== 'string' || typeof data.public_id !== 'string') {
      throw new Error(`Cloudinary devolvió una respuesta inválida para ${label}.`);
    }

    return {
      imageUrl: data.secure_url,
      imagePublicId: data.public_id,
    };
  }

  async deleteImage(publicId: string): Promise<void> {
    const { cloudName, apiKey, apiSecret } = this.credentials;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const parameters = { public_id: publicId, timestamp };

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', this.sign(parameters, apiSecret));

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`,
      { method: 'POST', body: formData }
    );

    const result: unknown = await response.json();
    if (!response.ok || !result || typeof result !== 'object') {
      throw new Error('Cloudinary no pudo eliminar la imagen solicitada.');
    }
  }

  async deleteImages(publicIds: string[]): Promise<void> {
    await Promise.allSettled(publicIds.map((id) => this.deleteImage(id)));
  }
}
