export type Product = {
  id: number;
  slug: string;
  name: string;
  sku: string;
  brand: string;

  image: string;
  gallery: string[];

  price: number;
  oldPrice?: number;
  pixPrice: number;

  stock: number;

  rating: number;
  reviews: number;

  installmentText: string;

  badge?: string;

  technical?: {
    label: string;
    value: string;
  }[];
};