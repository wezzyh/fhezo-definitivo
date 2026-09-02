import { NextResponse, type NextRequest } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { atualizarStatusPedidoPorPagamento } from "@/lib/pagamento/pedidos";

// Webhook do Asaas: recebe eventos de cobrança (PAYMENT_CONFIRMED,
// PAYMENT_RECEIVED, PAYMENT_OVERDUE etc.) e atualiza o status do pedido
// correspondente. Rota pública (o Asaas não faz login no site) — a
// autenticidade da requisição é garantida pelo token de webhook configurado
// no painel do Asaas, comparado abaixo, não por sessão de usuário.
//
// Fica fora de /admin de propósito: o proxy (src/proxy.ts) só protege
// /admin/*, então essa rota não passa pela checagem de login — o que é
// exatamente o que precisamos aqui.

const CABECALHO_TOKEN = "asaas-access-token";

interface EventoWebhookAsaas {
  event?: string;
  payment?: { id?: string; status?: string };
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
  const status = corpo?.payment?.status;

  if (!paymentId || !status) {
    return NextResponse.json({ erro: "Corpo do webhook inválido." }, { status: 400 });
  }

  try {
    const supabase = criarClienteSupabaseAdmin();
    await atualizarStatusPedidoPorPagamento(supabase, paymentId, status);
  } catch {
    return NextResponse.json({ erro: "Falha ao processar o webhook." }, { status: 500 });
  }

  // Sempre 200 quando o token é válido, mesmo se nenhum pedido correspondeu
  // (ex.: cobrança de teste) — evita que o Asaas fique reenviando o mesmo
  // evento indefinidamente.
  return NextResponse.json({ recebido: true });
}
