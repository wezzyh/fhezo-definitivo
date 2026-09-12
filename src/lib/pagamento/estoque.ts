import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// Desconto/reversão de estoque via as funções SQL `descontar_estoque` e
// `reverter_estoque` (supabase/migrations/0004_estoque_atomico.sql), que
// fazem um UPDATE condicional atômico no Postgres — evita a race condition
// de dois clientes comprando a última unidade ao mesmo tempo. Nunca
// desconte estoque fazendo "ler, subtrair em JS, salvar de volta".

export interface ItemEstoque {
  produtoId: string;
  quantidade: number;
}

/**
 * Defesa em profundidade: quem chama já valida a quantidade (ver
 * src/lib/checkout/validar-pedido.ts) e as funções SQL também recusam —
 * mas uma quantidade negativa aqui SOMARIA ao estoque, então não custa
 * barrar de novo antes de chegar ao banco.
 */
function quantidadeValida(quantidade: number): boolean {
  return Number.isInteger(quantidade) && quantidade > 0;
}

export type ResultadoDescontoEstoque =
  | { sucesso: true }
  | { sucesso: false; produtoIdSemEstoque: string };

/**
 * Desconta o estoque de cada item, um por um. Se algum item não tiver
 * estoque suficiente no momento exato do desconto (mesmo que a validação
 * inicial tenha passado), desfaz o desconto dos itens já processados antes
 * de retornar — não fica estoque "preso" de um pedido que não vai adiante.
 */
export async function descontarEstoqueItens(
  supabase: SupabaseClient,
  itens: ItemEstoque[],
): Promise<ResultadoDescontoEstoque> {
  const itensDescontados: ItemEstoque[] = [];

  for (const item of itens) {
    if (!quantidadeValida(item.quantidade)) {
      await reverterEstoqueItens(supabase, itensDescontados);
      return { sucesso: false, produtoIdSemEstoque: item.produtoId };
    }

    const { data, error } = await supabase.rpc("descontar_estoque", {
      produto_id: item.produtoId,
      quantidade: item.quantidade,
    });

    if (error || data !== true) {
      await reverterEstoqueItens(supabase, itensDescontados);
      return { sucesso: false, produtoIdSemEstoque: item.produtoId };
    }

    itensDescontados.push(item);
  }

  return { sucesso: true };
}

/** Devolve ao estoque os itens informados. Best-effort: erros são ignorados
 *  (não há mais nada a fazer no fluxo do pedido além de registrar a falha). */
export async function reverterEstoqueItens(
  supabase: SupabaseClient,
  itens: ItemEstoque[],
): Promise<void> {
  await Promise.all(
    itens.filter((item) => quantidadeValida(item.quantidade)).map((item) =>
      supabase.rpc("reverter_estoque", {
        produto_id: item.produtoId,
        quantidade: item.quantidade,
      }),
    ),
  );
}

/** Busca os itens de um pedido já gravado e devolve o estoque correspondente
 *  (usado pelo webhook ao cancelar um pedido — boleto/Pix vencido ou estorno). */
export async function reverterEstoquePedido(
  supabase: SupabaseClient,
  pedidoId: string,
): Promise<void> {
  const { data: itens } = await supabase
    .from("pedido_itens")
    .select("produto_id, quantidade")
    .eq("pedido_id", pedidoId)
    .returns<{ produto_id: string; quantidade: number }[]>();

  if (!itens || itens.length === 0) return;

  await reverterEstoqueItens(
    supabase,
    itens.map((item) => ({ produtoId: item.produto_id, quantidade: item.quantidade })),
  );
}
