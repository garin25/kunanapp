import { z } from 'zod';

export const productVariantInputSchema = z.object({
  attribute: z.string().trim().min(1, 'El atributo de variante es requerido.').max(100),
  value: z.string().trim().min(1, 'El valor de variante es requerido.').max(100),
  stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo.').max(2147483647),
  price: z.coerce.number().min(0).max(99999999.99).nullable().optional(),
});

export const saveProductInputSchema = z.object({
  id: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(255),
  description: z.string().trim().max(5000).optional().default(''),
  category: z.string().trim().max(100).optional().nullable(),
  brand: z.string().trim().max(100).optional().nullable(),
  price: z.coerce.number().min(0, 'El precio debe ser un número no negativo.').max(99999999.99),
  stockGeneral: z.coerce.number().int().min(0).max(2147483647).optional().nullable(),
  variants: z.array(productVariantInputSchema).max(50).default([]),
  removedGalleryIds: z.array(z.number().int().positive()).default([]),
});

export const productBadgeItemSchema = z.object({
  id: z.number().int().positive(),
  badge: z.string().trim().max(50).nullable().optional(),
  showInLanding: z.boolean().default(true),
  badgeColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color hex inválido')
    .nullable()
    .optional(),
});

export const saveProductBadgesSchema = z.array(productBadgeItemSchema).max(1000);

export const saveTaxonomySchema = z.object({
  brands: z.array(z.string().trim().min(1).max(100)).max(200),
  categories: z.array(z.string().trim().min(1).max(100)).max(200),
});

export type ProductVariantInputDTO = z.infer<typeof productVariantInputSchema>;
export type SaveProductInputDTO = z.infer<typeof saveProductInputSchema>;
export type ProductBadgeItemDTO = z.infer<typeof productBadgeItemSchema>;
export type SaveTaxonomyDTO = z.infer<typeof saveTaxonomySchema>;
