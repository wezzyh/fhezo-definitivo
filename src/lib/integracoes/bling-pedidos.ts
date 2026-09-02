import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarOuCriarContatoBling, criarPedidoVendaBling } from "./bling-api";
import type { Cliente, Pedido, Produto } from "@/types/database";

// Envia um pedido pago para o Bling como Pedido de Venda. Chamado
// automaticamente quando um pedido transiciona para "pago" (ver
// atualizarStatusPedidoPorPagamento em src/lib/pagamento/pedidos.ts —
// cobre tanto o webhook do Asaas quanto o polling do Pix) e também sob
// demanda pelo botão "Tentar novamente" no /admin.
//
// Nunca lança exceção e nunca mexe no status/estoque do pedido: o
// pagamento já foi confirmado nesse ponto, e isso é prioridade sobre a
// sincronização com o ERP. Falhas ficam registradas em
// pedidos.bling_erro_sincronizacao, visíveis no /admin.

interface ItemPedidoBruto {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

export async function enviarPedidoParaBling(supabase: SupabaseClient, pedidoId: string): Promise<void> {
  try {
    const { data: pedido } = await supabase
      .from("pedidos")
      .select("*")
      .eq("id", pedidoId)
      .maybeSingle<Pedido>();

    if (!pedido) return;

    const { data: cliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", pedido.cliente_id)
      .maybeSingle<Cliente>();

    if (!cliente) {
      await marcarFalha(supabase, pedidoId, "Cliente do pedido não encontrado — não é possível sincronizar com o Bling.");
      return;
    }

    const { data: itensBrutos } = await supabase
      .from("pedido_itens")
      .select("produto_id, quantidade, preco_unitario")
      .eq("pedido_id", pedidoId)
      .returns<ItemPedidoBruto[]>();

    if (!itensBrutos || itensBrutos.length === 0) {
      await marcarFalha(supabase, pedidoId, "Pedido sem itens — não é possível sincronizar com o Bling.");
      return;
    }

    const { data: produtos } = await supabase
      .from("produtos")
      .select("id, sku, nome, bling_produto_id")
      .in("id", itensBrutos.map((item) => item.produto_id))
      .returns<Pick<Produto, "id" | "sku" | "nome" | "bling_produto_id">[]>();

    const mapaProdutos = new Map((produtos ?? []).map((produto) => [produto.id, produto]));

    const produtoSemReferencia = itensBrutos.find((item) => !mapaProdutos.get(item.produto_id)?.bling_produto_id);
    if (produtoSemReferencia) {
      const nome = mapaProdutos.get(produtoSemReferencia.produto_id)?.nome ?? "desconhecido";
      await marcarFalha(
        supabase,
        pedidoId,
        `O produto "${nome}" ainda não está sincronizado com o Bling (falta bling_produto_id — rode "Sincronizar estoque com Bling" no admin).`,
      );
      return;
    }

    const contato = await buscarOuCriarContatoBling(supabase, {
      nome: cliente.nome,
      documento: cliente.documento,
      email: cliente.email,
      telefone: cliente.telefone ?? undefined,
      tipo: cliente.tipo === "PJ" ? "J" : "F",
      endereco: pedido.endereco_cep
        ? {
            cep: pedido.endereco_cep,
            logradouro: pedido.endereco_rua ?? "",
            numero: pedido.endereco_numero ?? "",
            complemento: pedido.endereco_complemento ?? undefined,
            bairro: pedido.endereco_bairro ?? "",
            cidade: pedido.endereco_cidade ?? "",
            uf: pedido.endereco_uf ?? "",
          }
        : undefined,
    });

    if (!contato.sucesso) {
      await marcarFalha(supabase, pedidoId, `Não foi possível localizar/criar o contato no Bling: ${contato.mensagem}`);
      return;
    }

    const numeroPedido = pedido.id.replace(/-/g, "").slice(0, 8).toUpperCase();

    const pedidoVenda = await criarPedidoVendaBling(supabase, {
      contatoBlingId: contato.dados.id,
      freteValor: pedido.frete_valor ?? 0,
      observacoes: `Pedido Fhezo Industrial #${numeroPedido}`,
      itens: itensBrutos.map((item) => {
        const produto = mapaProdutos.get(item.produto_id)!;
        return {
          blingProdutoId: produto.bling_produto_id!,
          codigo: produto.sku,
          descricao: produto.nome,
          quantidade: item.quantidade,
          valor: item.preco_unitario,
        };
      }),
    });

    if (!pedidoVenda.sucesso) {
      await marcarFalha(supabase, pedidoId, pedidoVenda.mensagem);
      return;
    }

    await supabase
      .from("pedidos")
      .update({
        bling_pedido_id: pedidoVenda.dados.id,
        bling_sincronizado: true,
        bling_erro_sincronizacao: null,
      })
      .eq("id", pedidoId);
  } catch (erro) {
    await marcarFalha(
      supabase,
      pedidoId,
      erro instanceof Error ? erro.message : "Erro desconhecido ao enviar o pedido para o Bling.",
    );
  }
}

async function marcarFalha(supabase: SupabaseClient, pedidoId: string, mensagem: string): Promise<void> {
  await supabase
    .from("pedidos")
    .update({ bling_sincronizado: false, bling_erro_sincronizacao: mensagem })
    .eq("id", pedidoId);
}
