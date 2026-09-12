"use server";
import { obterClienteLogado } from "@/lib/clientes/sessao";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import {
  consultarCobrancaAsaas,
  buscarLinhaDigitavelBoletoAsaas,
  buscarQrCodePixAsaas,
} from "@/lib/pagamento/asaas";
import {
  atualizarStatusPedidoPorPagamento,
  mapearStatusAsaasParaPedido,
} from "@/lib/pagamento/pedidos";
import type { FormaPagamento, Pedido, StatusPedido } from "@/types/database";
export type ResumoPedidoConfirmacao =
  | {
      sucesso: true;
      numeroPedido: string;
      status: StatusPedido;
      formaPagamento: FormaPagamento | null;
      total: number;
      freteValor: number;
      freteTransportadora: string | null;
      itens: { nome: string; quantidade: number; preco: number }[];
      boleto?: { url: string; linhaDigitavel: string | null };
      pix?: { qrCodeBase64: string; copiaECola: string };
      urlPagamento?: string;
      aviso?: string;
    }
  | { sucesso: false; mensagem: string };
function urlAsaas(valor: string | undefined) {
  if (!valor) return undefined;
  try {
    const u = new URL(valor);
    return u.protocol === "https:" &&
      (u.hostname === "asaas.com" || u.hostname.endsWith(".asaas.com"))
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
export async function buscarResumoPedido(
  pedidoId: string,
): Promise<ResumoPedidoConfirmacao> {
  if (
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(pedidoId)
  )
    return { sucesso: false, mensagem: "Pedido inválido." };
  try {
    const sessao = await obterClienteLogado();
    if (!sessao?.cliente)
      return {
        sucesso: false,
        mensagem: "Entre na sua conta para acompanhar este pedido.",
      };
    const banco = criarClienteSupabaseAdmin();
    const { data: pedido, error } = await banco
      .from("pedidos")
      .select("*")
      .eq("id", pedidoId)
      .eq("cliente_id", sessao.cliente.id)
      .maybeSingle<Pedido>();
    if (error || !pedido)
      return { sucesso: false, mensagem: "Pedido não encontrado." };
    const { data: linhas, error: erroItens } = await banco
      .from("pedido_itens")
      .select("quantidade,preco_unitario,produtos(nome)")
      .eq("pedido_id", pedidoId);
    const itens = (linhas ?? []).map((l) => ({
      nome:
        (l.produtos as unknown as { nome: string } | null)?.nome ?? "Produto",
      quantidade: Number(l.quantidade),
      preco: Number(l.preco_unitario),
    }));
    const base: Extract<ResumoPedidoConfirmacao, { sucesso: true }> = {
      sucesso: true,
      numeroPedido: pedido.id.replace(/-/g, "").slice(0, 8).toUpperCase(),
      status: pedido.status,
      formaPagamento: pedido.forma_pagamento,
      total: pedido.total,
      freteValor: pedido.frete_valor ?? 0,
      freteTransportadora: pedido.frete_transportadora,
      itens,
    };
    if (erroItens)
      base.aviso = "Não foi possível carregar a lista de produtos agora.";
    if (!pedido.asaas_payment_id) return base;
    // Uma cobrança pendente continua pendente se o provedor estiver indisponível.
    const cobranca = await consultarCobrancaAsaas(pedido.asaas_payment_id);
    if (cobranca.sucesso) {
      const status = mapearStatusAsaasParaPedido(cobranca.dados.status);
      if (status && status !== pedido.status && pedido.status === "pendente") {
        await atualizarStatusPedidoPorPagamento(
          banco,
          pedido.asaas_payment_id,
          cobranca.dados.status,
        );
        base.status = status;
      }
      base.urlPagamento = urlAsaas(cobranca.dados.invoiceUrl);
    } else {
      base.aviso =
        "Não foi possível atualizar o pagamento agora. O status abaixo é o último registrado.";
    }
    if (base.status === "pago" || base.status === "cancelado") return base;
    if (pedido.forma_pagamento === "pix") {
      const qr = await buscarQrCodePixAsaas(pedido.asaas_payment_id);
      if (qr.sucesso) base.pix = qr.dados;
      else
        base.aviso =
          "A cobrança está registrada, mas o QR Code não pôde ser carregado. Tente atualizar o pagamento.";
    }
    if (pedido.forma_pagamento === "boleto" && cobranca.sucesso) {
      const url = urlAsaas(cobranca.dados.bankSlipUrl);
      if (url) {
        const linha = await buscarLinhaDigitavelBoletoAsaas(
          pedido.asaas_payment_id,
        );
        base.boleto = {
          url,
          linhaDigitavel: linha.sucesso ? linha.dados.linhaDigitavel : null,
        };
      }
    }
    return base;
  } catch {
    return {
      sucesso: false,
      mensagem: "Não foi possível carregar o pedido agora. Tente novamente.",
    };
  }
}
