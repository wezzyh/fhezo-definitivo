import type { StatusTicket, PrioridadeTicket } from "@/types/database";

// Rótulos e cores em pt-BR do status/prioridade do ticket — centralizados
// aqui pra listagem e página de detalhe nunca terem textos/cores
// diferentes pra o mesmo valor (mesmo padrão de src/lib/pedidos/status.ts).

export const STATUS_TICKET: StatusTicket[] = ["aberto", "em_andamento", "resolvido", "fechado"];

export const TEXTO_STATUS_TICKET: Record<StatusTicket, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

// Só usado em /admin — referencia os tokens --admin-* direto, sem fallback.
export function classesBadgeStatusTicket(status: StatusTicket): string {
  if (status === "resolvido") return "bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]";
  if (status === "fechado") return "bg-[var(--admin-surface-hover)] text-[var(--admin-text-secondary)]";
  if (status === "em_andamento") return "bg-[var(--admin-warning)]/15 text-[var(--admin-warning)]";
  return "bg-[var(--admin-danger)]/15 text-[var(--admin-danger)]"; // aberto — ainda sem nenhuma ação
}

export const PRIORIDADES_TICKET: PrioridadeTicket[] = ["alta", "normal", "baixa"];

export const TEXTO_PRIORIDADE_TICKET: Record<PrioridadeTicket, string> = {
  alta: "Alta",
  normal: "Normal",
  baixa: "Baixa",
};

/** Peso pra ordenar "prioridade/data": alta primeiro. Usado com um sort estável sobre uma lista já ordenada por data. */
export const PESO_PRIORIDADE_TICKET: Record<PrioridadeTicket, number> = {
  alta: 0,
  normal: 1,
  baixa: 2,
};

export function classesBadgePrioridadeTicket(prioridade: PrioridadeTicket): string {
  if (prioridade === "alta") return "bg-[var(--admin-danger)]/15 text-[var(--admin-danger)]";
  return "bg-[var(--admin-surface-hover)] text-[var(--admin-text-secondary)]"; // normal | baixa
}
