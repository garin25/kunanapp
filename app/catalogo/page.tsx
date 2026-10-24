import type { Metadata } from 'next';

import { Storefront } from '@/components/storefront';
import { getCatalogData, getHeroSlides } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catálogo de productos',
  description:
    'Explorá el catálogo de Kunan: maquillaje, skincare, perfumes, accesorios y más.',
  alternates: { canonical: '/catalogo' },
};

type CatalogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function searchParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key];
  return typeof value === 'string' ? value : '';
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const [params, [{ products, categories, brands }, heroSlides]] =
    await Promise.all([
      searchParams,
      Promise.all([getCatalogData(), getHeroSlides()]),
    ]);
  const query = searchParam(params, 'q');
  const maxPriceValue = Number(searchParam(params, 'maxPrice'));
  const maxProductPrice = Math.max(0, ...products.map(({ price }) => price));
  const requestedView = searchParam(params, 'view');
  const requestedCategory = searchParam(params, 'category');
  const requestedBrand = searchParam(params, 'brand');
  const initialView =
    requestedView === 'category' && requestedCategory
      ? 'category'
      : requestedView === 'brand' && requestedBrand
        ? 'brand'
        : 'all';

  return (
    <Storefront
      products={products}
      categories={categories}
      brands={brands}
      heroSlides={heroSlides}
      initialView={initialView}
      initialCategory={
        initialView === 'category' ? requestedCategory : undefined
      }
      initialBrand={initialView === 'brand' ? requestedBrand : undefined}
      initialCategoryFilter={
        initialView === 'category'
          ? 'Todas'
          : requestedCategory || 'Todas'
      }
      initialBrandFilter={
        initialView === 'brand' ? 'Todas' : requestedBrand || 'Todas'
      }
      initialPriceFilter={
        Number.isFinite(maxPriceValue) && maxPriceValue > 0
          ? Math.min(maxPriceValue, maxProductPrice)
          : maxProductPrice
      }
      initialSearch={query}
    />
  );
}
