import { notFound } from "next/navigation";
import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { TEXTO_STATUS_PEDIDO, classesBadgeStatusPedido } from "@/lib/pedidos/status";
import { FormularioCrm } from "./formulario-crm";
import { salvarCrmCliente } from "./actions";
import type { Cliente, ClienteCrm, Pedido } from "@/types/database";

interface PaginaClientePros {
  params: Promise<{ id: string }>;
}

export default async function AdminClienteDetalhePage({ params }: PaginaClientePros) {
  const { id } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: cliente }, { data: crm }, { data: pedidos }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).maybeSingle<Cliente>(),
    supabase.from("clientes_crm").select("*").eq("cliente_id", id).maybeSingle<ClienteCrm>(),
    supabase
      .from("pedidos")
      .select("id, status, total, created_at")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false })
      .returns<Pick<Pedido, "id" | "status" | "total" | "created_at">[]>(),
  ]);

  if (!cliente) {
    notFound();
  }

  const salvarComId = salvarCrmCliente.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--admin-text)]">{cliente.nome}</h1>
          <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
            {cliente.tipo === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"} — {cliente.documento}
          </p>
        </div>
        <Link href="/admin/clientes" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--admin-text)]">Dados cadastrais</h2>
          <p className="mt-1 text-xs text-[var(--admin-text-secondary)]">
            Vêm do checkout — não fazem parte do CRM, exibidos aqui só como referência.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--admin-text-secondary)]">E-mail</dt>
              <dd className="text-[var(--admin-text)]">{cliente.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--admin-text-secondary)]">Telefone</dt>
              <dd className="text-[var(--admin-text)]">{cliente.telefone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--admin-text-secondary)]">Cliente desde</dt>
              <dd className="text-[var(--admin-text)]">{new Date(cliente.created_at).toLocaleDateString("pt-BR")}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--admin-text)]">CRM</h2>
          <p className="mt-1 text-xs text-[var(--admin-text-secondary)]">Contato, segmento, valor potencial e próxima ação.</p>
          <div className="mt-4">
            <FormularioCrm crm={crm} action={salvarComId} />
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-lg font-semibold text-[var(--admin-text)]">Histórico de pedidos</h2>

        {(!pedidos || pedidos.length === 0) && (
          <p className="mt-4 text-sm text-[var(--admin-text-secondary)]">Este cliente ainda não fez nenhum pedido.</p>
        )}

        {pedidos && pedidos.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-md border border-[var(--admin-border)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-hover)] text-xs uppercase text-[var(--admin-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => (
                  <tr
                    key={pedido.id}
                    className="border-b border-[var(--admin-border)] transition-colors duration-150 last:border-0 hover:bg-[var(--admin-surface-hover)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--admin-text-secondary)]">
                      #{pedido.id.replace(/-/g, "").slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--admin-text)]">
                      {pedido.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-secondary)]">{new Date(pedido.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classesBadgeStatusPedido(pedido.status)}`}>
                        {TEXTO_STATUS_PEDIDO[pedido.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
