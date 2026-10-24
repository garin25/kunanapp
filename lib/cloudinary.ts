import 'server-only';

import { createHash } from 'node:crypto';

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Configurá CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en el entorno del servidor.'
    );
  }
  return { cloudName, apiKey, apiSecret };
}

function signParameters(
  parameters: Record<string, string>,
  apiSecret: string
) {
  const serialized = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return createHash('sha1')
    .update(`${serialized}${apiSecret}`)
    .digest('hex');
}

async function uploadImage(file: File, folder: string, label: string) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const publicId = crypto.randomUUID();
  const parameters = { folder, public_id: publicId, timestamp };
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('folder', folder);
  formData.append('public_id', publicId);
  formData.append('signature', signParameters(parameters, apiSecret));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    { method: 'POST', body: formData }
  );
  const result: unknown = await response.json();
  if (!response.ok || !result || typeof result !== 'object') {
    throw new Error(`Cloudinary no pudo guardar ${label}.`);
  }
  const data = result as Record<string, unknown>;
  if (
    typeof data.secure_url !== 'string' ||
    typeof data.public_id !== 'string'
  ) {
    throw new Error(`Cloudinary devolvió una respuesta inválida para ${label}.`);
  }
  return { imageUrl: data.secure_url, imagePublicId: data.public_id };
}

export function uploadHeroImage(file: File) {
  return uploadImage(file, 'kunan-hero', 'la imagen del carrusel');
}

export function uploadProductImage(file: File, productId: number) {
  return uploadImage(
    file,
    `kunan-productos/${productId}`,
    'la imagen del producto'
  );
}

export async function deleteCloudinaryImage(publicId: string) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const parameters = { public_id: publicId, timestamp };
  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signParameters(parameters, apiSecret));
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`,
    { method: 'POST', body: formData }
  );
  const result: unknown = await response.json();
  if (!response.ok || !result || typeof result !== 'object') {
    throw new Error('Cloudinary no pudo eliminar la imagen del carrusel.');
  }
  const resultValue = (result as Record<string, unknown>).result;
  if (resultValue !== 'ok' && resultValue !== 'not found') {
    throw new Error('Cloudinary no confirmó la eliminación de la imagen.');
  }
}
