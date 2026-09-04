import { notFound } from "next/navigation";
import Link from "next/link";
import { FormularioCategoria } from "../../formulario-categoria";
import { atualizarCategoria } from "../../actions";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { Categoria } from "@/types/database";

interface PaginaEditarCategoriaProps {
  params: Promise<{ id: string }>;
}

export default async function EditarCategoriaPage({ params }: PaginaEditarCategoriaProps) {
  const { id } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: categoria }, { data: categorias }] = await Promise.all([
    supabase.from("categorias").select("*").eq("id", id).maybeSingle<Categoria>(),
    supabase.from("categorias").select("*").returns<Categoria[]>(),
  ]);

  if (!categoria) {
    notFound();
  }

  const atualizarComId = atualizarCategoria.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Editar categoria</h1>
        <Link href="/admin/categorias" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-md rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <FormularioCategoria
          categoria={categoria}
          categorias={categorias ?? []}
          action={atualizarComId}
          textoBotao="Salvar alterações"
        />
      </div>
    </div>
  );
}
