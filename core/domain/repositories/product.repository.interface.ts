import type { Product } from '../entities/product.entity';

export interface CatalogVariant {
  id: number;
  attribute: string;
  value: string;
  stock: number;
  price: number | null;
  image: string | null;
}

export interface CatalogProductView {
  id: number;
  name: string;
  price: number;
  category: string[];
  brand: string;
  tone: string;
  label: string;
  image: string;
  description?: string;
  badge?: string;
  showInLanding?: boolean;
  badgeColor?: string;
  stock?: number;
  variants?: CatalogVariant[];
  gallery?: string[];
}

export interface AdminProductView {
  id: number;
  name: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  image: string;
  stockGeneral: number | null;
  description: string;
  imageUrl: string;
  badge: string | null;
  showInLanding: boolean;
  badgeColor: string | null;
  gallery: { id: number; imageUrl: string }[];
  variants: {
    attribute: string;
    value: string;
    stock: number;
    price: number | null;
    image: string;
  }[];
}

export interface CatalogDataResult {
  products: CatalogProductView[];
  categories: string[];
  brands: string[];
}

export interface SaveProductData {
  id: number | null;
  name: string;
  description: string | null;
  price: number;
  stockGeneral: number | null;
  categoryName: string | null;
  brandName: string | null;
  mainImageUrl: string | null;
  secondaryImageUrls: string[];
  variants: {
    attribute: string;
    value: string;
    stock: number;
    priceModifier: number | null;
    imageUrl: string | null;
  }[];
}

export interface ProductBadgeUpdateItem {
  id: number;
  badge: string | null;
  showInLanding: boolean;
  badgeColor: string | null;
}

export interface IProductRepository {
  getCatalogData(): Promise<CatalogDataResult>;
  getAdminProducts(): Promise<AdminProductView[]>;
  findById(id: number): Promise<Product | null>;
  saveProduct(data: SaveProductData): Promise<number>;
  deleteProduct(id: number): Promise<void>;
  updateProductBadges(updates: ProductBadgeUpdateItem[]): Promise<void>;
  syncTaxonomies(brandNames: string[], categoryNames: string[]): Promise<void>;
  hasPendingReservations(productId: number): Promise<boolean>;
}
