import { prisma } from '../prisma.client';
import type {
  IProductRepository,
  CatalogDataResult,
  AdminProductView,
  SaveProductData,
  ProductBadgeUpdateItem,
} from '@/core/domain/repositories/product.repository.interface';
import type { Product } from '@/core/domain/entities/product.entity';

const categoryLabels: Record<string, string> = {
  'UÑAS Y PESTAÑAS': 'Uñas y pestañas',
  PERFUME: 'Perfumes',
  'KITS Y SETS': 'Kits',
};

function formatCategoryName(name: string) {
  return (
    categoryLabels[name.toLocaleUpperCase('es-AR')] ??
    name
      .toLocaleLowerCase('es-AR')
      .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-AR'))
  );
}

export class PrismaProductRepository implements IProductRepository {
  async getCatalogData(): Promise<CatalogDataResult> {
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

    const products = rows.map((row) => {
      const variantImages = row.variantes.flatMap((v) => (v.imagenUrl ? [v.imagenUrl] : []));
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

  async getAdminProducts(): Promise<AdminProductView[]> {
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

  async findById(id: number): Promise<Product | null> {
    const row = await prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        marca: true,
        imagenesSecundarias: { orderBy: { id: 'asc' } },
        variantes: { orderBy: { id: 'asc' } },
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      name: row.nombre,
      description: row.descripcion,
      basePrice: Number(row.precioBase),
      mainImageUrl: row.imagenPrincipalUrl,
      generalStock: row.stockGeneral,
      featuredType: row.destacadoTipo,
      showInLanding: row.mostrarEnLanding,
      featuredColor: row.destacadoColor,
      categoryId: row.categoriaId,
      brandId: row.marcaId,
      category: row.categoria,
      brand: row.marca,
      variants: row.variantes.map((v) => ({
        id: v.id,
        productId: v.productoId,
        attribute: v.nombreAtributo,
        value: v.valorAtributo,
        stock: v.stock,
        priceModifier: v.precioModificador !== null ? Number(v.precioModificador) : null,
        imageUrl: v.imagenUrl,
      })),
      secondaryImages: row.imagenesSecundarias.map((img) => ({
        id: img.id,
        productId: img.productoId,
        imageUrl: img.imagenUrl,
      })),
    };
  }

  async saveProduct(data: SaveProductData): Promise<number> {
    const [category, brand] = await Promise.all([
      data.categoryName
        ? prisma.categoria.findUnique({ where: { nombre: data.categoryName } })
        : null,
      data.brandName
        ? prisma.marca.findFirst({
            where: { nombre: { equals: data.brandName, mode: 'insensitive' } },
          })
        : null,
    ]);

    const isNew = data.id === null;

    const baseData = {
      nombre: data.name,
      descripcion: data.description,
      precioBase: data.price,
      imagenPrincipalUrl: data.mainImageUrl,
      stockGeneral: data.stockGeneral,
      categoria: category
        ? { connect: { id: category.id } }
        : isNew
          ? undefined
          : { disconnect: true },
      marca: brand
        ? { connect: { id: brand.id } }
        : isNew
          ? undefined
          : { disconnect: true },
    };

    if (isNew) {
      const created = await prisma.producto.create({
        data: {
          ...baseData,
          imagenesSecundarias: {
            create: data.secondaryImageUrls.map((url) => ({ imagenUrl: url })),
          },
          variantes: {
            create: data.variants.map((v) => ({
              nombreAtributo: v.attribute,
              valorAtributo: v.value,
              stock: v.stock,
              precioModificador: v.priceModifier,
              imagenUrl: v.imageUrl,
            })),
          },
        },
        select: { id: true },
      });
      return created.id;
    }

    await prisma.$transaction(async (tx) => {
      await tx.producto.update({
        where: { id: data.id! },
        data: {
          ...baseData,
          imagenesSecundarias: {
            deleteMany: {},
            create: data.secondaryImageUrls.map((url) => ({ imagenUrl: url })),
          },
          variantes: {
            deleteMany: {},
            create: data.variants.map((v) => ({
              nombreAtributo: v.attribute,
              valorAtributo: v.value,
              stock: v.stock,
              precioModificador: v.priceModifier,
              imagenUrl: v.imageUrl,
            })),
          },
        },
      });
    });

    return data.id!;
  }

  async deleteProduct(id: number): Promise<void> {
    await prisma.producto.delete({ where: { id } });
  }

  async updateProductBadges(updates: ProductBadgeUpdateItem[]): Promise<void> {
    await prisma.$transaction(
      updates.map((item) =>
        prisma.producto.update({
          where: { id: item.id },
          data: {
            destacadoTipo: item.badge,
            mostrarEnLanding: item.showInLanding,
            destacadoColor: item.badgeColor,
          },
        })
      )
    );
  }

  async syncTaxonomies(brandNames: string[], categoryNames: string[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const name of brandNames) {
        const existing = await tx.marca.findFirst({
          where: { nombre: { equals: name, mode: 'insensitive' } },
        });
        if (!existing) {
          await tx.marca.create({ data: { nombre: name } });
        }
      }

      for (const name of categoryNames) {
        const existing = await tx.categoria.findUnique({ where: { nombre: name } });
        if (!existing) {
          await tx.categoria.create({ data: { nombre: name } });
        }
      }
    });
  }

  async hasPendingReservations(productId: number): Promise<boolean> {
    const reservation = await prisma.itemPedido.findFirst({
      where: {
        productoId: productId,
        pedido: { estado: 'PENDIENTE' },
      },
      select: { id: true },
    });
    return Boolean(reservation);
  }
}
