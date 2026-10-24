export type Product = {
  id?: number;
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
  toneOptions?: string[];
  toneOutOfStock?: number[];
  toneImages?: string[];
  gallery?: string[];
  stock?: number;
  variants?: ProductVariant[];
  selectedVariant?: ProductVariant;
};

export type ProductVariant = {
  id: number;
  attribute: string;
  value: string;
  stock: number;
  price: number | null;
  image: string | null;
};

export type HeroSlide = {
  id: number;
  title: string;
  description: string;
  image: string;
  imagePublicId: string;
  tone: string;
  sortOrder: number;
};

export function productKey(product: Product) {
  return product.id === undefined
    ? `${product.name}-${product.brand}-${product.image}`
    : `product-${product.id}`;
}

export function cartItemKey(product: Product) {
  return `${productKey(product)}${product.selectedVariant ? `-variant-${product.selectedVariant.id}` : ''}`;
}

export const money = (value: number) =>
  `$${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

export const heroSlides = [
  {
    title: 'Maquillaje para cada versión de vos',
    description: 'Encontrá tus esenciales y armá tu ritual favorito.',
    tone: 'from-[#d8b4a7] via-[#bc817c] to-[#684044]',
    image: '/products/hero-beauty.png',
  },
  {
    title: 'Tu rutina empieza acá',
    description: 'Texturas, colores y detalles elegidos para mimarte.',
    tone: 'from-[#d9dfcf] via-[#aebd9b] to-[#657758]',
    image: '/products/hero-skincare.png',
  },
  {
    title: 'Pequeños detalles, gran estilo',
    description: 'Sumá ese toque especial a todos tus días.',
    tone: 'from-[#eadba9] via-[#c7a45a] to-[#72531d]',
    image: '/products/accessories.png',
  },
];
