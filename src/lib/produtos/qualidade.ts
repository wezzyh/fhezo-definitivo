import type { Produto } from "@/types/database";

// Score de completude do cadastro de um produto (0-100%). Pesos definidos
// junto com o usuário (não são um palpite técnico — é uma decisão de
// negócio sobre o que mais importa num cadastro): imagem e peso/dimensão
// reais pesam mais porque afetam a venda/frete diretamente; SEO em
// seguida; marca, categoria, EAN, NCM e descrição dividem o restante.
// Some sempre 100.
export const PESOS_QUALIDADE = {
  imagem: 20,
  pesoDimensao: 15,
  seoTitulo: 7.5,
  seoDescricao: 7.5,
  marca: 10,
  categoria: 10,
  ean: 10,
  ncm: 10,
  descricao: 10,
} as const;

// Valores de fábrica usados como placeholder até o admin revisar (ver
// sincronizarEstoqueBling em src/app/admin/integracao/bling/actions.ts) —
// não contam como "peso/dimensão preenchida de verdade".
export const PESO_KG_PADRAO_FABRICA = 1;
export const DIMENSAO_CM_PADRAO_FABRICA = 10;

// Evita que digitar qualquer caractere (ex.: "-") já conte como descrição
// preenchida para fins de score.
const DESCRICAO_MIN_CARACTERES = 20;

export interface ContextoQualidade {
  /** id de marcas."Sem marca" — null se essa marca padrão ainda não existe. */
  marcaSemMarcaId: string | null;
  /** id de categorias."Sem categoria" — null se essa categoria padrão ainda não existe. */
  categoriaSemCategoriaId: string | null;
}

export type CriteriosQualidade = Record<keyof typeof PESOS_QUALIDADE, boolean>;

export interface ResultadoQualidade {
  /** 0-100, arredondado. */
  score: number;
  criterios: CriteriosQualidade;
}

type ProdutoParaQualidade = Pick<
  Produto,
  | "imagem_url"
  | "peso_kg"
  | "altura_cm"
  | "largura_cm"
  | "comprimento_cm"
  | "marca_id"
  | "categoria_id"
  | "ean"
  | "ncm"
  | "seo_titulo"
  | "seo_descricao"
  | "descricao"
>;

function preenchido(valor: string | null | undefined): boolean {
  return Boolean(valor && valor.trim());
}

export function calcularQualidadeProduto(
  produto: ProdutoParaQualidade,
  contexto: ContextoQualidade,
): ResultadoQualidade {
  const criterios: CriteriosQualidade = {
    imagem: preenchido(produto.imagem_url),
    pesoDimensao: !(
      produto.peso_kg === PESO_KG_PADRAO_FABRICA &&
      produto.altura_cm === DIMENSAO_CM_PADRAO_FABRICA &&
      produto.largura_cm === DIMENSAO_CM_PADRAO_FABRICA &&
      produto.comprimento_cm === DIMENSAO_CM_PADRAO_FABRICA
    ),
    // Se a marca/categoria "padrão" nem existir no banco (contexto null),
    // não há placeholder pro produto estar preso nele — conta como
    // preenchido de verdade por padrão, em vez de penalizar à toa.
    marca: contexto.marcaSemMarcaId === null || produto.marca_id !== contexto.marcaSemMarcaId,
    categoria:
      contexto.categoriaSemCategoriaId === null || produto.categoria_id !== contexto.categoriaSemCategoriaId,
    ean: preenchido(produto.ean),
    ncm: preenchido(produto.ncm),
    seoTitulo: preenchido(produto.seo_titulo),
    seoDescricao: preenchido(produto.seo_descricao),
    descricao: Boolean(produto.descricao && produto.descricao.trim().length >= DESCRICAO_MIN_CARACTERES),
  };

  const score = (Object.keys(PESOS_QUALIDADE) as (keyof typeof PESOS_QUALIDADE)[]).reduce(
    (soma, criterio) => soma + (criterios[criterio] ? PESOS_QUALIDADE[criterio] : 0),
    0,
  );

  return { score: Math.round(score), criterios };
}

export type FaixaQualidade = "alta" | "media" | "baixa";

export function faixaQualidade(score: number): FaixaQualidade {
  if (score >= 80) return "alta";
  if (score >= 50) return "media";
  return "baixa";
}

/** Classes Tailwind (paleta do projeto — sem cor nova) para o badge de qualidade. */
export function classesBadgeQualidade(score: number): string {
  const faixa = faixaQualidade(score);
  if (faixa === "alta") return "bg-brand-green/10 text-brand-green-dark";
  if (faixa === "media") return "bg-warning/15 text-dark-2";
  return "bg-red-100 text-red-800";
}
