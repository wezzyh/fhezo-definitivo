"use server";

import { isIP } from "node:net";
import { obterConfigAsaas } from "@/lib/config/integracoes";
import { createHash } from "node:crypto";
import { obterClienteLogado } from "@/lib/clientes/sessao";
import { permitirTentativaCartao } from "@/lib/checkout/limite-cartao";
import { executarUmaVez } from "@/lib/checkout/idempotencia";
import { errosIdentificacao } from "@/lib/checkout/validar-identificacao";
import { headers } from "next/headers";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buscarOuCriarClienteAsaas,
  criarCobrancaAsaas,
  buscarQrCodePixAsaas,
  buscarLinhaDigitavelBoletoAsaas,
  type BillingTypeAsaas,
} from "@/lib/pagamento/asaas";
import { mapearStatusAsaasParaPedido } from "@/lib/pagamento/pedidos";
import {
  descontarEstoqueItens,
  reverterEstoqueItens,
} from "@/lib/pagamento/estoque";
import {
  agruparItensPorProduto,
  esquemaCriarPedido,
} from "@/lib/checkout/validar-pedido";
import type {
  TipoClienteCheckout,
  DadosPF,
  DadosPJ,
  EnderecoEntrega,
} from "@/lib/checkout/tipos";
import { calcularFreteDoPedido } from "@/lib/checkout/frete-pedido";
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
  numeroEndereco: string;
}

export interface CriarPedidoInput {
  checkoutId: string;
  totalEsperado?: number;
  /**
   * Só conferência, nunca autoridade (APPSEC-004): o cliente do pedido é
   * SEMPRE o da sessão. Se vier diferente, a conta mudou depois da
   * identificação (outro login, outra aba) e o pagamento é recusado.
   */
  clienteId?: string;
  tipoCliente: TipoClienteCheckout;
  dadosPF: DadosPF;
  dadosPJ: DadosPJ;
  endereco: EnderecoEntrega;
  /** Só o id da opção de frete escolhida. O valor é recalculado no servidor (calcularFreteDoPedido). */
  freteServicoId: number;
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
      boleto?: {
        paymentId: string;
        url: string;
        linhaDigitavel: string | null;
      };
      cartao?: { paymentId: string; url?: string };
    }
  | { sucesso: false; mensagem: string; bloqueado?: boolean };

const BILLING_TYPE_POR_FORMA: Record<FormaPagamento, BillingTypeAsaas> = {
  pix: "PIX",
  boleto: "BOLETO",
  cartao: "CREDIT_CARD",
};

function numeroPedidoLegivel(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Soma de preços em ponto flutuante pode dar 69.99999999 — a cobrança é sempre em centavos. */
function arredondarCentavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

async function contextoCartao(): Promise<string | null> {
  const h = await headers();
  const config = obterConfigAsaas();
  const ip = (
    h.get(process.env.VERCEL ? "x-vercel-forwarded-for" : "x-forwarded-for") ??
    ""
  )
    .split(",")[0]
    .trim();
  const host = h.get("host") ?? "";
  const local =
    config.ambiente === "sandbox" &&
    /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  if (h.get("x-forwarded-proto") !== "https" && !local) return null;
  return isIP(ip) ? ip : local ? "127.0.0.1" : null;
}

export async function criarPedido(
  entrada: CriarPedidoInput,
): Promise<ResultadoCriarPedido> {
  try {
    return await validarEProcessarPedido(entrada);
  } catch {
    return {
      sucesso: false,
      bloqueado: true,
      mensagem:
        "Não foi possível confirmar o pagamento. Não refaça a compra; consulte o atendimento com a referência da tentativa.",
    };
  }
}

async function validarEProcessarPedido(
  entrada: CriarPedidoInput,
): Promise<ResultadoCriarPedido> {
  // CriarPedidoInput é só o contrato com a página: em runtime, o argumento
  // de uma Server Action é o que o navegador mandar — revalida tudo aqui.
  const validacao = esquemaCriarPedido.safeParse(entrada);
  if (!validacao.success) {
    const primeiro = validacao.error.issues[0];
    const mensagemPropria =
      primeiro?.path[0] === "itens" || primeiro?.path[0] === "clienteId";
    return {
      sucesso: false,
      mensagem:
        mensagemPropria && primeiro
          ? primeiro.message
          : "Dados do pedido inválidos. Revise e tente de novo.",
    };
  }
  let ipCliente: string | undefined;
  if (validacao.data.formaPagamento === "cartao") {
    if (!validacao.data.cartao || !validacao.data.titularCartao)
      return {
        sucesso: false,
        mensagem: "Preencha os dados do cartão e do titular.",
      };
    const ip = await contextoCartao();
    if (!ip)
      return {
        sucesso: false,
        mensagem:
          "Não foi possível validar a conexão segura para o cartão. Entre em contato com a loja.",
      };
    ipCliente = ip;
  } else {
    delete validacao.data.cartao;
    delete validacao.data.titularCartao;
  }
  // APPSEC-004: quem é o dono do pedido é decidido aqui, pela sessão
  // (auth.uid() → clientes.auth_user_id), nunca pelo que o navegador mandou.
  const sessao = await obterClienteLogado();
  if (!sessao?.cliente) {
    return {
      sucesso: false,
      mensagem: "Entre na sua conta e confirme a identificação antes de pagar.",
    };
  }
  if (
    validacao.data.clienteId !== undefined &&
    validacao.data.clienteId !== sessao.cliente.id
  ) {
    return {
      sucesso: false,
      mensagem:
        "A conta conectada mudou depois da identificação. Volte à identificação e confirme seus dados antes de pagar.",
    };
  }
  const c = sessao.cliente;
  validacao.data.tipoCliente = c.tipo;
  validacao.data.dadosPF = {
    nomeCompleto: c.nome,
    cpf: c.documento,
    email: c.email,
    telefone: c.telefone ?? "",
  };
  validacao.data.dadosPJ = {
    razaoSocial: c.nome,
    cnpj: c.documento,
    email: c.email,
    telefone: c.telefone ?? "",
    inscricaoEstadual: "",
  };
  const erros = errosIdentificacao(validacao.data);
  if (erros.length) return { sucesso: false, mensagem: erros[0] };
  // A chave é vinculada à conta: uma sessão diferente não recupera a tentativa anterior.
  const hash = createHash("sha256")
    .update(sessao.userId + ":" + validacao.data.checkoutId)
    .digest("hex");
  const chaveDaConta = [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
  return executarUmaVez(chaveDaConta, () =>
    processarPedido(validacao.data, c.id, sessao.userId, ipCliente),
  );
}

async function processarPedido(
  input: CriarPedidoInput,
  /** Cliente da SESSÃO — o único valor aceito como dono do pedido. */
  clienteId: string,
  userId: string,
  ipCliente?: string,
): Promise<ResultadoCriarPedido> {
  // Mesmo produto em mais de uma linha vira uma só, com a quantidade
  // somada — é essa soma que precisa caber no estoque.
  const itens = agruparItensPorProduto(input.itens);
  if (!itens) {
    return {
      sucesso: false,
      mensagem: "Quantidade acima do permitido para um único pedido.",
    };
  }

  let supabase;
  try {
    supabase = criarClienteSupabaseAdmin();
  } catch {
    return {
      sucesso: false,
      mensagem:
        "Não foi possível processar o pagamento agora. Tente novamente em instantes.",
    };
  }

  const idsProdutos = itens.map((item) => item.produtoId);
  const { data: produtos, error: erroProdutos } = await supabase
    .from("produtos")
    .select(
      "id,nome,sku,preco,estoque,ativo,peso_kg,altura_cm,largura_cm,comprimento_cm",
    )
    .in("id", idsProdutos)
    .returns<
      Pick<
        Produto,
        | "id"
        | "nome"
        | "sku"
        | "preco"
        | "estoque"
        | "ativo"
        | "peso_kg"
        | "altura_cm"
        | "largura_cm"
        | "comprimento_cm"
      >[]
    >();

  if (erroProdutos) {
    return {
      sucesso: false,
      mensagem: "Não foi possível validar os produtos do carrinho.",
    };
  }

  const mapaProdutos = new Map(
    (produtos ?? []).map((produto) => [produto.id, produto]),
  );

  for (const item of itens) {
    const produto = mapaProdutos.get(item.produtoId);
    if (!produto || !produto.ativo) {
      return {
        sucesso: false,
        mensagem:
          "Um dos produtos do seu carrinho não está mais disponível. Atualize o carrinho.",
      };
    }
    if (item.quantidade > produto.estoque) {
      return {
        sucesso: false,
        mensagem: `Não há estoque suficiente de "${produto.nome}" no momento.`,
      };
    }
  }

  const subtotal = itens.reduce((total, item) => {
    const produto = mapaProdutos.get(item.produtoId)!;
    return total + produto.preco * item.quantidade;
  }, 0);

  // APPSEC-001: o frete é recalculado aqui — CEP deste pedido, produtos e
  // quantidades deste pedido, peso/dimensões do banco. O navegador só disse
  // qual serviço quer. Vem ANTES de qualquer efeito colateral (Asaas,
  // estoque, pedido): se a cotação falhar, nada acontece.
  const fretePedido = await calcularFreteDoPedido(
    input.endereco.cep,
    itens,
    mapaProdutos,
    input.freteServicoId,
  );
  if (!fretePedido.sucesso) {
    return { sucesso: false, mensagem: fretePedido.mensagem };
  }
  const frete = fretePedido.frete;

  const total = arredondarCentavos(subtotal + frete.valor);
  if (!(total > 0)) {
    return {
      sucesso: false,
      mensagem:
        "Não foi possível calcular o total do pedido. Atualize o carrinho e tente novamente.",
    };
  }

  if (
    input.totalEsperado !== undefined &&
    Math.round(input.totalEsperado * 100) !== Math.round(total * 100)
  ) {
    return {
      sucesso: false,
      mensagem:
        "Os preços ou o frete mudaram. Volte à identificação, recalcule a entrega e revise o total antes de finalizar.",
    };
  }

  if (
    input.formaPagamento === "cartao" &&
    (!ipCliente || !(await permitirTentativaCartao(userId, ipCliente)))
  ) {
    return {
      sucesso: false,
      mensagem:
        "Não foi possível liberar outra tentativa de cartão agora. Aguarde 15 minutos ou escolha outro meio de pagamento.",
    };
  }
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
    return {
      sucesso: false,
      mensagem: `Não foi possível preparar o pagamento: ${clienteAsaas.mensagem}`,
    };
  }

  // Desconto atômico de estoque (UPDATE condicional no Postgres — ver
  // supabase/migrations/0004_estoque_atomico.sql), feito ANTES de criar a
  // cobrança no Asaas: a validação de estoque acima é só uma checagem
  // rápida para falhar cedo, mas entre ela e agora outro cliente pode ter
  // comprado a última unidade. Esta é a checagem que realmente vale.
  const desconto = await descontarEstoqueItens(supabase, itens);
  if (!desconto.sucesso) {
    const produtoSemEstoque = mapaProdutos.get(desconto.produtoIdSemEstoque);
    return {
      sucesso: false,
      mensagem: `"${produtoSemEstoque?.nome ?? "um dos produtos"}" ficou sem estoque disponível durante a finalização da compra. Ajuste a quantidade e tente novamente.`,
    };
  }

  const cobranca = await criarCobrancaAsaas({
    customerId: clienteAsaas.dados.customerId,
    billingType: BILLING_TYPE_POR_FORMA[input.formaPagamento],
    valor: total,
    descricao: `Pedido Fhezo Industrial — ${itens.length} item(ns)`,
    ipCliente,
    referenciaExterna: input.checkoutId,
    ...(input.formaPagamento === "cartao" && input.cartao && input.titularCartao
      ? {
          cartao: {
            numero: input.cartao.numero,
            nomeImpresso: input.cartao.nomeImpresso,
            mesValidade: input.cartao.validade.split("/")[0],
            anoValidade:
              input.cartao.validade.split("/")[1].length === 2
                ? "20" + input.cartao.validade.split("/")[1]
                : input.cartao.validade.split("/")[1],
            cvv: input.cartao.cvv,
          },
          titularCartao: input.titularCartao,
        }
      : {}),
  });

  if (!cobranca.sucesso) {
    if (
      cobranca.statusHttp &&
      cobranca.statusHttp >= 400 &&
      cobranca.statusHttp < 500 &&
      cobranca.statusHttp !== 408
    ) {
      await reverterEstoqueItens(supabase, itens);
      return {
        sucesso: false,
        mensagem:
          "O pagamento não foi autorizado. Confira os dados ou escolha outra forma de pagamento.",
      };
    }
    return {
      sucesso: false,
      bloqueado: true,
      mensagem:
        "Não foi possível confirmar a criação da cobrança. Não refaça a compra. Referência para conferência: " +
        input.checkoutId,
    };
  }

  const statusInicial =
    mapearStatusAsaasParaPedido(cobranca.dados.status) ?? "pendente";

  const { data: pedidoCriado, error: erroPedido } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: clienteId,
      status: statusInicial,
      total,
      forma_pagamento: input.formaPagamento,
      asaas_payment_id: cobranca.dados.id,
      frete_valor: frete.valor,
      frete_transportadora: frete.transportadora,
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
      bloqueado: true,
      mensagem:
        "O pagamento foi iniciado, mas não conseguimos registrar o pedido. Não refaça a compra. Referência: " +
        input.checkoutId,
    };
  }

  const linhasItens = itens.map((item) => ({
    pedido_id: pedidoCriado.id,
    produto_id: item.produtoId,
    quantidade: item.quantidade,
    preco_unitario: mapaProdutos.get(item.produtoId)!.preco,
  }));

  const { error: erroItens } = await supabase
    .from("pedido_itens")
    .insert(linhasItens);

  if (erroItens) {
    return {
      sucesso: false,
      bloqueado: true,
      mensagem:
        "A cobrança foi criada, mas os itens precisam de conferência. Não refaça a compra. Referência: " +
        input.checkoutId,
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
