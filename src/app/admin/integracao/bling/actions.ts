"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { buscarTodosProdutosBling } from "@/lib/integracoes/bling-api";
import { enviarPedidoParaBling } from "@/lib/integracoes/bling-pedidos";
import type { Produto } from "@/types/database";

// Server Actions da seção "Integrações" do /admin: sincronização manual de
// estoque com o Bling (Parte B) e reenvio manual de um pedido pago que
// falhou ao sincronizar (Parte C). Usam a service_role key porque, apesar
// de rodarem a partir do /admin (autenticado), o restante da leitura/escrita
// de "produtos"/"pedidos" nesse fluxo já segue esse padrão no projeto.

export interface ResultadoSincronizacaoBling {
  sucesso: boolean;
  mensagem?: string;
  atualizados: number;
  naoEncontradosNoSite: string[];
}

/**
 * Busca todos os produtos do Bling e, para cada um cujo código (SKU) bate
 * com um produto local, atualiza o estoque local com o valor do Bling (o
 * Bling é a fonte de verdade de estoque) e grava a referência cruzada
 * bling_produto_id. Produtos que existem no Bling mas não localmente NÃO
 * são criados — só aparecem na lista de "não encontrados" para decisão manual.
 */
export async function sincronizarEstoqueBling(): Promise<ResultadoSincronizacaoBling> {
  const supabase = criarClienteSupabaseAdmin();

  const produtosBling = await buscarTodosProdutosBling(supabase);
  if (!produtosBling.sucesso) {
    return { sucesso: false, mensagem: produtosBling.mensagem, atualizados: 0, naoEncontradosNoSite: [] };
  }

  const { data: produtosLocais, error } = await supabase
    .from("produtos")
    .select("id, sku")
    .returns<Pick<Produto, "id" | "sku">[]>();

  if (error) {
    return {
      sucesso: false,
      mensagem: `Erro ao ler produtos locais: ${error.message}`,
      atualizados: 0,
      naoEncontradosNoSite: [],
    };
  }

  const mapaPorSku = new Map((produtosLocais ?? []).map((produto) => [produto.sku, produto]));

  let atualizados = 0;
  const naoEncontrados: string[] = [];

  for (const produtoBling of produtosBling.dados) {
    if (!produtoBling.codigo) continue;

    const local = mapaPorSku.get(produtoBling.codigo);
    if (!local) {
      naoEncontrados.push(`${produtoBling.codigo} — ${produtoBling.nome}`);
      continue;
    }

    const estoque = produtoBling.estoque?.saldoVirtualTotal;
    if (typeof estoque !== "number") continue;

    await supabase
      .from("produtos")
      .update({ estoque: Math.max(0, Math.round(estoque)), bling_produto_id: produtoBling.id })
      .eq("id", local.id);
    atualizados++;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");

  return { sucesso: true, atualizados, naoEncontradosNoSite: naoEncontrados };
}

export interface ResultadoReenvioBling {
  sucesso: boolean;
  mensagem?: string;
}

/** Tenta enviar de novo um pedido pago que falhou ao sincronizar com o Bling. */
export async function reenviarPedidoParaBlingAction(pedidoId: string): Promise<ResultadoReenvioBling> {
  const supabase = criarClienteSupabaseAdmin();

  await enviarPedidoParaBling(supabase, pedidoId);
  revalidatePath("/admin");

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("bling_sincronizado, bling_erro_sincronizacao")
    .eq("id", pedidoId)
    .maybeSingle<{ bling_sincronizado: boolean; bling_erro_sincronizacao: string | null }>();

  if (pedido?.bling_sincronizado) {
    return { sucesso: true };
  }

  return { sucesso: false, mensagem: pedido?.bling_erro_sincronizacao ?? "Falha desconhecida ao sincronizar." };
}
