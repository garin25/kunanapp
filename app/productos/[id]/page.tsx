import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Storefront } from '@/components/storefront';
import { getCatalogData, getHeroSlides } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

async function findProduct(id: string) {
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId < 1) return null;
  const { products } = await getCatalogData();
  return products.find((product) => product.id === productId) ?? null;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await findProduct(id);
  if (!product) return { title: 'Producto no encontrado' };

  const description =
    product.description?.trim() ||
    `${product.name}${product.brand ? ` de ${product.brand}` : ''}. Descubrilo en Kunan.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/productos/${product.id}` },
    openGraph: {
      type: 'website',
      title: `${product.name} | Kunan`,
      description,
      url: `/productos/${product.id}`,
      images: product.image ? [{ url: product.image, alt: product.name }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | Kunan`,
      description,
      images: product.image ? [product.image] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const [{ id }, { products, categories, brands }, heroSlides] =
    await Promise.all([params, getCatalogData(), getHeroSlides()]);
  const product = products.find((item) => item.id === Number(id));
  if (!product) notFound();

  return (
    <Storefront
      products={products}
      categories={categories}
      brands={brands}
      heroSlides={heroSlides}
      initialView="product"
      initialProductId={product.id}
    />
  );
}
