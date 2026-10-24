'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { PrismaProductRepository } from '@/infrastructure/database/repositories/prisma-product.repository';
import { CloudinaryImageStorageService } from '@/infrastructure/services/cloudinary-image-storage.service';
import { SaveProductUseCase } from '@/core/application/use-cases/products/save-product.use-case';
import { DeleteProductUseCase } from '@/core/application/use-cases/products/delete-product.use-case';
import { AdminSessionService } from '@/infrastructure/services/admin-session.service';
import { ValidationError } from '@/core/domain/errors/domain.error';
import {
  saveProductBadgesSchema,
  saveTaxonomySchema,
} from '@/core/application/dtos/product.dto';

const productRepository = new PrismaProductRepository();
const imageStorage = new CloudinaryImageStorageService();
const saveProductUseCase = new SaveProductUseCase(productRepository, imageStorage);
const deleteProductUseCase = new DeleteProductUseCase(productRepository);

export type ActionState = {
  error?: string;
  success?: boolean;
};

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function loginAdmin(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Completá tu email y contraseña.' };
  if (!AdminSessionService.verifyCredentials(email, password)) {
    return { error: 'El email o la contraseña son incorrectos.' };
  }
  await AdminSessionService.createSession();
  redirect('/admin');
}

export async function logoutAdmin(): Promise<never> {
  await AdminSessionService.clearSession();
  redirect('/admin/login');
}

// ─── Products ────────────────────────────────────────────────────────────────

async function persistProduct(
  id: number | null,
  formData: FormData
): Promise<ActionState> {
  await AdminSessionService.requireAdmin();
  try {
    const mainImageFile = formData.get('mainImageFile');
    const galleryFiles = formData
      .getAll('galleryFiles')
      .filter((f): f is File => f instanceof File && f.size > 0);

    let parsedVariants: unknown = [];
    try {
      parsedVariants = JSON.parse(String(formData.get('variants') ?? '[]'));
    } catch {
      return { error: 'Formato de variantes inválido.' };
    }

    let removedGalleryIds: number[] = [];
    try {
      removedGalleryIds = JSON.parse(String(formData.get('removedGalleryIds') ?? '[]'));
    } catch {
      return { error: 'IDs de galería inválidos.' };
    }

    const variantFiles: (File | null)[] = Array.isArray(parsedVariants)
      ? parsedVariants.map((_, index) => {
          const f = formData.get(`variantImage-${index}`);
          return f instanceof File && f.size > 0 ? f : null;
        })
      : [];

    const rawInput = {
      id,
      name: String(formData.get('name') ?? '').trim(),
      description: String(formData.get('description') ?? '').trim(),
      category: String(formData.get('category') ?? '').trim() || null,
      brand: String(formData.get('brand') ?? '').trim() || null,
      price: Number(formData.get('price')),
      stockGeneral: formData.get('stockGeneral') ? Number(formData.get('stockGeneral')) : null,
      variants: parsedVariants,
      removedGalleryIds,
    };

    await saveProductUseCase.execute(rawInput, {
      mainImageFile: mainImageFile instanceof File && mainImageFile.size > 0 ? mainImageFile : null,
      galleryFiles,
      variantFiles,
    });

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.errors[0]?.message ?? 'Datos del producto inválidos.' };
    }
    if (error instanceof ValidationError) return { error: error.message };
    return { error: error instanceof Error ? error.message : 'Error al guardar el producto.' };
  }
}

export async function createProduct(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return persistProduct(null, formData);
}

export async function updateProduct(
  id: number,
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!Number.isInteger(id) || id < 1) {
    return { error: 'El producto seleccionado no es válido.' };
  }
  return persistProduct(id, formData);
}

export async function deleteProduct(id: number): Promise<ActionState> {
  await AdminSessionService.requireAdmin();
  try {
    await deleteProductUseCase.execute(id);
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    return { error: 'No se pudo eliminar el producto.' };
  }
}

export async function saveProductBadges(input: unknown): Promise<ActionState> {
  await AdminSessionService.requireAdmin();
  try {
    const validated = saveProductBadgesSchema.parse(input);
    await productRepository.updateProductBadges(
      validated.map((v) => ({
        id: v.id,
        badge: v.badge ?? null,
        showInLanding: v.showInLanding,
        badgeColor: v.badgeColor ?? null,
      }))
    );
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) return { error: 'El formato de destacados es inválido.' };
    return { error: 'No se pudieron guardar los destacados.' };
  }
}

export async function saveTaxonomy(input: unknown): Promise<ActionState> {
  await AdminSessionService.requireAdmin();
  try {
    const validated = saveTaxonomySchema.parse(input);
    await productRepository.syncTaxonomies(validated.brands, validated.categories);
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    if (error instanceof ZodError) return { error: 'El formato de marcas y categorías es inválido.' };
    return { error: 'No se pudieron actualizar las taxonomías.' };
  }
}
