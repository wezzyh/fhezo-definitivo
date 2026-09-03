import { notFound } from "next/navigation";
import Link from "next/link";
import { FormularioProduto } from "../../formulario-produto";
import { FormularioExcluirProduto } from "../../botao-excluir";
import { atualizarProduto } from "../../actions";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { Produto, Marca, Categoria } from "@/types/database";

interface PaginaEditarProdutoProps {
  params: Promise<{ id: string }>;
}

export default async function EditarProdutoPage({ params }: PaginaEditarProdutoProps) {
  const { id } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: produtosEncontrados }, { data: marcas }, { data: categorias }] = await Promise.all([
    supabase.from("produtos").select("*").eq("id", id).limit(1).returns<Produto[]>(),
    supabase.from("marcas").select("*").order("nome").returns<Marca[]>(),
    supabase.from("categorias").select("*").returns<Categoria[]>(),
  ]);

  const produto = produtosEncontrados?.[0];

  if (!produto) {
    notFound();
  }

  const atualizarComId = atualizarProduto.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Editar produto</h1>
        <Link
          href="/admin/produtos"
          className="text-sm font-medium text-brand-green hover:underline"
        >
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-2xl rounded-md border border-zinc-200 bg-white p-6">
        <FormularioProduto
          produto={produto}
          marcasIniciais={marcas ?? []}
          categoriasIniciais={categorias ?? []}
          action={atualizarComId}
          textoBotao="Salvar alterações"
        />
      </div>

      <div className="mt-6 max-w-2xl rounded-md border border-red-200 bg-red-50 p-6">
        <h2 className="text-sm font-semibold text-red-900">Excluir produto</h2>
        <p className="mt-1 text-sm text-red-700">Esta ação não pode ser desfeita.</p>
        <div className="mt-3">
          <FormularioExcluirProduto
            id={id}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium hover:bg-red-100"
          />
        </div>
      </div>
    </div>
  );
}
