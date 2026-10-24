import { Storefront } from '@/components/storefront';
import { getCatalogData, getHeroSlides } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [{ products, categories, brands }, heroSlides] = await Promise.all([
    getCatalogData(),
    getHeroSlides(),
  ]);

  return (
    <Storefront
      products={products}
      categories={categories}
      brands={brands}
      heroSlides={heroSlides}
    />
  );
}
