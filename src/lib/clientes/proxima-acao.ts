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

/** Classes Tailwind (paleta do projeto) pro badge de urgência num contexto de fundo neutro. */
export function classesUrgenciaProximaAcao(urgencia: UrgenciaProximaAcao): string {
  if (urgencia === "atrasada") return "bg-red-100 text-red-800";
  if (urgencia === "hoje_ou_amanha") return "bg-warning/15 text-dark-2";
  return "bg-zinc-100 text-muted";
}
