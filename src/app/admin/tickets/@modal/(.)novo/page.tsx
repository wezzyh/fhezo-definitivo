import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { ModalDeRota } from "@/components/admin/modal-de-rota";
import { FormularioTicket } from "../../formulario-ticket";
import type { Cliente, Pedido } from "@/types/database";

const LIMITE_PEDIDOS_SELECT = 200;

export default async function NovoTicketModal() {
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
    <ModalDeRota titulo="Novo ticket">
      <FormularioTicket clientes={clientes ?? []} pedidos={pedidos ?? []} />
    </ModalDeRota>
  );
}
