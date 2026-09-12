import { NextResponse, type NextRequest } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { consultarCobrancaAsaas } from "@/lib/pagamento/asaas";
import { atualizarStatusPedidoPorPagamento } from "@/lib/pagamento/pedidos";
import { registrarEventoIntegracao } from "@/lib/integracoes/eventos";

// Webhook do Asaas: recebe eventos de cobrança (PAYMENT_CONFIRMED,
// PAYMENT_RECEIVED, PAYMENT_OVERDUE etc.) e atualiza o status do pedido
// correspondente. Rota pública (o Asaas não faz login no site) — a
// autenticidade da requisição é garantida pelo token de webhook configurado
// no painel do Asaas, comparado abaixo, não por sessão de usuário.
//
// Fica fora de /admin de propósito: o proxy (src/proxy.ts) só protege
// /admin/*, então essa rota não passa pela checagem de login — o que é
// exatamente o que precisamos aqui.
//
// APPSEC-028: o status NÃO é lido do corpo do webhook. A cobrança é
// consultada no Asaas do ambiente configurado (ASAAS_ENV) e é essa resposta
// que vale. Um evento de uma cobrança que não existe nesse ambiente — por
// exemplo, um evento do sandbox chegando num deploy de produção — é
// ignorado e nunca altera pedido nenhum.

const CABECALHO_TOKEN = "asaas-access-token";

interface EventoWebhookAsaas {
  event?: string;
  payment?: { id?: unknown };
}

export async function POST(request: NextRequest) {
  const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!tokenEsperado) {
    // Configuração ausente no servidor — não é um problema do Asaas, mas
    // não há como validar a origem da requisição, então recusamos.
    return NextResponse.json({ erro: "Webhook não configurado." }, { status: 500 });
  }

  const tokenRecebido = request.headers.get(CABECALHO_TOKEN);
  if (tokenRecebido !== tokenEsperado) {
    return NextResponse.json({ erro: "Token de webhook inválido." }, { status: 401 });
  }

  const corpo = (await request.json().catch(() => null)) as EventoWebhookAsaas | null;
  const paymentId = corpo?.payment?.id;

  if (typeof paymentId !== "string" || !paymentId) {
    return NextResponse.json({ erro: "Corpo do webhook inválido." }, { status: 400 });
  }

  const supabase = criarClienteSupabaseAdmin();

  const consulta = await consultarCobrancaAsaas(paymentId);

  if (!consulta.sucesso) {
    // 400/404: a cobrança não existe (ou o id não é válido) no ambiente
    // configurado — evento de outro ambiente ou lixo. Responde 200 para o
    // Asaas não reenviar indefinidamente (a fila de webhooks dele pausa
    // depois de falhas seguidas). Qualquer outra falha (401/403 = chave
    // errada, 5xx, rede, configuração inválida) responde 500: o Asaas tenta
    // de novo e o evento não se perde.
    const cobrancaInexistente = consulta.statusHttp === 400 || consulta.statusHttp === 404;

    await registrarEventoIntegracao(supabase, {
      provedor: "asaas",
      evento: "webhook_pagamento",
      sucesso: false,
      mensagemErro: cobrancaInexistente
        ? `Cobrança ${paymentId} não existe no ambiente configurado do Asaas (HTTP ${consulta.statusHttp}) — evento ignorado.`
        : `Não foi possível confirmar a cobrança ${paymentId} no Asaas: ${consulta.mensagem}`,
    });

    return cobrancaInexistente
      ? NextResponse.json({ recebido: true, ignorado: true })
      : NextResponse.json({ erro: "Falha ao confirmar a cobrança." }, { status: 500 });
  }

  if (consulta.dados.id !== paymentId) {
    await registrarEventoIntegracao(supabase, {
      provedor: "asaas",
      evento: "webhook_pagamento",
      sucesso: false,
      mensagemErro: `A consulta da cobrança ${paymentId} devolveu outra cobrança — evento ignorado.`,
    });
    return NextResponse.json({ recebido: true, ignorado: true });
  }

  try {
    await atualizarStatusPedidoPorPagamento(supabase, paymentId, consulta.dados.status);
    await registrarEventoIntegracao(supabase, {
      provedor: "asaas",
      evento: "webhook_pagamento",
      sucesso: true,
    });
  } catch (erro) {
    await registrarEventoIntegracao(supabase, {
      provedor: "asaas",
      evento: "webhook_pagamento",
      sucesso: false,
      mensagemErro: erro instanceof Error ? erro.message : "Erro desconhecido ao processar o webhook.",
    });
    return NextResponse.json({ erro: "Falha ao processar o webhook." }, { status: 500 });
  }

  // Sempre 200 quando o token é válido, mesmo se nenhum pedido correspondeu
  // (ex.: cobrança de teste) — evita que o Asaas fique reenviando o mesmo
  // evento indefinidamente.
  return NextResponse.json({ recebido: true });
}
