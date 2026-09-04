import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { ModalDeRota } from "@/components/admin/modal-de-rota";
import { FormularioProduto } from "../../formulario-produto";
import { criarProduto } from "../../actions";
import type { Marca, Categoria } from "@/types/database";

export default async function NovoProdutoModal() {
  const supabase = await criarClienteSupabaseServidor();
  const [{ data: marcas }, { data: categorias }] = await Promise.all([
    supabase.from("marcas").select("*").order("nome").returns<Marca[]>(),
    supabase.from("categorias").select("*").returns<Categoria[]>(),
  ]);

  return (
    <ModalDeRota titulo="Novo produto">
      <FormularioProduto
        marcasIniciais={marcas ?? []}
        categoriasIniciais={categorias ?? []}
        action={criarProduto}
        textoBotao="Criar produto"
      />
    </ModalDeRota>
  );
}
