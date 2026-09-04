"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { STATUS_TICKET, PRIORIDADES_TICKET } from "@/lib/tickets/status";
import type { StatusTicket, PrioridadeTicket, AutorRespostaTicket } from "@/types/database";

export interface EstadoFormularioTicket {
  erro?: string;
}

export async function criarTicket(
  _estadoAnterior: EstadoFormularioTicket,
  formData: FormData,
): Promise<EstadoFormularioTicket> {
  const assunto = String(formData.get("assunto") ?? "").trim();
  const mensagem = String(formData.get("mensagem") ?? "").trim();
  const clienteId = String(formData.get("cliente_id") ?? "").trim() || null;
  const pedidoId = String(formData.get("pedido_id") ?? "").trim() || null;
  const prioridadeBruta = String(formData.get("prioridade") ?? "normal").trim();

  if (!assunto) return { erro: "O campo Assunto é obrigatório." };
  if (!mensagem) return { erro: "O campo Mensagem é obrigatório." };

  const prioridade: PrioridadeTicket = PRIORIDADES_TICKET.includes(prioridadeBruta as PrioridadeTicket)
    ? (prioridadeBruta as PrioridadeTicket)
    : "normal";

  const supabase = await criarClienteSupabaseServidor();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      assunto,
      mensagem,
      cliente_id: clienteId,
      pedido_id: pedidoId,
      prioridade,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !ticket) {
    return { erro: `Erro ao criar ticket: ${error?.message ?? "erro desconhecido"}` };
  }

  revalidatePath("/admin/tickets");
  revalidatePath("/admin");
  redirect(`/admin/tickets/${ticket.id}`);
}

export interface ResultadoAcaoTicket {
  sucesso: boolean;
  mensagem?: string;
}

export async function atualizarStatusTicket(
  ticketId: string,
  novoStatusBruto: string,
): Promise<ResultadoAcaoTicket> {
  if (!ticketId) return { sucesso: false, mensagem: "Ticket inválido." };

  if (!STATUS_TICKET.includes(novoStatusBruto as StatusTicket)) {
    return { sucesso: false, mensagem: "Status inválido." };
  }
  const novoStatus = novoStatusBruto as StatusTicket;

  const supabase = await criarClienteSupabaseServidor();

  const { error } = await supabase.from("tickets").update({ status: novoStatus }).eq("id", ticketId);
  if (error) return { sucesso: false, mensagem: `Erro ao atualizar status: ${error.message}` };

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath("/admin");

  return { sucesso: true };
}

export async function responderTicket(
  ticketId: string,
  autorBruto: string,
  mensagemBruta: string,
): Promise<ResultadoAcaoTicket> {
  if (!ticketId) return { sucesso: false, mensagem: "Ticket inválido." };

  const mensagem = mensagemBruta.trim();
  if (!mensagem) return { sucesso: false, mensagem: "Escreva uma mensagem antes de enviar." };

  const autor: AutorRespostaTicket = autorBruto === "cliente" ? "cliente" : "admin";

  const supabase = await criarClienteSupabaseServidor();

  const { error } = await supabase.from("ticket_respostas").insert({ ticket_id: ticketId, autor, mensagem });
  if (error) return { sucesso: false, mensagem: `Erro ao registrar resposta: ${error.message}` };

  revalidatePath(`/admin/tickets/${ticketId}`);

  return { sucesso: true };
}
