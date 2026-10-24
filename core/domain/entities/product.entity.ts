export interface ProductVariant {
  id: number;
  productId: number;
  attribute: string;
  value: string;
  stock: number;
  priceModifier: number | null;
  imageUrl: string | null;
}

export interface ProductSecondaryImage {
  id: number;
  productId: number;
  imageUrl: string;
}

export interface ProductCategory {
  id: number;
  nombre: string;
}

export interface ProductBrand {
  id: number;
  nombre: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  basePrice: number;
  mainImageUrl: string | null;
  generalStock: number | null;
  featuredType: string | null;
  showInLanding: boolean;
  featuredColor: string | null;
  categoryId: number | null;
  brandId: number | null;
  category?: ProductCategory | null;
  brand?: ProductBrand | null;
  variants: ProductVariant[];
  secondaryImages: ProductSecondaryImage[];
}
