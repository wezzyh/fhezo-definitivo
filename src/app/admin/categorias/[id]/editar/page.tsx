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
        <h1 className="text-xl font-semibold text-ink">Editar categoria</h1>
        <Link href="/admin/categorias" className="text-sm font-medium text-brand-green hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-md rounded-md border border-zinc-200 bg-white p-6">
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
