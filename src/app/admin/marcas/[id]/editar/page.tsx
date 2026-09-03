import { notFound } from "next/navigation";
import Link from "next/link";
import { FormularioMarca } from "../../formulario-marca";
import { atualizarMarca } from "../../actions";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { Marca } from "@/types/database";

interface PaginaEditarMarcaProps {
  params: Promise<{ id: string }>;
}

export default async function EditarMarcaPage({ params }: PaginaEditarMarcaProps) {
  const { id } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const { data: marca } = await supabase
    .from("marcas")
    .select("*")
    .eq("id", id)
    .maybeSingle<Marca>();

  if (!marca) {
    notFound();
  }

  const atualizarComId = atualizarMarca.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Editar marca</h1>
        <Link href="/admin/marcas" className="text-sm font-medium text-brand-green hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-md rounded-md border border-zinc-200 bg-white p-6">
        <FormularioMarca marca={marca} action={atualizarComId} textoBotao="Salvar alterações" />
      </div>
    </div>
  );
}
