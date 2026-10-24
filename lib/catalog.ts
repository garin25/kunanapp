import 'server-only';

import { prisma } from '@/lib/prisma';
import type { HeroSlide, Product } from '@/components/store-data';
import type { AdminProduct } from '@/lib/admin-types';

const categoryLabels: Record<string, string> = {
  'UÑAS Y PESTAÑAS': 'Uñas y pestañas',
  PERFUME: 'Perfumes',
  'KITS Y SETS': 'Kits',
};

export function formatCategoryName(name: string) {
  return (
    categoryLabels[name.toLocaleUpperCase('es-AR')] ??
    name
      .toLocaleLowerCase('es-AR')
      .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-AR'))
  );
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const rows = await prisma.$queryRaw<
    {
      id: number;
      title: string;
      description: string;
      image: string;
      imagePublicId: string;
      tone: string;
      sortOrder: number;
    }[]
  >`
    SELECT
      id,
      title,
      description,
      image_url AS "image",
      image_public_id AS "imagePublicId",
      tone,
      sort_order AS "sortOrder"
    FROM hero_slides
    ORDER BY sort_order ASC, id ASC
  `;
  return rows;
}

export async function getCatalogData() {
  const [rows, categoryRows, brandRows] = await Promise.all([
    prisma.producto.findMany({
      include: {
        categoria: true,
        marca: true,
        imagenesSecundarias: { orderBy: { id: 'asc' } },
        variantes: { orderBy: { id: 'asc' } },
      },
      orderBy: { id: 'asc' },
    }),
    prisma.categoria.findMany({ orderBy: { id: 'asc' } }),
    prisma.marca.findMany({ orderBy: { id: 'asc' } }),
  ]);

  const products: Product[] = rows.map((row) => {
    const variantImages = row.variantes.flatMap((variant) =>
      variant.imagenUrl ? [variant.imagenUrl] : []
    );
    const image =
      row.imagenPrincipalUrl ||
      row.imagenesSecundarias[0]?.imagenUrl ||
      '/placeholder.svg';
    const stock =
      row.stockGeneral ??
      row.variantes.reduce((total, variant) => total + variant.stock, 0);

    return {
      id: row.id,
      name: row.nombre,
      price: Number(row.precioBase),
      category: row.categoria ? [formatCategoryName(row.categoria.nombre)] : [],
      brand: row.marca?.nombre.toLocaleUpperCase('es-AR') ?? 'Sin marca',
      tone: 'from-[#f3e5d8] via-[#e5c9b5] to-[#a98770]',
      label: row.nombre.slice(0, 2).toLocaleUpperCase('es-AR'),
      image,
      description: row.descripcion ?? undefined,
      badge: row.destacadoTipo ?? undefined,
      showInLanding: row.mostrarEnLanding,
      badgeColor: row.destacadoColor ?? undefined,
      stock,
      variants: row.variantes.map((variant) => ({
        id: variant.id,
        attribute: variant.nombreAtributo,
        value: variant.valorAtributo,
        stock: variant.stock,
        price:
          variant.precioModificador === null
            ? null
            : Number(variant.precioModificador),
        image: variant.imagenUrl,
      })),
      gallery: [
        ...new Set([
          image,
          ...row.imagenesSecundarias.map(({ imagenUrl }) => imagenUrl),
          ...variantImages,
        ]),
      ],
    };
  });

  return {
    products,
    categories: categoryRows.map(({ nombre }) => formatCategoryName(nombre)),
    brands: brandRows.map(({ nombre }) => nombre.toLocaleUpperCase('es-AR')),
  };
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const rows = await prisma.producto.findMany({
    include: {
      categoria: true,
      marca: true,
      imagenesSecundarias: { orderBy: { id: 'asc' } },
      variantes: { orderBy: { id: 'asc' } },
    },
    orderBy: { id: 'asc' },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.nombre,
    category: row.categoria?.nombre ?? '',
    brand: row.marca?.nombre.toLocaleUpperCase('es-AR') ?? '',
    price: Number(row.precioBase),
    stock:
      row.stockGeneral ??
      row.variantes.reduce((total, variant) => total + variant.stock, 0),
    image:
      row.imagenPrincipalUrl ||
      row.imagenesSecundarias[0]?.imagenUrl ||
      '/placeholder.svg',
    stockGeneral: row.stockGeneral,
    description: row.descripcion ?? '',
    imageUrl: row.imagenPrincipalUrl ?? '',
    badge: row.destacadoTipo,
    showInLanding: row.mostrarEnLanding,
    badgeColor: row.destacadoColor,
    gallery: row.imagenesSecundarias.map(({ id, imagenUrl }) => ({
      id,
      imageUrl: imagenUrl,
    })),
    variants: row.variantes.map((variant) => ({
      attribute: variant.nombreAtributo,
      value: variant.valorAtributo,
      stock: variant.stock,
      price:
        variant.precioModificador === null
          ? null
          : Number(variant.precioModificador),
      image: variant.imagenUrl ?? '',
    })),
  }));
}
