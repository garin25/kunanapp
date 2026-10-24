'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { PrismaHeroSlideRepository } from '@/infrastructure/database/repositories/prisma-hero-slide.repository';
import { CloudinaryImageStorageService } from '@/infrastructure/services/cloudinary-image-storage.service';
import { SaveHeroSlideUseCase } from '@/core/application/use-cases/hero-slides/save-hero-slide.use-case';
import { reorderHeroSlidesSchema, type SaveHeroSlideDTO } from '@/core/application/dtos/hero-slide.dto';
import { AdminSessionService } from '@/infrastructure/services/admin-session.service';

const heroRepository = new PrismaHeroSlideRepository();
const imageStorage = new CloudinaryImageStorageService();
const saveHeroSlideUseCase = new SaveHeroSlideUseCase(heroRepository, imageStorage);

export type HeroSlideInput = {
  id: number | null;
  title: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  tone: string;
};

export async function saveHeroSlide(input: HeroSlideInput) {
  await AdminSessionService.requireAdmin();
  try {
    const result = await saveHeroSlideUseCase.execute(input);
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true as const, ...result };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(error.errors[0]?.message ?? 'Datos de slide inválidos.');
    }
    const message = error instanceof Error ? error.message : 'No se pudo guardar el slide.';
    throw new Error(message);
  }
}

export async function deleteHeroSlide(id: number) {
  await AdminSessionService.requireAdmin();
  try {
    const slide = await heroRepository.findById(id);
    if (!slide) throw new Error('El slide ya no existe.');

    await heroRepository.delete(id);
    await imageStorage.deleteImage(slide.imagePublicId).catch((err) => {
      console.error('[deleteHeroSlide] Falló eliminar imagen de Cloudinary:', err);
    });

    revalidatePath('/');
    revalidatePath('/admin');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el slide.';
    throw new Error(message);
  }
}

export async function reorderHeroSlides(orderedIds: number[]) {
  await AdminSessionService.requireAdmin();
  try {
    const validIds = reorderHeroSlidesSchema.parse(orderedIds);
    await heroRepository.updateSortOrders(validIds);
    revalidatePath('/');
    revalidatePath('/admin');
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error('El orden de slides no es válido.');
    }
    throw new Error('No se pudo reordenar el carrusel.');
  }
}

export const saveHeroSlideAction = saveHeroSlide;
export const deleteHeroSlideAction = deleteHeroSlide;
export const reorderHeroSlidesAction = reorderHeroSlides;
