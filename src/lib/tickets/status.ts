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

export function classesBadgeStatusTicket(status: StatusTicket): string {
  if (status === "resolvido") return "bg-brand-green/10 text-brand-green-dark";
  if (status === "fechado") return "bg-zinc-200 text-muted";
  if (status === "em_andamento") return "bg-warning/15 text-dark-2";
  return "bg-red-100 text-red-800"; // aberto — ainda sem nenhuma ação
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
  if (prioridade === "alta") return "bg-red-100 text-red-800";
  return "bg-zinc-100 text-muted"; // normal | baixa
}
