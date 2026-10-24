import type { IHeroSlideRepository } from '@/core/domain/repositories/hero-slide.repository.interface';
import type { IImageStorageService } from '@/core/domain/repositories/image-storage.service.interface';
import {
  saveHeroSlideSchema,
  type SaveHeroSlideDTO,
} from '@/core/application/dtos/hero-slide.dto';
import { EntityNotFoundError } from '@/core/domain/errors/domain.error';

export class SaveHeroSlideUseCase {
  constructor(
    private readonly heroRepository: IHeroSlideRepository,
    private readonly imageStorage: IImageStorageService
  ) {}

  async execute(input: unknown): Promise<{ slideId: number; previousPublicId?: string }> {
    const validated: SaveHeroSlideDTO = saveHeroSlideSchema.parse(input);

    if (validated.id === null) {
      const created = await this.heroRepository.create({
        title: validated.title,
        description: validated.description,
        imageUrl: validated.imageUrl,
        imagePublicId: validated.imagePublicId,
        tone: validated.tone,
      });
      return { slideId: created.id };
    }

    const existing = await this.heroRepository.findById(validated.id);
    if (!existing) {
      throw new EntityNotFoundError('Slide de carrusel', validated.id);
    }

    const previousPublicId =
      existing.imagePublicId !== validated.imagePublicId
        ? existing.imagePublicId
        : undefined;

    await this.heroRepository.update(validated.id, {
      title: validated.title,
      description: validated.description,
      imageUrl: validated.imageUrl,
      imagePublicId: validated.imagePublicId,
      tone: validated.tone,
    });

    if (previousPublicId) {
      await this.imageStorage.deleteImage(previousPublicId).catch((error) => {
        console.error('[SaveHeroSlideUseCase] Error eliminando imagen antigua:', error);
      });
    }

    return { slideId: validated.id, previousPublicId };
  }
}
