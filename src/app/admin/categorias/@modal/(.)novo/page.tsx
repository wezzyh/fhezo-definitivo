import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { ModalDeRota } from "@/components/admin/modal-de-rota";
import { FormularioCategoria } from "../../formulario-categoria";
import { criarCategoria } from "../../actions";
import type { Categoria } from "@/types/database";

export default async function NovaCategoriaModal() {
  const supabase = await criarClienteSupabaseServidor();
  const { data: categorias } = await supabase.from("categorias").select("*").returns<Categoria[]>();

  return (
    <ModalDeRota titulo="Nova categoria" tamanho="sm">
      <FormularioCategoria categorias={categorias ?? []} action={criarCategoria} textoBotao="Criar categoria" />
    </ModalDeRota>
  );
}
