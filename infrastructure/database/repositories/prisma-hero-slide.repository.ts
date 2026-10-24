import { prisma } from '../prisma.client';
import type {
  IHeroSlideRepository,
  CreateHeroSlideData,
  UpdateHeroSlideData,
} from '@/core/domain/repositories/hero-slide.repository.interface';
import type { HeroSlide } from '@/core/domain/entities/hero-slide.entity';

export class PrismaHeroSlideRepository implements IHeroSlideRepository {
  async getAllSorted(): Promise<HeroSlide[]> {
    const rows = await prisma.heroSlide.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      imageUrl: r.imageUrl,
      imagePublicId: r.imagePublicId,
      tone: r.tone,
      sortOrder: r.sortOrder,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async findById(id: number): Promise<HeroSlide | null> {
    const row = await prisma.heroSlide.findUnique({ where: { id } });
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      imagePublicId: row.imagePublicId,
      tone: row.tone,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(data: CreateHeroSlideData): Promise<HeroSlide> {
    const aggregate = await prisma.heroSlide.aggregate({
      _max: { sortOrder: true },
    });
    const nextOrder = (aggregate._max.sortOrder ?? -1) + 1;

    const row = await prisma.heroSlide.create({
      data: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        imagePublicId: data.imagePublicId,
        tone: data.tone,
        sortOrder: nextOrder,
      },
    });

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      imagePublicId: row.imagePublicId,
      tone: row.tone,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async update(id: number, data: UpdateHeroSlideData): Promise<HeroSlide> {
    const row = await prisma.heroSlide.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(data.imagePublicId !== undefined ? { imagePublicId: data.imagePublicId } : {}),
        ...(data.tone !== undefined ? { tone: data.tone } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      imagePublicId: row.imagePublicId,
      tone: row.tone,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async delete(id: number): Promise<void> {
    await prisma.heroSlide.delete({ where: { id } });
  }

  async updateSortOrders(orderedIds: number[]): Promise<void> {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.heroSlide.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
  }
}
