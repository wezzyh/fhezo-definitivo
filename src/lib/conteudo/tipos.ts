// Formatos do campo jsonb "dados" de cada tipo de conteúdo em
// "conteudo_site" (menu, home, tema — documento inteiro por versão) e de
// cada banner em "banners" (versionado por item). Ver HANDOFF.md para o
// racional de cada decisão de versionamento.

export type TipoItemMenu = "categoria" | "link" | "todos";

export interface ItemMenu {
  /** Id estável dentro da árvore, gerado no client ao criar o item — nunca reaproveitado. */
  id: string;
  rotulo: string;
  tipo: TipoItemMenu;
  /** Só quando tipo === "categoria": referência a categorias.id. O href é resolvido em runtime a partir do slug atual da categoria (ver resolverHrefItemMenu). */
  categoria_id: string | null;
  /** Só quando tipo === "link": URL livre (interna ou externa). */
  href: string | null;
  ordem: number;
  /** Submenu — mesma forma, recursivo, sem limite de profundidade imposto pelo dado (a UI hoje só desenha 1 nível de dropdown, ver Nav). */
  filhos: ItemMenu[];
}

export interface DadosMenu {
  itens: ItemMenu[];
}

interface SecaoHomeBase {
  id: string;
  ordem: number;
  ativo: boolean;
}

export interface SecaoCategoriasDestaque extends SecaoHomeBase {
  tipo: "categorias_destaque";
  titulo: string;
  subtitulo: string;
  categoria_ids: string[];
}

export interface SecaoProdutosDestaque extends SecaoHomeBase {
  tipo: "produtos_destaque";
  titulo: string;
  subtitulo: string;
  modo: "manual" | "automatico" | "mais_vendidos";
  /** Usado quando modo === "manual". */
  produto_ids: string[];
  /** Usado quando modo === "automatico"; null = todas as categorias. Ignorado em "mais_vendidos" (sempre todas as categorias). */
  categoria_id: string | null;
  limite: number;
}

export type SecaoHome = SecaoCategoriasDestaque | SecaoProdutosDestaque;

export interface DadosHome {
  secoes: SecaoHome[];
}

export interface DadosTema {
  cores: {
    brand_green: string;
    brand_green_dark: string;
    dark: string;
    dark_2: string;
    page: string;
    ink: string;
    muted: string;
    warning: string;
  };
}

export type PosicaoBanner = "hero" | "faixa_institucional";

export interface DadosBanner {
  imagem_url: string;
  link_url: string | null;
  titulo: string | null;
  ordem: number;
  ativo: boolean;
  /** Datas no formato YYYY-MM-DD; null = sem limite naquele lado da janela. */
  data_inicio: string | null;
  data_fim: string | null;
  /** "hero" = banner principal no topo da home; "faixa_institucional" = faixa fina abaixo das seções da home. Banners publicados antes deste campo existir não têm essa chave — tratar como "hero" na leitura. */
  posicao: PosicaoBanner;
}

/** Um ícone do rodapé (forma de pagamento ou selo de segurança). */
export interface ImagemFooter {
  /** Id estável dentro da lista, gerado no client ao adicionar o item — nunca reaproveitado. */
  id: string;
  imagem_url: string;
  /** Texto alternativo (ex.: "Visa", "Site seguro SSL") — também usado como legenda no admin. */
  alt: string;
  ordem: number;
}

export interface DadosFooter {
  formas_pagamento: ImagemFooter[];
  selos_seguranca: ImagemFooter[];
}

export type ResultadoPublicacao = { sucesso: true; versao: number } | { sucesso: false; erro: string };

/** Título/descrição para buscadores de uma página que não tem tabela própria (Home, listagem de produtos). Páginas institucionais têm seo_titulo/seo_descricao na própria linha, não aqui. */
export interface SeoPagina {
  titulo: string;
  descricao: string;
}

export interface DadosSeo {
  home: SeoPagina;
  produtos: SeoPagina;
}
