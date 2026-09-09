import { notFound } from "next/navigation";
import Link from "next/link";
import { FormularioProduto } from "../../formulario-produto";
import { FormularioExcluirProduto } from "../../botao-excluir";
import { atualizarProduto } from "../../actions";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { Produto, Marca, Categoria, ProdutoImagem } from "@/types/database";

interface PaginaEditarProdutoProps {
  params: Promise<{ id: string }>;
}

export default async function EditarProdutoPage({ params }: PaginaEditarProdutoProps) {
  const { id } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: produtosEncontrados }, { data: marcas }, { data: categorias }, { data: imagensGaleria }] =
    await Promise.all([
      supabase.from("produtos").select("*").eq("id", id).limit(1).returns<Produto[]>(),
      supabase.from("marcas").select("*").order("nome").returns<Marca[]>(),
      supabase.from("categorias").select("*").returns<Categoria[]>(),
      supabase
        .from("produto_imagens")
        .select("*")
        .eq("produto_id", id)
        .order("posicao")
        .returns<ProdutoImagem[]>(),
    ]);

  const produto = produtosEncontrados?.[0];

  if (!produto) {
    notFound();
  }

  const atualizarComId = atualizarProduto.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Editar produto</h1>
        <Link
          href="/admin/produtos"
          className="text-sm font-medium text-[var(--admin-green-text)] hover:underline"
        >
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-2xl rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <FormularioProduto
          produto={produto}
          imagensGaleria={imagensGaleria ?? []}
          marcasIniciais={marcas ?? []}
          categoriasIniciais={categorias ?? []}
          action={atualizarComId}
          textoBotao="Salvar alterações"
        />
      </div>

      <div className="mt-6 max-w-2xl rounded-md border border-[var(--admin-danger)]/30 bg-[var(--admin-danger)]/10 p-6">
        <h2 className="text-sm font-semibold text-[var(--admin-danger)]">Excluir produto</h2>
        <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">Esta ação não pode ser desfeita.</p>
        <div className="mt-3">
          <FormularioExcluirProduto
            id={id}
            className="rounded-md border border-[var(--admin-danger)]/40 bg-[var(--admin-surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--admin-danger)]/15"
          />
        </div>
      </div>
    </div>
  );
}
