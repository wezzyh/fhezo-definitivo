"use server";

import { headers } from "next/headers";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buscarOuCriarClienteAsaas,
  criarCobrancaAsaas,
  buscarQrCodePixAsaas,
  buscarLinhaDigitavelBoletoAsaas,
  consultarCobrancaAsaas,
  type BillingTypeAsaas,
} from "@/lib/pagamento/asaas";
import {
  atualizarStatusPedidoPorPagamento,
  mapearStatusAsaasParaPedido,
} from "@/lib/pagamento/pedidos";
import { descontarEstoqueItens, reverterEstoqueItens } from "@/lib/pagamento/estoque";
import { validarNumeroCartao, validarValidadeCartao, validarCvv } from "@/lib/pagamento/validar-cartao";
import type { TipoClienteCheckout, DadosPF, DadosPJ, EnderecoEntrega, FreteSelecionado } from "@/lib/checkout/tipos";
import type { FormaPagamento, Produto, StatusPedido } from "@/types/database";

// Desconta o estoque atomicamente, cria a cobrança no Asaas e, só depois de
// confirmada a criação, grava o pedido definitivo em
// "pedidos"/"pedido_itens". Tudo roda com a service_role key
// (src/lib/supabase/admin.ts) porque quem está finalizando a compra é um
// visitante sem sessão de admin.

interface ItemPedidoInput {
  produtoId: string;
  quantidade: number;
}

interface DadosCartaoInput {
  numero: string;
  nomeImpresso: string;
  validade: string; // "MM/AA"
  cvv: string;
}

interface TitularCartaoInput {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cep: string;
}

export interface CriarPedidoInput {
  clienteId: string;
  tipoCliente: TipoClienteCheckout;
  dadosPF: DadosPF;
  dadosPJ: DadosPJ;
  endereco: EnderecoEntrega;
  freteSelecionado: FreteSelecionado;
  itens: ItemPedidoInput[];
  formaPagamento: FormaPagamento;
  cartao?: DadosCartaoInput;
  titularCartao?: TitularCartaoInput;
}

export type ResultadoCriarPedido =
  | {
      sucesso: true;
      pedidoId: string;
      numeroPedido: string;
      status: StatusPedido;
      formaPagamento: FormaPagamento;
      pix?: { paymentId: string; qrCodeBase64: string; copiaECola: string };
      pixIndisponivel?: { paymentId: string };
      boleto?: { paymentId: string; url: string; linhaDigitavel: string | null };
      cartao?: { paymentId: string };
    }
  | { sucesso: false; mensagem: string };

const BILLING_TYPE_POR_FORMA: Record<FormaPagamento, BillingTypeAsaas> = {
  pix: "PIX",
  boleto: "BOLETO",
  cartao: "CREDIT_CARD",
};

function numeroPedidoLegivel(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

async function obterIpCliente(): Promise<string | undefined> {
  const listaHeaders = await headers();
  const encaminhado = listaHeaders.get("x-forwarded-for");
  return encaminhado?.split(",")[0]?.trim();
}

export async function criarPedido(input: CriarPedidoInput): Promise<ResultadoCriarPedido> {
  if (input.itens.length === 0) {
    return { sucesso: false, mensagem: "Seu carrinho está vazio." };
  }

  if (input.formaPagamento === "cartao") {
    if (!input.cartao || !input.titularCartao) {
      return { sucesso: false, mensagem: "Preencha os dados do cartão." };
    }
    if (!validarNumeroCartao(input.cartao.numero)) {
      return { sucesso: false, mensagem: "Número de cartão inválido." };
    }
    if (!validarValidadeCartao(input.cartao.validade)) {
      return { sucesso: false, mensagem: "Validade do cartão inválida ou vencida." };
    }
    if (!validarCvv(input.cartao.cvv)) {
      return { sucesso: false, mensagem: "CVV inválido." };
    }
  }

  let supabase;
  try {
    supabase = criarClienteSupabaseAdmin();
  } catch {
    return {
      sucesso: false,
      mensagem: "Não foi possível processar o pagamento agora. Tente novamente em instantes.",
    };
  }

  const idsProdutos = input.itens.map((item) => item.produtoId);
  const { data: produtos, error: erroProdutos } = await supabase
    .from("produtos")
    .select("id,nome,sku,preco,estoque,ativo")
    .in("id", idsProdutos)
    .returns<Pick<Produto, "id" | "nome" | "sku" | "preco" | "estoque" | "ativo">[]>();

  if (erroProdutos) {
    return { sucesso: false, mensagem: "Não foi possível validar os produtos do carrinho." };
  }

  const mapaProdutos = new Map((produtos ?? []).map((produto) => [produto.id, produto]));

  for (const item of input.itens) {
    const produto = mapaProdutos.get(item.produtoId);
    if (!produto || !produto.ativo) {
      return {
        sucesso: false,
        mensagem: "Um dos produtos do seu carrinho não está mais disponível. Atualize o carrinho.",
      };
    }
    if (item.quantidade > produto.estoque) {
      return {
        sucesso: false,
        mensagem: `Não há estoque suficiente de "${produto.nome}" no momento.`,
      };
    }
  }

  const subtotal = input.itens.reduce((total, item) => {
    const produto = mapaProdutos.get(item.produtoId)!;
    return total + produto.preco * item.quantidade;
  }, 0);

  const total = subtotal + input.freteSelecionado.valor;

  const dadosCliente =
    input.tipoCliente === "PF"
      ? {
          nome: input.dadosPF.nomeCompleto,
          documento: input.dadosPF.cpf,
          email: input.dadosPF.email,
          telefone: input.dadosPF.telefone,
        }
      : {
          nome: input.dadosPJ.razaoSocial,
          documento: input.dadosPJ.cnpj,
          email: input.dadosPJ.email,
          telefone: input.dadosPJ.telefone,
        };

  const clienteAsaas = await buscarOuCriarClienteAsaas({
    ...dadosCliente,
    endereco: {
      cep: input.endereco.cep,
      logradouro: input.endereco.rua,
      numero: input.endereco.numero,
      complemento: input.endereco.complemento,
      bairro: input.endereco.bairro,
      cidade: input.endereco.cidade,
    },
  });

  if (!clienteAsaas.sucesso) {
    return { sucesso: false, mensagem: `Não foi possível preparar o pagamento: ${clienteAsaas.mensagem}` };
  }

  // Desconto atômico de estoque (UPDATE condicional no Postgres — ver
  // supabase/migrations/0004_estoque_atomico.sql), feito ANTES de criar a
  // cobrança no Asaas: a validação de estoque acima é só uma checagem
  // rápida para falhar cedo, mas entre ela e agora outro cliente pode ter
  // comprado a última unidade. Esta é a checagem que realmente vale.
  const desconto = await descontarEstoqueItens(supabase, input.itens);
  if (!desconto.sucesso) {
    const produtoSemEstoque = mapaProdutos.get(desconto.produtoIdSemEstoque);
    return {
      sucesso: false,
      mensagem: `"${produtoSemEstoque?.nome ?? "um dos produtos"}" ficou sem estoque disponível durante a finalização da compra. Ajuste a quantidade e tente novamente.`,
    };
  }

  const ipCliente = await obterIpCliente();

  const cobranca = await criarCobrancaAsaas({
    customerId: clienteAsaas.dados.customerId,
    billingType: BILLING_TYPE_POR_FORMA[input.formaPagamento],
    valor: total,
    descricao: `Pedido Fhezo Industrial — ${input.itens.length} item(ns)`,
    ipCliente,
    cartao: input.cartao
      ? {
          numero: input.cartao.numero,
          nomeImpresso: input.cartao.nomeImpresso,
          mesValidade: input.cartao.validade.split("/")[0]?.trim() ?? "",
          anoValidade: (() => {
            const ano = input.cartao!.validade.split("/")[1]?.trim() ?? "";
            return ano.length === 2 ? `20${ano}` : ano;
          })(),
          cvv: input.cartao.cvv,
        }
      : undefined,
    titularCartao: input.titularCartao
      ? {
          nome: input.titularCartao.nome,
          cpf: input.titularCartao.cpf,
          email: input.titularCartao.email,
          telefone: input.titularCartao.telefone,
          cep: input.titularCartao.cep,
          numeroEndereco: input.endereco.numero,
        }
      : undefined,
  });

  if (!cobranca.sucesso) {
    await reverterEstoqueItens(supabase, input.itens);
    return { sucesso: false, mensagem: `Não foi possível criar a cobrança: ${cobranca.mensagem}` };
  }

  const statusInicial = mapearStatusAsaasParaPedido(cobranca.dados.status) ?? "pendente";

  const { data: pedidoCriado, error: erroPedido } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: input.clienteId,
      status: statusInicial,
      total,
      forma_pagamento: input.formaPagamento,
      asaas_payment_id: cobranca.dados.id,
      frete_valor: input.freteSelecionado.valor,
      frete_transportadora: input.freteSelecionado.transportadora,
      endereco_cep: input.endereco.cep,
      endereco_rua: input.endereco.rua,
      endereco_numero: input.endereco.numero,
      endereco_complemento: input.endereco.complemento || null,
      endereco_bairro: input.endereco.bairro,
      endereco_cidade: input.endereco.cidade,
      endereco_uf: input.endereco.uf,
    })
    .select("id")
    .single<{ id: string }>();

  if (erroPedido || !pedidoCriado) {
    return {
      sucesso: false,
      mensagem:
        "O pagamento foi iniciado, mas não conseguimos registrar o pedido. Entre em contato informando este erro: " +
        (erroPedido?.message ?? "erro desconhecido"),
    };
  }

  const linhasItens = input.itens.map((item) => ({
    pedido_id: pedidoCriado.id,
    produto_id: item.produtoId,
    quantidade: item.quantidade,
    preco_unitario: mapaProdutos.get(item.produtoId)!.preco,
  }));

  const { error: erroItens } = await supabase.from("pedido_itens").insert(linhasItens);

  if (erroItens) {
    await supabase.from("pedidos").delete().eq("id", pedidoCriado.id);
    return {
      sucesso: false,
      mensagem: "Não foi possível registrar os itens do pedido. Tente novamente.",
    };
  }

  const numeroPedido = numeroPedidoLegivel(pedidoCriado.id);

  if (input.formaPagamento === "pix") {
    const qrCode = await buscarQrCodePixAsaas(cobranca.dados.id);
    if (!qrCode.sucesso) {
      return {
        sucesso: true,
        pedidoId: pedidoCriado.id,
        numeroPedido,
        status: statusInicial,
        formaPagamento: input.formaPagamento,
        pixIndisponivel: { paymentId: cobranca.dados.id },
      };
    }
    return {
      sucesso: true,
      pedidoId: pedidoCriado.id,
      numeroPedido,
      status: statusInicial,
      formaPagamento: input.formaPagamento,
      pix: { paymentId: cobranca.dados.id, ...qrCode.dados },
    };
  }

  if (input.formaPagamento === "boleto") {
    const linha = await buscarLinhaDigitavelBoletoAsaas(cobranca.dados.id);
    return {
      sucesso: true,
      pedidoId: pedidoCriado.id,
      numeroPedido,
      status: statusInicial,
      formaPagamento: input.formaPagamento,
      boleto: {
        paymentId: cobranca.dados.id,
        url: cobranca.dados.bankSlipUrl ?? "",
        linhaDigitavel: linha.sucesso ? linha.dados.linhaDigitavel : null,
      },
    };
  }

  return {
    sucesso: true,
    pedidoId: pedidoCriado.id,
    numeroPedido,
    status: statusInicial,
    formaPagamento: input.formaPagamento,
    cartao: { paymentId: cobranca.dados.id },
  };
}

/** Tenta buscar o QR Code do Pix novamente, sem recriar o pedido/cobrança. */
export async function buscarQrCodePagamentoPix(
  paymentId: string,
): Promise<{ sucesso: true; qrCodeBase64: string; copiaECola: string } | { sucesso: false; mensagem: string }> {
  const resultado = await buscarQrCodePixAsaas(paymentId);
  if (!resultado.sucesso) return resultado;
  return { sucesso: true, ...resultado.dados };
}

/** Usado pelo polling da tela de Pix — consulta o Asaas e já atualiza o pedido se confirmado. */
export async function verificarStatusPagamento(
  paymentId: string,
): Promise<{ sucesso: true; pago: boolean } | { sucesso: false; mensagem: string }> {
  const resultado = await consultarCobrancaAsaas(paymentId);
  if (!resultado.sucesso) return resultado;

  try {
    const supabase = criarClienteSupabaseAdmin();
    await atualizarStatusPedidoPorPagamento(supabase, paymentId, resultado.dados.status);
  } catch {
    // Não impede o cliente de ver que o pagamento foi confirmado — só o
    // registro do status no nosso banco falhou (o webhook tentará de novo).
  }

  return { sucesso: true, pago: mapearStatusAsaasParaPedido(resultado.dados.status) === "pago" };
}
