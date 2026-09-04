import { notFound } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { ModalDeRota } from "@/components/admin/modal-de-rota";
import { FormularioProduto } from "../../../formulario-produto";
import { FormularioExcluirProduto } from "../../../botao-excluir";
import { atualizarProduto } from "../../../actions";
import type { Produto, Marca, Categoria } from "@/types/database";

interface EditarProdutoModalProps {
  params: Promise<{ id: string }>;
}

export default async function EditarProdutoModal({ params }: EditarProdutoModalProps) {
  const { id } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: produtosEncontrados }, { data: marcas }, { data: categorias }] = await Promise.all([
    supabase.from("produtos").select("*").eq("id", id).limit(1).returns<Produto[]>(),
    supabase.from("marcas").select("*").order("nome").returns<Marca[]>(),
    supabase.from("categorias").select("*").returns<Categoria[]>(),
  ]);

  const produto = produtosEncontrados?.[0];
  if (!produto) notFound();

  const atualizarComId = atualizarProduto.bind(null, id);

  return (
    <ModalDeRota titulo="Editar produto" descricao={produto.nome}>
      <FormularioProduto
        produto={produto}
        marcasIniciais={marcas ?? []}
        categoriasIniciais={categorias ?? []}
        action={atualizarComId}
        textoBotao="Salvar alterações"
      />

      <div className="mt-6 flex items-center justify-between rounded-md border border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/10 px-4 py-3">
        <p className="text-sm text-[var(--admin-text-secondary)]">Excluir este produto (não pode ser desfeito).</p>
        <FormularioExcluirProduto id={id} />
      </div>
    </ModalDeRota>
  );
}
