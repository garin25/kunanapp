'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/admin-auth';
import { deleteCloudinaryImage } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';

export type HeroSlideInput = {
  id: number | null;
  title: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  tone: string;
};

const allowedTones = new Set([
  'from-[#d8b4a7] via-[#bc817c] to-[#684044]',
  'from-[#d9dfcf] via-[#aebd9b] to-[#657758]',
  'from-[#eadba9] via-[#c7a45a] to-[#72531d]',
]);

function validateSlide(input: HeroSlideInput) {
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || title.length > 120)
    throw new Error('El título es obligatorio y admite hasta 120 caracteres.');
  if (!description || description.length > 500)
    throw new Error(
      'La descripción es obligatoria y admite hasta 500 caracteres.'
    );
  if (!allowedTones.has(input.tone)) {
    throw new Error('Elegí uno de los tonos disponibles para el carrusel.');
  }
  let imageUrl: URL;
  try {
    imageUrl = new URL(input.imageUrl);
  } catch {
    throw new Error('Subí una imagen válida de Cloudinary.');
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (
    imageUrl.protocol !== 'https:' ||
    imageUrl.hostname !== 'res.cloudinary.com' ||
    !cloudName ||
    imageUrl.pathname.split('/')[1] !== cloudName ||
    !imageUrl.pathname.includes('/image/upload/')
  ) {
    throw new Error('La imagen debe provenir de la cuenta configurada en Cloudinary.');
  }
  if (
    !/^(?:kunan-hero\/)?[A-Za-z0-9_-]+$/.test(input.imagePublicId) ||
    input.imagePublicId.length > 255
  ) {
    throw new Error('La imagen no tiene un identificador válido de Cloudinary.');
  }
  return { title, description, imageUrl: imageUrl.toString() };
}

export async function saveHeroSlide(input: HeroSlideInput) {
  await requireAdmin();
  try {
    const { title, description, imageUrl } = validateSlide(input);
    let slideId: number;
    let previousImagePublicId: string | null = null;
    if (input.id === null) {
      const [{ nextOrder }] = await prisma.$queryRaw<{ nextOrder: number }[]>`
        SELECT COALESCE(MAX(sort_order), -1) + 1 AS "nextOrder"
        FROM hero_slides
      `;
      const [created] = await prisma.$queryRaw<{ id: number }[]>`
        INSERT INTO hero_slides
          (title, description, image_url, image_public_id, tone, sort_order, updated_at)
        VALUES
          (${title}, ${description}, ${imageUrl}, ${input.imagePublicId}, ${input.tone}, ${nextOrder}, NOW())
        RETURNING id
      `;
      slideId = created.id;
    } else {
      const currentRows = await prisma.$queryRaw<{ imagePublicId: string }[]>`
        SELECT image_public_id AS "imagePublicId"
        FROM hero_slides
        WHERE id = ${input.id}
      `;
      if (!currentRows.length) throw new Error('El slide ya no existe.');
      previousImagePublicId = currentRows[0].imagePublicId;
      await prisma.$executeRaw`
        UPDATE hero_slides
        SET title = ${title},
            description = ${description},
            image_url = ${imageUrl},
            image_public_id = ${input.imagePublicId},
            tone = ${input.tone},
            updated_at = NOW()
        WHERE id = ${input.id}
      `;
      slideId = input.id;
    }
    revalidatePath('/');
    revalidatePath('/admin');
    if (
      previousImagePublicId &&
      previousImagePublicId !== input.imagePublicId
    ) {
      try {
        await deleteCloudinaryImage(previousImagePublicId);
      } catch (error) {
        console.error('No se pudo limpiar la imagen anterior del hero.', error);
        return {
          success: true as const,
          slideId,
          warning:
            'El slide se guardó, pero no se pudo eliminar la imagen anterior de Cloudinary.',
        };
      }
    }
    return { success: true as const, slideId };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el slide del carrusel.',
    };
  }
}

export async function deleteHeroSlide(id: number) {
  await requireAdmin();
  try {
    if (!Number.isSafeInteger(id) || id < 1)
      throw new Error('El slide seleccionado no es válido.');
    const rows = await prisma.$queryRaw<{ imagePublicId: string }[]>`
      DELETE FROM hero_slides
      WHERE id = ${id}
      RETURNING image_public_id AS "imagePublicId"
    `;
    if (!rows.length) throw new Error('El slide ya no existe.');
    revalidatePath('/');
    revalidatePath('/admin');
    try {
      await deleteCloudinaryImage(rows[0].imagePublicId);
    } catch (error) {
      console.error('No se pudo limpiar la imagen eliminada del hero.', error);
      return {
        success: true as const,
        warning:
          'El slide se eliminó, pero no se pudo borrar la imagen anterior de Cloudinary.',
      };
    }
    return { success: true as const };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el slide del carrusel.',
    };
  }
}

export async function reorderHeroSlides(ids: number[]) {
  await requireAdmin();
  try {
    if (
      !Array.isArray(ids) ||
      ids.length > 30 ||
      ids.some((id) => !Number.isSafeInteger(id) || id < 1) ||
      new Set(ids).size !== ids.length
    ) {
      throw new Error('El orden enviado no es válido.');
    }
    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.$queryRaw<{ id: number }[]>`
        SELECT id FROM hero_slides ORDER BY sort_order ASC, id ASC
      `;
      if (
        existing.length !== ids.length ||
        existing.some((slide) => !ids.includes(slide.id))
      ) {
        throw new Error('La lista de slides cambió. Actualizá la página.');
      }
      for (const [sortOrder, id] of ids.entries()) {
        await transaction.$executeRaw`
          UPDATE hero_slides SET sort_order = ${sortOrder}, updated_at = NOW()
          WHERE id = ${id}
        `;
      }
    });
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true as const };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo cambiar el orden de los slides.',
    };
  }
}
