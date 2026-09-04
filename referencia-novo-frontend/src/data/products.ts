import { Product } from "../types/product";

export const products: Product[] = [
  {
    id: 1,
    slug: "fita-isolante-scotch-33-preta-19mmx20m",
    name: "Fita Isolante Scotch 33+ Preta Classe A 750V 19MMX20M 3M",
    sku: "HB004482483",
    brand: "3M",

    image: "/assets/products/fita-33-preta.webp",

    gallery: [
      "/assets/products/fita-33-preta.webp",
      "/assets/products/fita-33-preta-2.webp",
      "/assets/products/fita-33-preta-3.webp",
    ],

    price: 20.99,
    oldPrice: 29.99,
    pixPrice: 18.89,

    stock: 42,

    rating: 5,
    reviews: 7,

    installmentText: "1x de R$ 23,32 sem juros",

    badge: "Mais vendidos",

    technical: [
      { label: "Marca", value: "3M" },
      { label: "Linha", value: "Scotch 33+" },
      { label: "Cor", value: "Preta" },
      { label: "Largura", value: "19 mm" },
      { label: "Comprimento", value: "20 m" },
      { label: "Classe", value: "A" },
      { label: "Tensão", value: "750 V" },
      { label: "Aplicação", value: "Isolação elétrica profissional" },
    ],
  },

  {
    id: 2,
    slug: "fita-isolante-scotch-35-azul",
    name: "Fita Isolante Scotch 35+ Azul Classe A 750V 19MMX20M 3M",
    sku: "HB004482509",
    brand: "3M",
    image: "/assets/products/fita-33-azul.webp",
    gallery: ["/assets/products/fita-33-azul.webp"],
    price: 41.39,
    pixPrice: 37.25,
    stock: 18,
    rating: 5,
    reviews: 4,
    installmentText: "1x de R$ 45,99 sem juros",
  },

  {
    id: 3,
    slug: "fita-isolante-scotch-35-vermelha",
    name: "Fita Isolante Scotch 35+ Vermelha Classe A 750V 19MMX20M 3M",
    sku: "HB004482541",
    brand: "3M",
    image: "/assets/products/fita-33-vermelha.webp",
    gallery: ["/assets/products/fita-33-vermelha.webp"],
    price: 42.29,
    pixPrice: 38.06,
    stock: 14,
    rating: 5,
    reviews: 3,
    installmentText: "1x de R$ 46,99 sem juros",
  },

  {
    id: 4,
    slug: "fita-isolante-scotch-35-amarela",
    name: "Fita Isolante Scotch 35+ Amarela Classe A 750V 19MMX20M 3M",
    sku: "HB004482491",
    brand: "3M",
    image: "/assets/products/fita-33-amarela.webp",
    gallery: ["/assets/products/fita-33-amarela.webp"],
    price: 40.49,
    pixPrice: 36.44,
    stock: 27,
    rating: 5,
    reviews: 2,
    installmentText: "1x de R$ 44,99 sem juros",
  },

  {
    id: 5,
    slug: "fita-isolante-scotch-35-violeta",
    name: "Fita Isolante Scotch 35+ Violeta Classe A 750V 19MMX20M 3M",
    sku: "H0001905191",
    brand: "3M",
    image: "/assets/products/fita-33-violeta.webp",
    gallery: ["/assets/products/fita-33-violeta.webp"],
    price: 48.59,
    pixPrice: 43.73,
    stock: 9,
    rating: 5,
    reviews: 1,
    installmentText: "1x de R$ 53,99 sem juros",
  },

  {
    id: 6,
    slug: "fita-isolante-scotch-35-marrom",
    name: "Fita Isolante Scotch 35+ Marrom Classe A 750V 19MMX20M 3M",
    sku: "HB004523971",
    brand: "3M",
    image: "/assets/products/fita-33-marrom.webp",
    gallery: ["/assets/products/fita-33-marrom.webp"],
    price: 43.19,
    pixPrice: 38.87,
    stock: 7,
    rating: 5,
    reviews: 0,
    installmentText: "1x de R$ 47,99 sem juros",
  },
];