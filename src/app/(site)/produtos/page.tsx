import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { CartaoProduto } from "@/components/produtos/cartao-produto";
import { obterSeoPublicado } from "@/lib/conteudo/consultas";
import type { Produto } from "@/types/database";
import type { Metadata } from "next";

interface ProdutoComRelacoes extends Produto {
  marca: { nome: string } | null;
  categoria: { nome: string } | null;
}

interface PaginaProdutosProps {
  searchParams: Promise<{ categoria?: string; marca?: string }>;
}

// Editável em /admin/conteudo/seo. Não varia por categoria/busca — fora do
// escopo confirmado com o usuário.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await obterSeoPublicado();
  return { title: seo.produtos.titulo, description: seo.produtos.descricao };
}

// Suporta filtro por categoria via "?categoria=<slug>" — resolve o TODO que
// existia em nav.tsx (itens de menu do tipo "categoria" geram esse link
// automaticamente, ver src/lib/conteudo/resolver-href-menu.ts). Filtro é
// exato por categoria_id — não inclui subcategorias. "?marca=<id>" segue o
// mesmo padrão pra "Compre por marca" na home (marcas não têm slug, então
// usa o id direto — ver src/components/home/faixa-marcas.tsx). Os dois
// filtros combinam entre si (AND) quando ambos vêm preenchidos.
export default async function PaginaProdutos({ searchParams }: PaginaProdutosProps) {
  const { categoria: categoriaSlug, marca: marcaId } = await searchParams;
  const supabase = await criarClienteSupabaseServidor();

  let categoriaAtual: { id: string; nome: string } | null = null;
  if (categoriaSlug) {
    const { data } = await supabase
      .from("categorias")
      .select("id, nome")
      .eq("slug", categoriaSlug)
      .maybeSingle<{ id: string; nome: string }>();
    categoriaAtual = data;
  }

  let marcaAtual: { id: string; nome: string } | null = null;
  if (marcaId) {
    const { data } = await supabase
      .from("marcas")
      .select("id, nome")
      .eq("id", marcaId)
      .maybeSingle<{ id: string; nome: string }>();
    marcaAtual = data;
  }

  let query = supabase
    .from("produtos")
    .select("*, marca:marcas(nome), categoria:categorias(nome)")
    .eq("ativo", true)
    .order("nome");

  if (categoriaAtual) {
    query = query.eq("categoria_id", categoriaAtual.id);
  }
  if (marcaAtual) {
    query = query.eq("marca_id", marcaAtual.id);
  }

  const { data: produtos, error } = await query.returns<ProdutoComRelacoes[]>();

  const titulo = categoriaAtual?.nome ?? marcaAtual?.nome ?? "Catálogo de Produtos";
  const temFiltro = Boolean(categoriaAtual || marcaAtual);

  return (
    <div className="bg-warm-100">
      <div className="mx-auto w-full max-w-store px-4 py-12 sm:px-5">
        <div className="border-b border-ink-200 pb-4">
          <h1 className="font-display text-[29px] font-semibold leading-tight text-ink-900">{titulo}</h1>
          <p className="mt-1 text-ink-500">
            {temFiltro ? (
              <Link href="/produtos" className="text-fhezo-700 hover:underline">
                Ver todos os produtos
              </Link>
            ) : (
              "Rolamentos, engrenagens, correntes, graxas, ferramentas, parafusos e porcas especiais."
            )}
          </p>
        </div>

        {error && (
          <p className="mt-6 text-sm text-fhezo-danger">
            Não foi possível carregar os produtos no momento. Tente novamente em instantes.
          </p>
        )}

        {!error && (!produtos || produtos.length === 0) && (
          <p className="mt-6 text-sm text-ink-500">
            Nenhum produto disponível no momento. Volte em breve!
          </p>
        )}

        {produtos && produtos.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {produtos.map((produto) => (
              <CartaoProduto key={produto.id} produto={produto} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
