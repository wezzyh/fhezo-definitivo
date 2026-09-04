import Link from "next/link";
import { FormularioProduto } from "../formulario-produto";
import { criarProduto } from "../actions";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { Marca, Categoria } from "@/types/database";

export default async function NovoProdutoPage() {
  const supabase = await criarClienteSupabaseServidor();
  const [{ data: marcas }, { data: categorias }] = await Promise.all([
    supabase.from("marcas").select("*").order("nome").returns<Marca[]>(),
    supabase.from("categorias").select("*").returns<Categoria[]>(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Novo produto</h1>
        <Link
          href="/admin/produtos"
          className="text-sm font-medium text-[var(--admin-green-text)] hover:underline"
        >
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-2xl rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <FormularioProduto
          marcasIniciais={marcas ?? []}
          categoriasIniciais={categorias ?? []}
          action={criarProduto}
          textoBotao="Criar produto"
        />
      </div>
    </div>
  );
}
