import { z } from 'zod';

export const allowedHeroTones = [
  'from-[#d8b4a7] via-[#bc817c] to-[#684044]',
  'from-[#d9dfcf] via-[#aebd9b] to-[#657758]',
  'from-[#eadba9] via-[#c7a45a] to-[#72531d]',
] as const;

export const saveHeroSlideSchema = z.object({
  id: z.number().int().positive().nullable(),
  title: z.string().trim().min(1, 'El título es obligatorio.').max(120),
  description: z.string().trim().min(1, 'La descripción es obligatoria.').max(500),
  imageUrl: z.string().url('URL de imagen inválida.'),
  imagePublicId: z
    .string()
    .trim()
    .regex(/^(?:kunan-hero\/)?[A-Za-z0-9_-]+$/, 'Identificador de Cloudinary inválido.')
    .max(255),
  tone: z.string().refine((val) => allowedHeroTones.includes(val as (typeof allowedHeroTones)[number]), {
    message: 'Elegí uno de los tonos disponibles para el carrusel.',
  }),
});

export const reorderHeroSlidesSchema = z.array(z.number().int().positive()).min(1);

export type SaveHeroSlideDTO = z.infer<typeof saveHeroSlideSchema>;
