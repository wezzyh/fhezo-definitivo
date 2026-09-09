import { notFound } from "next/navigation";
import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { FormularioPagina } from "../../formulario-pagina";
import { atualizarPagina } from "../../actions";
import type { PaginaInstitucional } from "@/types/database";

interface EditarPaginaPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarPaginaPage({ params }: EditarPaginaPageProps) {
  const { id } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const { data: pagina } = await supabase
    .from("paginas_institucionais")
    .select("*")
    .eq("id", id)
    .maybeSingle<PaginaInstitucional>();

  if (!pagina) notFound();

  const atualizarComId = atualizarPagina.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Editar página institucional</h1>
        <Link
          href="/admin/conteudo/paginas"
          className="text-sm font-medium text-[var(--admin-green-text)] hover:underline"
        >
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-2xl rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <FormularioPagina pagina={pagina} action={atualizarComId} textoBotao="Salvar alterações" />
      </div>
    </div>
  );
}
