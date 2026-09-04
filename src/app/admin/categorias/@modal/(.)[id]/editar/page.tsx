import { notFound } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { ModalDeRota } from "@/components/admin/modal-de-rota";
import { FormularioCategoria } from "../../../formulario-categoria";
import { atualizarCategoria } from "../../../actions";
import type { Categoria } from "@/types/database";

interface EditarCategoriaModalProps {
  params: Promise<{ id: string }>;
}

export default async function EditarCategoriaModal({ params }: EditarCategoriaModalProps) {
  const { id } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: categoria }, { data: categorias }] = await Promise.all([
    supabase.from("categorias").select("*").eq("id", id).maybeSingle<Categoria>(),
    supabase.from("categorias").select("*").returns<Categoria[]>(),
  ]);

  if (!categoria) notFound();

  const atualizarComId = atualizarCategoria.bind(null, id);

  return (
    <ModalDeRota titulo="Editar categoria" tamanho="sm">
      <FormularioCategoria
        categoria={categoria}
        categorias={categorias ?? []}
        action={atualizarComId}
        textoBotao="Salvar alterações"
      />
    </ModalDeRota>
  );
}
