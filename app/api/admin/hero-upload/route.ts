import { NextResponse } from 'next/server';

import { isAdminAuthenticated } from '@/lib/admin-auth';
import { uploadHeroImage } from '@/lib/cloudinary';

export const runtime = 'nodejs';

const maxImageBytes = 10 * 1024 * 1024;
const allowedImageTypes = new Set([
  'image/avif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Seleccioná una imagen para subir.' },
      { status: 400 }
    );
  }
  if (!allowedImageTypes.has(file.type)) {
    return NextResponse.json(
      { error: 'Usá una imagen JPG, PNG, WebP o AVIF.' },
      { status: 400 }
    );
  }
  if (file.size === 0 || file.size > maxImageBytes) {
    return NextResponse.json(
      { error: 'La imagen debe pesar menos de 10 MB.' },
      { status: 400 }
    );
  }

  try {
    const image = await uploadHeroImage(file);
    return NextResponse.json(image);
  } catch (error) {
    console.error('No se pudo subir la imagen del hero a Cloudinary.', error);
    return NextResponse.json(
      { error: 'No se pudo subir la imagen. Revisá la configuración de Cloudinary.' },
      { status: 502 }
    );
  }
}
