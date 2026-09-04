// Classificação visual da urgência de "proxima_acao_data" — usada tanto
// na listagem (/admin/clientes) quanto, futuramente, em qualquer outro
// lugar que precise destacar uma ação atrasada. Recebe as datas de
// referência já calculadas (hoje/amanhã) em vez de ler o relógio aqui,
// pelo mesmo motivo de src/lib/data/tempo.ts: mantém a leitura do relógio
// isolada numa função só, fora do corpo de componentes.

export type UrgenciaProximaAcao = "atrasada" | "hoje_ou_amanha" | "futura" | "sem_data";

export function calcularUrgenciaProximaAcao(
  proximaAcaoData: string | null,
  hojeIso: string,
  amanhaIso: string,
): UrgenciaProximaAcao {
  if (!proximaAcaoData) return "sem_data";
  if (proximaAcaoData < hojeIso) return "atrasada";
  if (proximaAcaoData === hojeIso || proximaAcaoData === amanhaIso) return "hoje_ou_amanha";
  return "futura";
}

// Só usado em /admin/clientes — referencia os tokens --admin-* direto, sem fallback.
export function classesUrgenciaProximaAcao(urgencia: UrgenciaProximaAcao): string {
  if (urgencia === "atrasada") return "bg-[var(--admin-danger)]/15 text-[var(--admin-danger)]";
  if (urgencia === "hoje_ou_amanha") return "bg-[var(--admin-warning)]/15 text-[var(--admin-warning)]";
  return "bg-[var(--admin-surface-hover)] text-[var(--admin-text-secondary)]";
}
