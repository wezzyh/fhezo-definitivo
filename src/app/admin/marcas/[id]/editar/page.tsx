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
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Editar marca</h1>
        <Link href="/admin/marcas" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-md rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <FormularioMarca marca={marca} action={atualizarComId} textoBotao="Salvar alterações" />
      </div>
    </div>
  );
}
