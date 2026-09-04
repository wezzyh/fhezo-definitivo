export type HomeCategory = {
  id: number;
  name: string;
  slug: string;
  image: string;
};

export const homeCategories: HomeCategory[] = [
  {
    id: 1,
    name: "Rolamentos",
    slug: "rolamentos",
    image: "/assets/categories/rolamentos.png",
  },
  {
    id: 2,
    name: "Mancais",
    slug: "mancais",
    image: "/assets/categories/mancais.png",
  },
  {
    id: 3,
    name: "Correntes",
    slug: "correntes",
    image: "/assets/categories/correntes.png",
  },
  {
    id: 4,
    name: "Engrenagens",
    slug: "engrenagens",
    image: "/assets/categories/engrenagens.png",
  },
  {
    id: 5,
    name: "Movimentação Linear",
    slug: "movimentacao-linear",
    image: "/assets/categories/movimentacao-linear.png",
  },
  {
    id: 6,
    name: "Acoplamentos",
    slug: "acoplamentos",
    image: "/assets/categories/acoplamentos.png",
  },
  {
    id: 7,
    name: "Vedações",
    slug: "vedacoes",
    image: "/assets/categories/vedacoes.png",
  },
  {
    id: 8,
    name: "Químicos",
    slug: "quimicos",
    image: "/assets/categories/quimicos.png",
  },
  {
    id: 9,
    name: "Ferramentas",
    slug: "ferramentas",
    image: "/assets/categories/ferramentas.png",
  },
];