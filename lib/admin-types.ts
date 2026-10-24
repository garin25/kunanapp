export type AdminProduct = {
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
};
