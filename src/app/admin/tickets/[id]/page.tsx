import { notFound } from "next/navigation";
import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import {
  TEXTO_STATUS_TICKET,
  TEXTO_PRIORIDADE_TICKET,
  classesBadgeStatusTicket,
  classesBadgePrioridadeTicket,
} from "@/lib/tickets/status";
import { FormularioStatusTicket } from "./formulario-status-ticket";
import { FormularioResposta } from "./formulario-resposta";
import type { Ticket, TicketResposta, Cliente, Pedido } from "@/types/database";

interface PaginaTicketProps {
  params: Promise<{ id: string }>;
}

interface TicketComRelacoes extends Ticket {
  cliente: Pick<Cliente, "id" | "nome" | "email" | "telefone"> | null;
  pedido: Pick<Pedido, "id" | "total" | "created_at"> | null;
}

export default async function AdminTicketDetalhePage({ params }: PaginaTicketProps) {
  const { id } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: ticket }, { data: respostas }] = await Promise.all([
    supabase
      .from("tickets")
      .select("*, cliente:clientes(id, nome, email, telefone), pedido:pedidos(id, total, created_at)")
      .eq("id", id)
      .maybeSingle<TicketComRelacoes>(),
    supabase
      .from("ticket_respostas")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true })
      .returns<TicketResposta[]>(),
  ]);

  if (!ticket) {
    notFound();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)]">{ticket.assunto}</h1>
          <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
            Aberto em {new Date(ticket.created_at).toLocaleString("pt-BR")}
            {ticket.updated_at !== ticket.created_at &&
              ` — última atualização em ${new Date(ticket.updated_at).toLocaleString("pt-BR")}`}
          </p>
        </div>
        <Link href="/admin/tickets" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classesBadgeStatusTicket(ticket.status)}`}>
          {TEXTO_STATUS_TICKET[ticket.status]}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${classesBadgePrioridadeTicket(ticket.prioridade)}`}
        >
          Prioridade {TEXTO_PRIORIDADE_TICKET[ticket.prioridade]}
        </span>
        <FormularioStatusTicket ticketId={ticket.id} statusAtual={ticket.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--admin-text)]">Conversa</h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-3">
                <div className="flex items-center justify-between text-xs text-[var(--admin-text-secondary)]">
                  <span className="font-medium text-[var(--admin-text)]">Relato inicial</span>
                  <span>{new Date(ticket.created_at).toLocaleString("pt-BR")}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--admin-text)]">{ticket.mensagem}</p>
              </div>

              {respostas?.map((resposta) => (
                <div
                  key={resposta.id}
                  className={`rounded-md border p-3 ${
                    resposta.autor === "admin"
                      ? "border-[var(--admin-green)]/30 bg-[var(--admin-green)]/10"
                      : "border-[var(--admin-border)] bg-[var(--admin-surface)]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-[var(--admin-text-secondary)]">
                    <span className="font-medium text-[var(--admin-text)]">{resposta.autor === "admin" ? "Admin" : "Cliente"}</span>
                    <span>{new Date(resposta.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--admin-text)]">{resposta.mensagem}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-[var(--admin-border)] pt-4">
              <FormularioResposta ticketId={ticket.id} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Cliente</h2>
            {ticket.cliente ? (
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-[var(--admin-text-secondary)]">Nome</dt>
                  <dd className="text-[var(--admin-text)]">
                    <Link href={`/admin/clientes/${ticket.cliente.id}`} className="text-[var(--admin-green-text)] hover:underline">
                      {ticket.cliente.nome}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--admin-text-secondary)]">E-mail</dt>
                  <dd className="text-[var(--admin-text)]">{ticket.cliente.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--admin-text-secondary)]">Telefone</dt>
                  <dd className="text-[var(--admin-text)]">{ticket.cliente.telefone ?? "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-[var(--admin-text-secondary)]">Cliente ainda não cadastrado.</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-[var(--admin-text)]">Pedido relacionado</h2>
            {ticket.pedido ? (
              <p className="mt-3 text-sm text-[var(--admin-text)]">
                #{ticket.pedido.id.replace(/-/g, "").slice(0, 8).toUpperCase()} —{" "}
                {ticket.pedido.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                <br />
                <span className="text-xs text-[var(--admin-text-secondary)]">
                  {new Date(ticket.pedido.created_at).toLocaleDateString("pt-BR")}
                </span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-[var(--admin-text-secondary)]">Nenhum pedido vinculado.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
