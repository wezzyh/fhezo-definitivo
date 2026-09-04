import type { StatusPedido } from "@/types/database";

// Rótulos em pt-BR do status do pedido — compartilhado entre a página de
// confirmação do cliente (src/app/(site)/checkout/confirmacao/page.tsx) e
// as telas do admin (/admin/pedidos, dashboard), pra nunca ter dois textos
// diferentes pro mesmo status.
export const TEXTO_STATUS_PEDIDO: Record<StatusPedido, string> = {
  pendente: "Aguardando confirmação de pagamento",
  pago: "Pagamento confirmado",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

// Só usado em /admin (a página de confirmação do cliente usa só
// TEXTO_STATUS_PEDIDO, nunca esta função) — referencia os tokens
// --admin-* direto, sem fallback.
export function classesBadgeStatusPedido(status: StatusPedido): string {
  if (status === "entregue" || status === "pago") return "bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]";
  if (status === "cancelado") return "bg-[var(--admin-danger)]/15 text-[var(--admin-danger)]";
  if (status === "em_separacao" || status === "enviado") return "bg-[var(--admin-warning)]/15 text-[var(--admin-warning)]";
  return "bg-[var(--admin-surface-hover)] text-[var(--admin-text-secondary)]"; // pendente
}
