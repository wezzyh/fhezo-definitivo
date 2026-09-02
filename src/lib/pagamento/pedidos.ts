import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatusPedido } from "@/types/database";
import { reverterEstoquePedido } from "./estoque";

// Mapeamento entre o status de cobrança do Asaas e o status do nosso
// pedido. Compartilhado pelo webhook (src/app/api/webhooks/asaas/route.ts,
// fonte de verdade) e pelo polling do Pix (verificarStatusPagamento em
// src/app/(site)/checkout/pagamento/actions.ts, que atualiza o mesmo jeito
// como fallback para quando o webhook não alcança o ambiente, ex.: localhost).

const STATUS_PAGOS = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
const STATUS_CANCELADOS = new Set([
  "OVERDUE",
  "REFUNDED",
  "REFUND_REQUESTED",
  "CHARGEBACK_REQUESTED",
  "CHARGEBACK_DISPUTE",
  "AWAITING_CHARGEBACK_REVERSAL",
  "DELETED",
]);

/** `null` significa "sem mudança de status" (ex.: ainda aguardando pagamento). */
export function mapearStatusAsaasParaPedido(statusAsaas: string): StatusPedido | null {
  if (STATUS_PAGOS.has(statusAsaas)) return "pago";
  if (STATUS_CANCELADOS.has(statusAsaas)) return "cancelado";
  return null;
}

/**
 * Atualiza o status do pedido correspondente a uma cobrança do Asaas. Ao
 * cancelar (boleto/Pix vencido, estorno etc.), devolve o estoque dos itens
 * — mas só na transição de verdade: o UPDATE abaixo só afeta a linha se o
 * status atual for diferente do novo E ainda não estiver cancelado
 * (`.neq(...)`), então uma segunda entrega do mesmo evento de webhook (o
 * Asaas reenvia se não receber 200 a tempo) não encontra linha para
 * atualizar e não devolve o estoque duas vezes.
 */
export async function atualizarStatusPedidoPorPagamento(
  supabase: SupabaseClient,
  asaasPaymentId: string,
  statusAsaas: string,
): Promise<StatusPedido | null> {
  const novoStatus = mapearStatusAsaasParaPedido(statusAsaas);
  if (!novoStatus) return null;

  const { data: pedidoAtualizado, error } = await supabase
    .from("pedidos")
    .update({ status: novoStatus })
    .eq("asaas_payment_id", asaasPaymentId)
    .neq("status", novoStatus)
    .neq("status", "cancelado")
    .select("id")
    .maybeSingle<{ id: string }>();

  // Sem erro e sem linha retornada = nenhum pedido mudou de status agora
  // (não encontrado, já estava nesse status, ou já estava cancelado).
  if (error || !pedidoAtualizado) return null;

  if (novoStatus === "cancelado") {
    await reverterEstoquePedido(supabase, pedidoAtualizado.id);
  }

  return novoStatus;
}
