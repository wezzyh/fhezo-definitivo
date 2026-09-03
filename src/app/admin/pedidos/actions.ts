"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { StatusPedido } from "@/types/database";

// Atualização MANUAL do status de envio de um pedido (Em separação /
// Enviado / Entregue) — ver /admin/pedidos. De propósito só cobre a
// sub-esteira de envio, depois do pagamento: status de PAGAMENTO
// (pendente/pago/cancelado) é controlado exclusivamente pelo webhook do
// Asaas (src/app/api/webhooks/asaas/route.ts), que também reverte
// estoque ao cancelar — deixar essa ação mexer nesses status abriria dois
// caminhos divergentes pro mesmo dado, com risco de reversão de estoque
// duplicada ou pedido "cancelado" manualmente sem o Asaas saber.

const STATUS_ENVIO_PERMITIDOS: StatusPedido[] = ["em_separacao", "enviado", "entregue"];
const STATUS_ORIGEM_PERMITIDOS: StatusPedido[] = ["pago", "em_separacao", "enviado", "entregue"];

export interface ResultadoAtualizarStatusEnvio {
  sucesso: boolean;
  mensagem?: string;
}

export async function atualizarStatusEnvioPedido(
  pedidoId: string,
  novoStatusBruto: string,
): Promise<ResultadoAtualizarStatusEnvio> {
  if (!pedidoId) return { sucesso: false, mensagem: "Pedido inválido." };

  if (!STATUS_ENVIO_PERMITIDOS.includes(novoStatusBruto as StatusPedido)) {
    return { sucesso: false, mensagem: "Status inválido para esta ação." };
  }
  const novoStatus = novoStatusBruto as StatusPedido;

  const supabase = await criarClienteSupabaseServidor();

  // Revalida no servidor o status ATUAL do pedido — nunca confia que o
  // status mostrado no formulário do client ainda é o mesmo agora (ex.:
  // o pedido pode ter sido cancelado pelo Asaas entre a tela carregar e o
  // admin clicar em salvar).
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, status")
    .eq("id", pedidoId)
    .maybeSingle<{ id: string; status: StatusPedido }>();

  if (!pedido) return { sucesso: false, mensagem: "Pedido não encontrado." };
  if (!STATUS_ORIGEM_PERMITIDOS.includes(pedido.status)) {
    return {
      sucesso: false,
      mensagem: `Não é possível atualizar o status de envio de um pedido "${pedido.status}".`,
    };
  }

  const { error } = await supabase.from("pedidos").update({ status: novoStatus }).eq("id", pedidoId);
  if (error) return { sucesso: false, mensagem: `Erro ao atualizar: ${error.message}` };

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");

  return { sucesso: true };
}
