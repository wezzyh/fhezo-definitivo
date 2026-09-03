import { PESO_KG_PADRAO_FABRICA, DIMENSAO_CM_PADRAO_FABRICA } from "./qualidade";
import type { DuplicatasEncontradas } from "./duplicatas";

// Extraído de src/app/admin/produtos/page.tsx pra ser reaproveitado por
// "selecionar todos os resultados do filtro atual" (ver acoes-em-massa.ts)
// — as duas telas precisam concordar exatamente em quais produtos um
// conjunto de filtros seleciona, nunca duas implementações que podem
// divergir.

export type IdProblema =
  | "sem_imagem"
  | "sem_peso_dimensao"
  | "sem_marca"
  | "sem_categoria"
  | "sem_seo"
  | "estoque_negativo"
  | "sku_duplicado"
  | "ean_duplicado";

export const PROBLEMAS: { id: IdProblema; rotulo: string }[] = [
  { id: "sem_imagem", rotulo: "Sem imagem" },
  { id: "sem_peso_dimensao", rotulo: "Sem peso/dimensão real" },
  { id: "sem_marca", rotulo: "Sem marca" },
  { id: "sem_categoria", rotulo: "Sem categoria" },
  { id: "sem_seo", rotulo: "Sem SEO" },
  { id: "estoque_negativo", rotulo: "Estoque negativo" },
  { id: "sku_duplicado", rotulo: "SKU duplicado" },
  { id: "ean_duplicado", rotulo: "EAN duplicado" },
];

const IDS_PROBLEMA_VALIDOS = new Set<string>(PROBLEMAS.map((p) => p.id));

/** ID que nunca existe de verdade — força "zero resultados" com segurança quando um filtro não corresponde a nenhum produto. */
export const ID_IMPOSSIVEL = "00000000-0000-0000-0000-000000000000";

export function normalizarProblemasAtivos(bruto: string | string[] | undefined): IdProblema[] {
  const lista = Array.isArray(bruto) ? bruto : bruto ? [bruto] : [];
  return lista.filter((p): p is IdProblema => IDS_PROBLEMA_VALIDOS.has(p));
}

/**
 * Monta os termos do `.or()` do PostgREST pros filtros de problema
 * ativos — combinam com OU entre si (qualquer problema selecionado já
 * inclui o produto; ver justificativa no /admin/produtos). Devolve uma
 * lista vazia se nenhum problema estiver ativo (chamador não deve aplicar
 * `.or()` nesse caso — mostra tudo).
 */
export function construirTermosOr(
  problemasAtivos: IdProblema[],
  contexto: { idMarcaPadrao: string | null; idCategoriaPadrao: string | null; duplicatas: DuplicatasEncontradas },
): string[] {
  const termos: string[] = [];

  if (problemasAtivos.includes("sem_imagem")) termos.push("imagem_url.is.null");
  if (problemasAtivos.includes("sem_peso_dimensao")) {
    termos.push(
      `and(peso_kg.eq.${PESO_KG_PADRAO_FABRICA},altura_cm.eq.${DIMENSAO_CM_PADRAO_FABRICA},largura_cm.eq.${DIMENSAO_CM_PADRAO_FABRICA},comprimento_cm.eq.${DIMENSAO_CM_PADRAO_FABRICA})`,
    );
  }
  if (problemasAtivos.includes("sem_marca") && contexto.idMarcaPadrao) {
    termos.push(`marca_id.eq.${contexto.idMarcaPadrao}`);
  }
  if (problemasAtivos.includes("sem_categoria") && contexto.idCategoriaPadrao) {
    termos.push(`categoria_id.eq.${contexto.idCategoriaPadrao}`);
  }
  if (problemasAtivos.includes("sem_seo")) termos.push("and(seo_titulo.is.null,seo_descricao.is.null)");
  if (problemasAtivos.includes("estoque_negativo")) termos.push("estoque.lt.0");
  if (problemasAtivos.includes("sku_duplicado") && contexto.duplicatas.skuDuplicado.size > 0) {
    termos.push(`id.in.(${[...contexto.duplicatas.skuDuplicado].join(",")})`);
  }
  if (problemasAtivos.includes("ean_duplicado") && contexto.duplicatas.eanDuplicado.size > 0) {
    termos.push(`id.in.(${[...contexto.duplicatas.eanDuplicado].join(",")})`);
  }

  // Algum problema foi selecionado mas não gerou nenhum termo válido (ex.:
  // "EAN duplicado" marcado e não existe nenhum EAN duplicado agora) ->
  // tem que dar ZERO resultados, não "todos os produtos".
  if (problemasAtivos.length > 0 && termos.length === 0) {
    termos.push(`id.eq.${ID_IMPOSSIVEL}`);
  }

  return termos;
}
