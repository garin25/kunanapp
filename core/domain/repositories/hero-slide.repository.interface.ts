import type { HeroSlide } from '../entities/hero-slide.entity';

export interface CreateHeroSlideData {
  title: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  tone: string;
}

export interface UpdateHeroSlideData {
  title?: string;
  description?: string;
  imageUrl?: string;
  imagePublicId?: string;
  tone?: string;
  sortOrder?: number;
}

export interface IHeroSlideRepository {
  getAllSorted(): Promise<HeroSlide[]>;
  findById(id: number): Promise<HeroSlide | null>;
  create(data: CreateHeroSlideData): Promise<HeroSlide>;
  update(id: number, data: UpdateHeroSlideData): Promise<HeroSlide>;
  delete(id: number): Promise<void>;
  updateSortOrders(orderedIds: number[]): Promise<void>;
}
