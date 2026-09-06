import type { DadosMenu, DadosHome, DadosTema, DadosFooter } from "./tipos";

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
