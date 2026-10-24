'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  clearAdminSession,
  createAdminSession,
  requireAdmin,
  verifyAdminCredentials,
} from '@/lib/admin-auth';
import { deleteCloudinaryImage, uploadProductImage } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';
import { expirePendingOrders } from '@/lib/order-reservations';

export type ActionState = {
  error?: string;
  success?: boolean;
};

class InputError extends Error {}

export async function loginAdmin(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Completá tu email y contraseña.' };
  if (!verifyAdminCredentials(email, password))
    return { error: 'El email o la contraseña son incorrectos.' };

  await createAdminSession();
  redirect('/admin');
}

export async function logoutAdmin() {
  await clearAdminSession();
  redirect('/admin/login');
}

function textValue(
  formData: FormData,
  key: string,
  label: string,
  maxLength: number,
  optional = false
) {
  const value = String(formData.get(key) ?? '').trim();
  if (!value && optional) return null;
  if (!value || value.length > maxLength)
    throw new InputError(
      `${label} es obligatorio y admite hasta ${maxLength} caracteres.`
    );
  return value;
}

const maxProductImageSize = 10 * 1024 * 1024;
const maxProductUploadSize = 50 * 1024 * 1024;
const maxProductGalleryImages = 20;

function uploadedFile(value: FormDataEntryValue | null, label: string) {
  if (value === null || typeof value === 'string') {
    if (value === null || value === '') return null;
    throw new InputError(`${label} debe ser un archivo de imagen.`);
  }
  if (!value.size) return null;
  if (!value.type.startsWith('image/'))
    throw new InputError(`${label} debe ser un archivo de imagen.`);
  if (value.size > maxProductImageSize)
    throw new InputError(`${label} no puede superar los 10 MB.`);
  return value;
}

async function cleanupProductImages(publicIds: string[]) {
  const results = await Promise.allSettled(
    publicIds.map((publicId) => deleteCloudinaryImage(publicId))
  );
  results.forEach((result) => {
    if (result.status === 'rejected')
      console.error(
        'No se pudo limpiar una imagen de producto subida parcialmente.',
        result.reason
      );
  });
}

async function cleanupUnfinishedProduct(productId: number) {
  try {
    await prisma.producto.delete({ where: { id: productId } });
  } catch (error) {
    console.error(
      'No se pudo limpiar el producto después de un error al guardar sus imágenes.',
      error
    );
  }
}

function parseVariants(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new InputError('Las variantes enviadas no tienen un formato válido.');
  }
  if (!Array.isArray(parsed) || parsed.length > 50)
    throw new InputError(
      'Las variantes deben ser válidas y no superar 50 elementos.'
    );

  return parsed.map((variant) => {
    if (!variant || typeof variant !== 'object')
      throw new InputError('Hay una variante inválida.');
    const record = variant as Record<string, unknown>;
    const attribute =
      typeof record.attribute === 'string' ? record.attribute.trim() : '';
    const value = typeof record.value === 'string' ? record.value.trim() : '';
    const stockValue =
      typeof record.stock === 'string' ? record.stock.trim() : '';
    const stock = Number(stockValue);
    const priceValue =
      typeof record.price === 'string' ? record.price.trim() : '';
    const price = record.differentPrice ? Number(priceValue) : null;
    if (!attribute || attribute.length > 100 || !value || value.length > 100)
      throw new InputError(
        'Cada variante necesita atributo y valor (máximo 100 caracteres).'
      );
    if (
      !stockValue ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      stock > 2147483647
    )
      throw new InputError(
        'El stock de cada variante debe ser un entero no negativo.'
      );
    if (
      price !== null &&
      (!priceValue ||
        !/^\d+(\.\d{1,2})?$/.test(priceValue) ||
        !Number.isFinite(price) ||
        price < 0 ||
        price > 99999999.99)
    )
      throw new InputError(
      'El precio de variante debe ser un número no negativo de hasta 8 dígitos y 2 decimales.'
      );

    return {
      nombreAtributo: attribute,
      valorAtributo: value,
      stock,
      precioModificador: price,
      imagenUrl: null,
    };
  });
}

async function saveProduct(
  id: number | null,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  try {
    if (id !== null) {
      await expirePendingOrders();
      const activeReservation = await prisma.itemPedido.findFirst({
        where: {
          productoId: id,
          pedido: { estado: 'PENDIENTE' },
        },
        select: { id: true },
      });
      if (activeReservation)
        throw new InputError(
          'No se puede editar este producto mientras tenga pedidos reservados pendientes de confirmar o vencer.'
        );
    }

    const name = textValue(formData, 'name', 'El nombre', 255)!;
    const description = textValue(
      formData,
      'description',
      'La descripción',
      5000,
      true
    );
    const categoryName = textValue(
      formData,
      'category',
      'La categoría',
      100,
      true
    );
    const brandName = textValue(formData, 'brand', 'La marca', 100, true);
    const priceValue = String(formData.get('price') ?? '').trim();
    const rawPrice = Number(priceValue);
    if (
      !priceValue ||
      !/^\d+(\.\d{1,2})?$/.test(priceValue) ||
      !Number.isFinite(rawPrice) ||
      rawPrice < 0 ||
      rawPrice > 99999999.99
    )
      throw new InputError(
        'El precio debe ser un número no negativo de hasta 8 dígitos y 2 decimales.'
      );

    const mainImageFile = uploadedFile(
      formData.get('mainImageFile'),
      'La imagen principal'
    );
    const galleryFiles = formData
      .getAll('galleryFiles')
      .map((value) => {
        if (typeof value === 'string' && value === '') return null;
        return uploadedFile(value, 'Cada imagen de galería');
      })
      .filter((file): file is File => file !== null);
    let removedGalleryIds: number[] = [];
    try {
      const parsedRemovedIds: unknown = JSON.parse(
        String(formData.get('removedGalleryIds') ?? '[]')
      );
      if (
        !Array.isArray(parsedRemovedIds) ||
        !parsedRemovedIds.every(
          (value) =>
            typeof value === 'number' &&
            Number.isInteger(value) &&
            value > 0
        )
      )
        throw new Error();
      removedGalleryIds = [...new Set(parsedRemovedIds)];
    } catch {
      throw new InputError('La selección de imágenes para quitar no es válida.');
    }
    if (galleryFiles.length > maxProductGalleryImages)
      throw new InputError('La galería admite hasta 20 imágenes.');
    const parsedVariants = parseVariants(
      String(formData.get('variants') ?? '[]')
    );
    const variantFiles = parsedVariants.map((_, index) =>
      uploadedFile(
        formData.get(`variantImage-${index}`),
        `La imagen de la variante ${index + 1}`
      )
    );
    const imageFiles = [
      mainImageFile,
      ...galleryFiles,
      ...variantFiles,
    ].filter((file): file is File => file !== null);
    if (
      imageFiles.reduce((total, file) => total + file.size, 0) >
      maxProductUploadSize
    )
      throw new InputError('El total de imágenes no puede superar los 50 MB.');
    const stockValue = String(formData.get('stockGeneral') ?? '').trim();
    const stock = parsedVariants.length ? null : Number(stockValue);
    if (
      !parsedVariants.length &&
      (!stockValue ||
        !Number.isInteger(stock) ||
        stock! < 0 ||
        stock! > 2147483647)
    )
      throw new InputError('El stock general debe ser un entero no negativo.');

    const [category, brand] = await Promise.all([
      categoryName
        ? prisma.categoria.findUnique({ where: { nombre: categoryName } })
        : null,
      brandName
        ? prisma.marca.findFirst({
            where: { nombre: { equals: brandName, mode: 'insensitive' } },
          })
        : null,
    ]);
    if (categoryName && !category)
      throw new InputError('La categoría seleccionada ya no existe.');
    if (brandName && !brand)
      throw new InputError('La marca seleccionada ya no existe.');

    const isNewProduct = id === null;
    const existingProduct =
      id === null
        ? null
        : await prisma.producto.findUnique({
            where: { id },
            include: { imagenesSecundarias: true, variantes: true },
          });
    if (id !== null && !existingProduct)
      throw new InputError('El producto que intentás editar ya no existe.');
    if (!mainImageFile && !existingProduct?.imagenPrincipalUrl)
      throw new InputError('Seleccioná una imagen principal del producto.');
    if (
      (existingProduct?.imagenesSecundarias.filter(
        ({ id: imageId }) => !removedGalleryIds.includes(imageId)
      ).length ?? 0) +
        galleryFiles.length >
      maxProductGalleryImages
    )
      throw new InputError(
        'La galería admite hasta 20 imágenes contando las ya guardadas.'
      );

    const productId = isNewProduct
      ? (
          await prisma.producto.create({
            data: {
              nombre: name,
              descripcion: description,
              precioBase: rawPrice,
              stockGeneral: stock,
              categoria: category ? { connect: { id: category.id } } : undefined,
              marca: brand ? { connect: { id: brand.id } } : undefined,
            },
            select: { id: true },
          })
        ).id
      : id;

    const uploadedImages = new Map<File, string>();
    const uploadedPublicIds: string[] = [];
    try {
      for (const file of imageFiles) {
        const uploaded = await uploadProductImage(file, productId);
        uploadedImages.set(file, uploaded.imageUrl);
        uploadedPublicIds.push(uploaded.imagePublicId);
      }
    } catch (error) {
      await cleanupProductImages(uploadedPublicIds);
      if (isNewProduct) await cleanupUnfinishedProduct(productId);
      throw new InputError(
        error instanceof Error
          ? error.message
          : 'No se pudo subir una imagen del producto a Cloudinary.'
      );
    }

    const savedMainImage = mainImageFile
      ? uploadedImages.get(mainImageFile)!
      : existingProduct?.imagenPrincipalUrl ?? null;
    const remainingGalleryUrls =
      existingProduct?.imagenesSecundarias
        .filter(({ id: imageId }) => !removedGalleryIds.includes(imageId))
        .map(({ imagenUrl }) => imagenUrl) ?? [];
    const savedGalleryUrls = [
      ...remainingGalleryUrls,
      ...galleryFiles.map((file) => uploadedImages.get(file)!),
    ];
    const variants = parsedVariants.map((variant, index) => ({
      ...variant,
      imagenUrl: variantFiles[index]
        ? uploadedImages.get(variantFiles[index]!)!
        : (existingProduct?.variantes.find(
            (existingVariant) =>
              existingVariant.nombreAtributo === variant.nombreAtributo &&
              existingVariant.valorAtributo === variant.valorAtributo
          )?.imagenUrl ?? null),
    }));

    const data = {
      nombre: name,
      descripcion: description,
      precioBase: rawPrice,
      imagenPrincipalUrl: savedMainImage,
      stockGeneral: stock,
      categoria: category
        ? { connect: { id: category.id } }
        : id === null
          ? undefined
          : { disconnect: true },
      marca: brand
        ? { connect: { id: brand.id } }
        : id === null
          ? undefined
          : { disconnect: true },
      imagenesSecundarias: {
        create: savedGalleryUrls.map((imagenUrl) => ({ imagenUrl })),
      },
      variantes: { create: variants },
    };

    try {
      await prisma.producto.update({
        where: { id: productId },
        data: {
          ...data,
          imagenesSecundarias: {
            deleteMany: {},
            create: savedGalleryUrls.map((imagenUrl) => ({ imagenUrl })),
          },
          variantes: { deleteMany: {}, create: variants },
        },
      });
    } catch (error) {
      await cleanupProductImages(uploadedPublicIds);
      if (isNewProduct) await cleanupUnfinishedProduct(productId);
      throw error;
    }
  } catch (error) {
    if (error instanceof InputError) return { error: error.message };
    throw error;
  }

  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true };
}

export async function createProduct(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  return saveProduct(null, formData);
}

export async function updateProduct(
  id: number,
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!Number.isInteger(id) || id < 1)
    return { error: 'El producto seleccionado no es válido.' };
  return saveProduct(id, formData);
}

export async function deleteProduct(id: number): Promise<ActionState> {
  await requireAdmin();
  if (!Number.isInteger(id) || id < 1)
    return { error: 'El producto seleccionado no es válido.' };

  await expirePendingOrders();
  const activeReservation = await prisma.itemPedido.findFirst({
    where: {
      productoId: id,
      pedido: { estado: 'PENDIENTE' },
    },
    select: { id: true },
  });
  if (activeReservation)
    return {
      error:
        'No se puede eliminar este producto mientras tenga pedidos reservados pendientes de confirmar o vencer.',
    };

  await prisma.producto.delete({ where: { id } });
  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true };
}

export async function saveProductBadges(input: unknown): Promise<ActionState> {
  await requireAdmin();
  if (!Array.isArray(input) || input.length > 1000)
    return { error: 'La lista de productos destacados no es válida.' };

  const allowedColors = [
    '#fffdf9',
    '#f4df9c',
    '#f8e2dc',
    '#e5f0e2',
    '#dce9f5',
  ];
  const entries: {
    id: number;
    badge: string;
    showInLanding: boolean;
    badgeColor: string;
  }[] = [];
  const ids = new Set<number>();

  for (const entry of input) {
    if (!entry || typeof entry !== 'object')
      return { error: 'Hay un producto destacado inválido.' };
    const record = entry as Record<string, unknown>;
    if (
      typeof record.id !== 'number' ||
      !Number.isInteger(record.id) ||
      record.id < 1 ||
      ids.has(record.id) ||
      typeof record.badge !== 'string' ||
      record.badge.trim().length > 50 ||
      typeof record.showInLanding !== 'boolean' ||
      typeof record.badgeColor !== 'string' ||
      !allowedColors.includes(record.badgeColor)
    )
      return { error: 'Hay datos de producto destacado inválidos.' };

    ids.add(record.id);
    entries.push({
      id: record.id,
      badge: record.badge.trim(),
      showInLanding: record.showInLanding,
      badgeColor: record.badgeColor,
    });
  }

  try {
    await prisma.$transaction(
      entries.map(({ id, badge, showInLanding, badgeColor }) =>
        prisma.producto.update({
          where: { id },
          data: {
            destacadoTipo: badge || null,
            mostrarEnLanding: showInLanding,
            destacadoColor: badgeColor,
          },
        })
      )
    );
  } catch (error) {
    console.error('No se pudieron guardar los productos destacados.', error);
    return {
      error:
        'No se pudieron guardar los cambios. Verificá que los productos sigan existiendo e intentá nuevamente.',
    };
  }
  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true };
}

export async function saveTaxonomy(
  kind: 'brand' | 'category',
  name: string,
  remove = false
): Promise<ActionState> {
  await requireAdmin();
  if (kind !== 'brand' && kind !== 'category')
    return { error: 'El tipo de taxonomía no es válido.' };
  if (typeof name !== 'string')
    return { error: 'El nombre de la taxonomía no es válido.' };
  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length > 100)
    return { error: 'El nombre es obligatorio y admite hasta 100 caracteres.' };

  if (kind === 'brand') {
    const value = trimmedName.toLocaleUpperCase('es-AR');
    const existing = await prisma.marca.findFirst({
      where: { nombre: { equals: value, mode: 'insensitive' } },
    });
    if (remove) {
      if (existing) await prisma.marca.delete({ where: { id: existing.id } });
    } else if (!existing) {
      await prisma.marca.create({ data: { nombre: value } });
    }
  } else {
    if (remove)
      await prisma.categoria.delete({ where: { nombre: trimmedName } });
    else
      await prisma.categoria.upsert({
        where: { nombre: trimmedName },
        update: {},
        create: { nombre: trimmedName },
      });
  }

  revalidatePath('/');
  revalidatePath('/admin');
  return { success: true };
}
