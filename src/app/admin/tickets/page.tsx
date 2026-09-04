import Link from "next/link";
import { Button } from "@/components/ui/button";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import {
  STATUS_TICKET,
  PRIORIDADES_TICKET,
  TEXTO_STATUS_TICKET,
  TEXTO_PRIORIDADE_TICKET,
  PESO_PRIORIDADE_TICKET,
  classesBadgeStatusTicket,
  classesBadgePrioridadeTicket,
} from "@/lib/tickets/status";
import type { StatusTicket, PrioridadeTicket, Ticket } from "@/types/database";

// Sem paginação de verdade ainda, mesmo padrão de /admin/pedidos — limite
// alto o bastante pro volume atual de um módulo recém-criado.
const LIMITE_TICKETS = 300;

interface TicketComCliente extends Ticket {
  cliente: { nome: string } | null;
}

interface AdminTicketsPageProps {
  searchParams: Promise<{ status?: string; prioridade?: string }>;
}

export default async function AdminTicketsPage({ searchParams }: AdminTicketsPageProps) {
  const { status: statusBruto, prioridade: prioridadeBruta } = await searchParams;

  const statusFiltro = STATUS_TICKET.includes(statusBruto as StatusTicket) ? (statusBruto as StatusTicket) : null;
  const prioridadeFiltro = PRIORIDADES_TICKET.includes(prioridadeBruta as PrioridadeTicket)
    ? (prioridadeBruta as PrioridadeTicket)
    : null;

  const supabase = await criarClienteSupabaseServidor();

  let query = supabase
    .from("tickets")
    .select("*, cliente:clientes(nome)")
    .order("created_at", { ascending: false })
    .limit(LIMITE_TICKETS);

  if (statusFiltro) query = query.eq("status", statusFiltro);
  if (prioridadeFiltro) query = query.eq("prioridade", prioridadeFiltro);

  const { data: ticketsBrutos, error } = await query.returns<TicketComCliente[]>();

  // Ordenado por prioridade (alta primeiro) e, dentro da mesma
  // prioridade, por data (mais recente primeiro) — a query acima já traz
  // ordenado por data, e Array.prototype.sort é estável, então basta
  // reordenar só pelo peso da prioridade pra preservar a ordem de data
  // dentro de cada grupo.
  const tickets = ticketsBrutos
    ? [...ticketsBrutos].sort((a, b) => PESO_PRIORIDADE_TICKET[a.prioridade] - PESO_PRIORIDADE_TICKET[b.prioridade])
    : null;

  function construirHrefFiltro(filtro: { status: StatusTicket | null; prioridade: PrioridadeTicket | null }): string {
    const params = new URLSearchParams();
    if (filtro.status) params.set("status", filtro.status);
    if (filtro.prioridade) params.set("prioridade", filtro.prioridade);
    const texto = params.toString();
    return `/admin/tickets${texto ? `?${texto}` : ""}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Tickets de suporte</h1>
        <Link href="/admin/tickets/novo">
          <Button variant="primary">+ Novo ticket</Button>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href={construirHrefFiltro({ status: null, prioridade: prioridadeFiltro })}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              !statusFiltro
                ? "border-[var(--admin-green)] bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]"
                : "border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-green)] hover:text-[var(--admin-text)]"
            }`}
          >
            Todos os status
          </Link>
          {STATUS_TICKET.map((status) => (
            <Link
              key={status}
              href={construirHrefFiltro({ status, prioridade: prioridadeFiltro })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                statusFiltro === status
                  ? "border-[var(--admin-green)] bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]"
                  : "border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-green)] hover:text-[var(--admin-text)]"
              }`}
            >
              {TEXTO_STATUS_TICKET[status]}
            </Link>
          ))}
        </div>

        <span className="text-[var(--admin-border-strong)]">|</span>

        <div className="flex flex-wrap gap-2">
          <Link
            href={construirHrefFiltro({ status: statusFiltro, prioridade: null })}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              !prioridadeFiltro
                ? "border-[var(--admin-green)] bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]"
                : "border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-green)] hover:text-[var(--admin-text)]"
            }`}
          >
            Todas as prioridades
          </Link>
          {PRIORIDADES_TICKET.map((prioridade) => (
            <Link
              key={prioridade}
              href={construirHrefFiltro({ status: statusFiltro, prioridade })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                prioridadeFiltro === prioridade
                  ? "border-[var(--admin-green)] bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]"
                  : "border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-green)] hover:text-[var(--admin-text)]"
              }`}
            >
              {TEXTO_PRIORIDADE_TICKET[prioridade]}
            </Link>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-[var(--admin-danger)]">Erro ao carregar tickets: {error.message}</p>}

      {!error && (!tickets || tickets.length === 0) && (
        <p className="mt-6 text-sm text-[var(--admin-text-secondary)]">Nenhum ticket encontrado com esses filtros.</p>
      )}

      {tickets && tickets.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-hover)] text-xs uppercase text-[var(--admin-text-secondary)]">
              <tr>
                <th className="px-4 py-3 font-medium">Assunto</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Prioridade</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Aberto em</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-b border-[var(--admin-border)] transition-colors duration-150 last:border-0 hover:bg-[var(--admin-surface-hover)]"
                >
                  <td className="px-4 py-3 font-medium text-[var(--admin-text)]">
                    <Link
                      href={`/admin/tickets/${ticket.id}`}
                      className="hover:text-[var(--admin-green-text)] hover:underline"
                    >
                      {ticket.assunto}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-text-secondary)]">{ticket.cliente?.nome ?? "Não cadastrado"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${classesBadgePrioridadeTicket(ticket.prioridade)}`}
                    >
                      {TEXTO_PRIORIDADE_TICKET[ticket.prioridade]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${classesBadgeStatusTicket(ticket.status)}`}
                    >
                      {TEXTO_STATUS_TICKET[ticket.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-text-secondary)]">{new Date(ticket.created_at).toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
