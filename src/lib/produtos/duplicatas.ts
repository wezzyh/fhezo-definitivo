import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// "sku" já é UNIQUE no banco, mas essa constraint é sensível a
// maiúsculas/minúsculas e a espaços nas pontas — "ROL-123", "rol-123" e
// " ROL-123 " passam pelo unique constraint como três valores DIFERENTES,
// mesmo sendo o mesmo SKU pra um humano. "ean" nunca teve nenhuma
// restrição de unicidade. Este módulo normaliza (trim + minúsculas) pra
// detectar essas duplicatas "de fato" tanto na validação do formulário
// quanto no filtro da listagem (ver /admin/produtos).
//
// Reforço equivalente também existe direto no banco (índices únicos sobre
// o valor normalizado) — ver supabase/migrations/0010_produtos_sku_ean_unicos_normalizados.sql.
// A validação aqui existe pra dar uma mensagem de erro clara no formulário
// em vez de só deixar o INSERT/UPDATE falhar com um erro genérico de
// constraint do Postgres.

export function normalizarSku(sku: string): string {
  return sku.trim().toLowerCase();
}

export function normalizarEan(ean: string): string {
  return ean.trim().toLowerCase();
}

/** Verifica se `sku` (normalizado) já pertence a outro produto. Ignora `idParaIgnorar` (edição). */
export async function existeSkuDuplicado(
  supabase: SupabaseClient,
  sku: string,
  idParaIgnorar?: string,
): Promise<boolean> {
  const alvo = normalizarSku(sku);
  const { data } = await supabase.from("produtos").select("id, sku").returns<{ id: string; sku: string }[]>();

  return (data ?? []).some((produto) => produto.id !== idParaIgnorar && normalizarSku(produto.sku) === alvo);
}

/** Verifica se `ean` (normalizado) já pertence a outro produto. Ignora `idParaIgnorar` (edição). EAN vazio nunca é "duplicado". */
export async function existeEanDuplicado(
  supabase: SupabaseClient,
  ean: string,
  idParaIgnorar?: string,
): Promise<boolean> {
  const alvo = normalizarEan(ean);
  if (!alvo) return false;

  const { data } = await supabase
    .from("produtos")
    .select("id, ean")
    .not("ean", "is", null)
    .returns<{ id: string; ean: string | null }[]>();

  return (data ?? []).some(
    (produto) => produto.id !== idParaIgnorar && produto.ean && normalizarEan(produto.ean) === alvo,
  );
}

export interface IdentificadoresProduto {
  id: string;
  sku: string;
  ean: string | null;
}

export interface DuplicatasEncontradas {
  skuDuplicado: Set<string>;
  eanDuplicado: Set<string>;
}

/**
 * A partir de uma lista leve (id, sku, ean — sem o resto das colunas) de
 * TODOS os produtos, calcula quais ids têm SKU ou EAN duplicado
 * (normalizado). Usado pelo filtro "SKU duplicado"/"EAN duplicado" da
 * listagem — ver comentário de performance em /admin/produtos/page.tsx
 * sobre por que essa é a única consulta que varre a tabela inteira mesmo
 * com paginação.
 */
export function encontrarDuplicatas(produtos: IdentificadoresProduto[]): DuplicatasEncontradas {
  const idsPorSku = new Map<string, string[]>();
  const idsPorEan = new Map<string, string[]>();

  for (const produto of produtos) {
    const chaveSku = normalizarSku(produto.sku);
    const listaSku = idsPorSku.get(chaveSku) ?? [];
    listaSku.push(produto.id);
    idsPorSku.set(chaveSku, listaSku);

    const eanNormalizado = produto.ean ? normalizarEan(produto.ean) : "";
    if (eanNormalizado) {
      const listaEan = idsPorEan.get(eanNormalizado) ?? [];
      listaEan.push(produto.id);
      idsPorEan.set(eanNormalizado, listaEan);
    }
  }

  const skuDuplicado = new Set<string>();
  for (const ids of idsPorSku.values()) {
    if (ids.length > 1) ids.forEach((id) => skuDuplicado.add(id));
  }

  const eanDuplicado = new Set<string>();
  for (const ids of idsPorEan.values()) {
    if (ids.length > 1) ids.forEach((id) => eanDuplicado.add(id));
  }

  return { skuDuplicado, eanDuplicado };
}
