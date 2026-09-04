export type DepartmentItem = {
  id: string;
  label: string;
  href: string;
  children?: DepartmentItem[];
};

export const departments: DepartmentItem[] = [
  {
    id: "rolamentos",
    label: "Rolamentos",
    href: "/categoria/rolamentos",
    children: [
      {
        id: "rolamentos-rigidos",
        label: "Rolamentos rígidos de esferas",
        href: "/categoria/rolamentos/rigidos-de-esferas",
        children: [
          {
            id: "6200",
            label: "Série 6200",
            href: "/categoria/rolamentos/rigidos-de-esferas/6200",
          },
          {
            id: "6300",
            label: "Série 6300",
            href: "/categoria/rolamentos/rigidos-de-esferas/6300",
          },
          {
            id: "6000",
            label: "Série 6000",
            href: "/categoria/rolamentos/rigidos-de-esferas/6000",
          },
        ],
      },
      {
        id: "rolamentos-roletes",
        label: "Rolamentos de rolos",
        href: "/categoria/rolamentos/rolos",
      },
      {
        id: "rolamentos-agulhas",
        label: "Rolamentos de agulhas",
        href: "/categoria/rolamentos/agulhas",
      },
      {
        id: "rolamentos-axiais",
        label: "Rolamentos axiais",
        href: "/categoria/rolamentos/axiais",
      },
      {
        id: "rolamentos-autocompensadores",
        label: "Autocompensadores",
        href: "/categoria/rolamentos/autocompensadores",
      },
    ],
  },

  {
    id: "mancais",
    label: "Mancais",
    href: "/categoria/mancais",
    children: [
      {
        id: "mancal-pedestal",
        label: "Mancais pedestal",
        href: "/categoria/mancais/pedestal",
      },
      {
        id: "mancal-flange",
        label: "Mancais flangeados",
        href: "/categoria/mancais/flangeados",
      },
      {
        id: "mancal-estirador",
        label: "Mancais esticadores",
        href: "/categoria/mancais/esticadores",
      },
    ],
  },

  {
    id: "correntes",
    label: "Correntes",
    href: "/categoria/correntes",
    children: [
      {
        id: "correntes-transmissao",
        label: "Correntes de transmissão",
        href: "/categoria/correntes/transmissao",
      },
      {
        id: "correntes-industriais",
        label: "Correntes industriais",
        href: "/categoria/correntes/industriais",
      },
      {
        id: "elos",
        label: "Emendas e elos",
        href: "/categoria/correntes/elos",
      },
    ],
  },

  {
    id: "engrenagens",
    label: "Engrenagens",
    href: "/categoria/engrenagens",
    children: [
      {
        id: "engrenagens-retas",
        label: "Engrenagens retas",
        href: "/categoria/engrenagens/retas",
      },
      {
        id: "engrenagens-conicas",
        label: "Engrenagens cônicas",
        href: "/categoria/engrenagens/conicas",
      },
      {
        id: "cremalheiras",
        label: "Cremalheiras",
        href: "/categoria/engrenagens/cremalheiras",
      },
    ],
  },

  {
    id: "movimentacao-linear",
    label: "Movimentação Linear",
    href: "/categoria/movimentacao-linear",
    children: [
      {
        id: "guias-lineares",
        label: "Guias lineares",
        href: "/categoria/movimentacao-linear/guias",
      },
      {
        id: "fusos",
        label: "Fusos de esferas",
        href: "/categoria/movimentacao-linear/fusos",
      },
      {
        id: "patins",
        label: "Patins lineares",
        href: "/categoria/movimentacao-linear/patins",
      },
    ],
  },

  {
    id: "acoplamentos",
    label: "Acoplamentos",
    href: "/categoria/acoplamentos",
    children: [
      {
        id: "acoplamentos-flexiveis",
        label: "Acoplamentos flexíveis",
        href: "/categoria/acoplamentos/flexiveis",
      },
      {
        id: "acoplamentos-engrenagem",
        label: "Acoplamentos de engrenagem",
        href: "/categoria/acoplamentos/engrenagem",
      },
    ],
  },

  {
    id: "vedacoes",
    label: "Vedações",
    href: "/categoria/vedacoes",
    children: [
      {
        id: "retentores",
        label: "Retentores",
        href: "/categoria/vedacoes/retentores",
      },
      {
        id: "aneis",
        label: "Anéis O-ring",
        href: "/categoria/vedacoes/aneis",
      },
      {
        id: "gaxetas",
        label: "Gaxetas",
        href: "/categoria/vedacoes/gaxetas",
      },
    ],
  },

  {
    id: "quimicos",
    label: "Químicos",
    href: "/categoria/quimicos",
    children: [
      {
        id: "graxas",
        label: "Graxas",
        href: "/categoria/quimicos/graxas",
      },
      {
        id: "lubrificantes",
        label: "Lubrificantes",
        href: "/categoria/quimicos/lubrificantes",
      },
      {
        id: "trava-rosca",
        label: "Trava roscas",
        href: "/categoria/quimicos/trava-roscas",
      },
      {
        id: "adesivos",
        label: "Adesivos industriais",
        href: "/categoria/quimicos/adesivos",
      },
    ],
  },

  {
    id: "ferramentas",
    label: "Ferramentas",
    href: "/categoria/ferramentas",
    children: [
      {
        id: "montagem",
        label: "Ferramentas de montagem",
        href: "/categoria/ferramentas/montagem",
      },
      {
        id: "extratores",
        label: "Extratores",
        href: "/categoria/ferramentas/extratores",
      },
      {
        id: "aquecedores",
        label: "Aquecedores de rolamentos",
        href: "/categoria/ferramentas/aquecedores",
      },
    ],
  },
];