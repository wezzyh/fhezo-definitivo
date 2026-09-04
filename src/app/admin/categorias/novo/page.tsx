import Link from "next/link";
import { FormularioCategoria } from "../formulario-categoria";
import { criarCategoria } from "../actions";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { Categoria } from "@/types/database";

export default async function NovaCategoriaPage() {
  const supabase = await criarClienteSupabaseServidor();
  const { data: categorias } = await supabase.from("categorias").select("*").returns<Categoria[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Nova categoria</h1>
        <Link href="/admin/categorias" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-md rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <FormularioCategoria categorias={categorias ?? []} action={criarCategoria} textoBotao="Criar categoria" />
      </div>
    </div>
  );
}
