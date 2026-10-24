import 'server-only';

import { PrismaProductRepository } from '@/infrastructure/database/repositories/prisma-product.repository';
import { PrismaHeroSlideRepository } from '@/infrastructure/database/repositories/prisma-hero-slide.repository';
import { formatCategoryName } from '@/presentation/lib/formatters';
import type { HeroSlide, Product } from '@/components/store-data';
import type { AdminProduct } from '@/lib/admin-types';

export { formatCategoryName };

const productRepository = new PrismaProductRepository();
const heroSlideRepository = new PrismaHeroSlideRepository();

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const slides = await heroSlideRepository.getAllSorted();
  return slides.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    image: s.imageUrl,
    imagePublicId: s.imagePublicId,
    tone: s.tone,
    sortOrder: s.sortOrder,
  }));
}

export async function getCatalogData(): Promise<{
  products: Product[];
  categories: string[];
  brands: string[];
}> {
  return productRepository.getCatalogData();
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  return productRepository.getAdminProducts();
}
