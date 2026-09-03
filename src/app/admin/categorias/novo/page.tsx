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
        <h1 className="text-xl font-semibold text-ink">Nova categoria</h1>
        <Link href="/admin/categorias" className="text-sm font-medium text-brand-green hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-md rounded-md border border-zinc-200 bg-white p-6">
        <FormularioCategoria categorias={categorias ?? []} action={criarCategoria} textoBotao="Criar categoria" />
      </div>
    </div>
  );
}
