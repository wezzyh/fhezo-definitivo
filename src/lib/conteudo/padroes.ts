import type { DadosMenu, DadosHome, DadosTema, DadosFooter, DadosSeo, DadosContato } from "./tipos";

// Conteúdo padrão usado em dois casos: (1) fallback em runtime se a tabela
// conteudo_site ainda não tiver nenhuma versão publicada de um tipo (ex.:
// a migration 0012 ainda não rodou no ambiente), e (2) espelha o que a
// migration grava como versão 1 publicada — o conteúdo que já existia
// hardcoded no código antes desta mudança (nav.tsx, page.tsx, globals.css).
// Se editar aqui, edite também supabase/migrations/0012_conteudo_site.sql.

export const MENU_PADRAO: DadosMenu = {
  itens: [
    { id: "todos", rotulo: "Todos os produtos", tipo: "todos", categoria_id: null, href: "/produtos", ordem: 1, filhos: [] },
    { id: "rolamentos", rotulo: "Rolamentos", tipo: "link", categoria_id: null, href: "/produtos", ordem: 2, filhos: [] },
    { id: "engrenagens", rotulo: "Engrenagens", tipo: "link", categoria_id: null, href: "/produtos", ordem: 3, filhos: [] },
    { id: "correntes", rotulo: "Correntes", tipo: "link", categoria_id: null, href: "/produtos", ordem: 4, filhos: [] },
    { id: "graxas", rotulo: "Graxas e Lubrificantes", tipo: "link", categoria_id: null, href: "/produtos", ordem: 5, filhos: [] },
    { id: "ferramentas", rotulo: "Ferramentas", tipo: "link", categoria_id: null, href: "/produtos", ordem: 6, filhos: [] },
    { id: "parafusos", rotulo: "Parafusos e Porcas", tipo: "link", categoria_id: null, href: "/produtos", ordem: 7, filhos: [] },
  ],
};

export const HOME_PADRAO: DadosHome = {
  secoes: [
    {
      id: "produtos-destaque",
      tipo: "produtos_destaque",
      titulo: "Produtos em destaque",
      subtitulo: "Uma seleção dos itens mais procurados pelos nossos clientes.",
      modo: "automatico",
      produto_ids: [],
      categoria_id: null,
      limite: 4,
      ordem: 1,
      ativo: true,
    },
  ],
};

// Diferente de menu/home/tema, "footer" não tinha nada hardcoded pra
// migrar (é a primeira vez que essas imagens existem no site) — só usado
// como fallback enquanto o admin não publica nenhuma versão. O footer
// público trata as duas listas vazias como estado normal, sem quebrar.
export const FOOTER_PADRAO: DadosFooter = {
  formas_pagamento: [],
  selos_seguranca: [],
};

export const TEMA_PADRAO: DadosTema = {
  cores: {
    brand_green: "#009b6c",
    brand_green_dark: "#007a54",
    dark: "#0d0d0d",
    dark_2: "#1a1a1a",
    page: "#f5f5f3",
    ink: "#1a1a1a",
    muted: "#5f5e5a",
    warning: "#e8b93a",
  },
};

// "seo" também não tinha nada versionado antes — os textos abaixo são só
// os que já estavam fixos no <title> do root layout (src/app/layout.tsx).
export const SEO_PADRAO: DadosSeo = {
  home: {
    titulo: "FHEZO Industrial",
    descricao: "Componentes industriais para sua indústria: rolamentos, engrenagens, correntes, graxas, ferramentas e mais.",
  },
  produtos: {
    titulo: "Produtos | FHEZO Industrial",
    descricao: "Catálogo completo de componentes industriais da FHEZO Industrial.",
  },
};

// "contato" também não tinha nada versionado antes — cópia exata dos
// valores que estavam hardcoded em contato-fixo.ts (removido, ver
// HANDOFF.md). "whatsapp" recebeu o mesmo número de "telefone": os dois
// campos separados do arquivo antigo (telefoneTel/whatsappNumero)
// codificavam o mesmo número, só com uma inconsistência de DDD entre eles
// e o telefone exibido (51 no texto, 41 nos links) — provavelmente um
// erro de digitação já existente. Redes sociais ficam null (os ícones do
// site sempre apontaram para "#", nunca existiu link real cadastrado).
export const CONTATO_PADRAO: DadosContato = {
  telefone: "(51) 99351-56006",
  whatsapp: "(51) 99351-56006",
  email: "sac@fhezo.com.br",
  endereco: "Curitiba - PR e região",
  horarioDias: "Segunda a sexta-feira",
  horarioHoras: "08:00 às 17:30",
  redesSociais: {
    instagram: null,
    facebook: null,
    youtube: null,
    tiktok: null,
  },
};
