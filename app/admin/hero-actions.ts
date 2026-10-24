'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

import { PrismaHeroSlideRepository } from '@/infrastructure/database/repositories/prisma-hero-slide.repository';
import { CloudinaryImageStorageService } from '@/infrastructure/services/cloudinary-image-storage.service';
import { SaveHeroSlideUseCase } from '@/core/application/use-cases/hero-slides/save-hero-slide.use-case';
import { reorderHeroSlidesSchema } from '@/core/application/dtos/hero-slide.dto';
import { AdminSessionService } from '@/infrastructure/services/admin-session.service';
import { EntityNotFoundError } from '@/core/domain/errors/domain.error';

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
    throw new Error(error instanceof Error ? error.message : 'No se pudo guardar el slide.');
  }
}

export async function deleteHeroSlide(id: number) {
  await AdminSessionService.requireAdmin();
  const slide = await heroRepository.findById(id);
  if (!slide) throw new Error('El slide ya no existe.');

  await heroRepository.delete(id);
  await imageStorage.deleteImage(slide.imagePublicId).catch((err) => {
    console.error('[deleteHeroSlide] Error eliminando imagen de Cloudinary:', err);
  });

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function reorderHeroSlides(orderedIds: number[]) {
  await AdminSessionService.requireAdmin();
  try {
    const validIds = reorderHeroSlidesSchema.parse(orderedIds);
    await heroRepository.updateSortOrders(validIds);
    revalidatePath('/');
    revalidatePath('/admin');
  } catch (error) {
    if (error instanceof ZodError) throw new Error('El orden de slides no es válido.');
    throw new Error('No se pudo reordenar el carrusel.');
  }
}
