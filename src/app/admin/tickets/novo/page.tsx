import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { FormularioTicket } from "../formulario-ticket";
import type { Cliente, Pedido } from "@/types/database";

// Limite alto o bastante pro admin achar um pedido recente sem precisar de
// busca — mesmo raciocínio do LIMITE_TICKETS/LIMITE_PEDIDOS já usados no
// projeto (sem paginação/busca real ainda nesses seletores).
const LIMITE_PEDIDOS_SELECT = 200;

export default async function NovoTicketPage() {
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: clientes }, { data: pedidos }] = await Promise.all([
    supabase.from("clientes").select("id, nome, documento").order("nome").returns<Pick<Cliente, "id" | "nome" | "documento">[]>(),
    supabase
      .from("pedidos")
      .select("id, total, created_at, cliente:clientes(nome)")
      .order("created_at", { ascending: false })
      .limit(LIMITE_PEDIDOS_SELECT)
      .returns<(Pick<Pedido, "id" | "total" | "created_at"> & { cliente: { nome: string } | null })[]>(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Novo ticket</h1>
        <Link href="/admin/tickets" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-2xl rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <FormularioTicket clientes={clientes ?? []} pedidos={pedidos ?? []} />
      </div>
    </div>
  );
}
