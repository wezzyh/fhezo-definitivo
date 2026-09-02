"use server";

import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { consultarCobrancaAsaas, buscarLinhaDigitavelBoletoAsaas } from "@/lib/pagamento/asaas";
import type { FormaPagamento, Pedido, StatusPedido } from "@/types/database";

export type ResumoPedidoConfirmacao =
  | {
      sucesso: true;
      numeroPedido: string;
      status: StatusPedido;
      formaPagamento: FormaPagamento | null;
      total: number;
      freteTransportadora: string | null;
      boleto?: { url: string; linhaDigitavel: string | null };
    }
  | { sucesso: false; mensagem: string };

/**
 * Busca os dados do pedido para a tela de confirmação. Para boleto, refaz a
 * consulta ao Asaas (não guardamos bankSlipUrl/linha digitável no banco) —
 * assim o link continua funcionando mesmo se o cliente voltar à página
 * depois.
 */
export async function buscarResumoPedido(pedidoId: string): Promise<ResumoPedidoConfirmacao> {
  let supabase;
  try {
    supabase = criarClienteSupabaseAdmin();
  } catch {
    return { sucesso: false, mensagem: "Não foi possível carregar o pedido agora." };
  }

  const { data: pedido, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("id", pedidoId)
    .maybeSingle<Pedido>();

  if (error || !pedido) {
    return { sucesso: false, mensagem: "Pedido não encontrado." };
  }

  const numeroPedido = pedido.id.replace(/-/g, "").slice(0, 8).toUpperCase();

  const base = {
    sucesso: true as const,
    numeroPedido,
    status: pedido.status,
    formaPagamento: pedido.forma_pagamento,
    total: pedido.total,
    freteTransportadora: pedido.frete_transportadora,
  };

  if (pedido.forma_pagamento !== "boleto" || !pedido.asaas_payment_id) {
    return base;
  }

  const [cobranca, linha] = await Promise.all([
    consultarCobrancaAsaas(pedido.asaas_payment_id),
    buscarLinhaDigitavelBoletoAsaas(pedido.asaas_payment_id),
  ]);

  if (!cobranca.sucesso || !cobranca.dados.bankSlipUrl) {
    return base;
  }

  return {
    ...base,
    boleto: {
      url: cobranca.dados.bankSlipUrl,
      linhaDigitavel: linha.sucesso ? linha.dados.linhaDigitavel : null,
    },
  };
}
