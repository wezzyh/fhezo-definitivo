import { notFound } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { ModalDeRota } from "@/components/admin/modal-de-rota";
import { FormularioMarca } from "../../../formulario-marca";
import { atualizarMarca } from "../../../actions";
import type { Marca } from "@/types/database";

interface EditarMarcaModalProps {
  params: Promise<{ id: string }>;
}

export default async function EditarMarcaModal({ params }: EditarMarcaModalProps) {
  const { id } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const { data: marca } = await supabase.from("marcas").select("*").eq("id", id).maybeSingle<Marca>();
  if (!marca) notFound();

  const atualizarComId = atualizarMarca.bind(null, id);

  return (
    <ModalDeRota titulo="Editar marca" tamanho="sm">
      <FormularioMarca marca={marca} action={atualizarComId} textoBotao="Salvar alterações" />
    </ModalDeRota>
  );
}
