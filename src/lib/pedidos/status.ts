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

/** Classes Tailwind (paleta do projeto) pro badge de status num contexto de fundo neutro. */
export function classesBadgeStatusPedido(status: StatusPedido): string {
  if (status === "entregue" || status === "pago") return "bg-brand-green/10 text-brand-green-dark";
  if (status === "cancelado") return "bg-red-100 text-red-800";
  if (status === "em_separacao" || status === "enviado") return "bg-warning/15 text-dark-2";
  return "bg-zinc-200 text-muted"; // pendente
}
