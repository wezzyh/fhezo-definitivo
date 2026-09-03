import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { TEXTO_STATUS_PEDIDO, classesBadgeStatusPedido } from "@/lib/pedidos/status";
import { FormularioStatusEnvio } from "./formulario-status-envio";
import type { Pedido, StatusPedido } from "@/types/database";

const STATUS_VALIDOS: StatusPedido[] = ["pendente", "pago", "em_separacao", "enviado", "entregue", "cancelado"];
const STATUS_COM_ENVIO_EDITAVEL: StatusPedido[] = ["pago", "em_separacao", "enviado", "entregue"];

// Sem paginação de verdade ainda — lista simples com um limite alto,
// suficiente para o volume atual. Se o número de pedidos crescer bastante,
// vale aplicar o mesmo padrão de paginação real já usado em
// /admin/produtos (range + count).
const LIMITE_PEDIDOS = 200;

interface PedidoComCliente extends Pedido {
  cliente: { nome: string } | null;
}

interface AdminPedidosPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminPedidosPage({ searchParams }: AdminPedidosPageProps) {
  const { status: statusBruto } = await searchParams;
  const statusFiltro = STATUS_VALIDOS.includes(statusBruto as StatusPedido) ? (statusBruto as StatusPedido) : null;

  const supabase = await criarClienteSupabaseServidor();

  let query = supabase
    .from("pedidos")
    .select("*, cliente:clientes(nome)")
    .order("created_at", { ascending: false })
    .limit(LIMITE_PEDIDOS);

  if (statusFiltro) query = query.eq("status", statusFiltro);

  const { data: pedidos, error } = await query.returns<PedidoComCliente[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Pedidos</h1>
        <Link href="/admin" className="text-sm font-medium text-brand-green hover:underline">
          Voltar ao dashboard
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/pedidos"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !statusFiltro
              ? "border-brand-green bg-brand-green/10 text-brand-green-dark"
              : "border-zinc-300 text-muted hover:border-brand-green hover:text-brand-green"
          }`}
        >
          Todos
        </Link>
        {STATUS_VALIDOS.map((status) => (
          <Link
            key={status}
            href={`/admin/pedidos?status=${status}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              statusFiltro === status
                ? "border-brand-green bg-brand-green/10 text-brand-green-dark"
                : "border-zinc-300 text-muted hover:border-brand-green hover:text-brand-green"
            }`}
          >
            {TEXTO_STATUS_PEDIDO[status]}
          </Link>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">Erro ao carregar pedidos: {error.message}</p>}

      {!error && (!pedidos || pedidos.length === 0) && (
        <p className="mt-6 text-sm text-muted">Nenhum pedido encontrado com esse filtro.</p>
      )}

      {pedidos && pedidos.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Atualizar envio</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-muted">
                    #{pedido.id.replace(/-/g, "").slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{pedido.cliente?.nome ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {pedido.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(pedido.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${classesBadgeStatusPedido(pedido.status)}`}
                    >
                      {TEXTO_STATUS_PEDIDO[pedido.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {STATUS_COM_ENVIO_EDITAVEL.includes(pedido.status) ? (
                      <FormularioStatusEnvio pedidoId={pedido.id} statusAtual={pedido.status} />
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
