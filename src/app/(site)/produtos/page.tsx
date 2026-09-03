import Link from "next/link";
import { Card } from "@/components/ui/card";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { Produto } from "@/types/database";

interface ProdutoComRelacoes extends Produto {
  marca: { nome: string } | null;
  categoria: { nome: string } | null;
}

interface PaginaProdutosProps {
  searchParams: Promise<{ categoria?: string }>;
}

// Suporta filtro por categoria via "?categoria=<slug>" — resolve o TODO que
// existia em nav.tsx (itens de menu do tipo "categoria" geram esse link
// automaticamente, ver src/lib/conteudo/resolver-href-menu.ts). Filtro é
// exato por categoria_id — não inclui subcategorias.
export default async function PaginaProdutos({ searchParams }: PaginaProdutosProps) {
  const { categoria: categoriaSlug } = await searchParams;
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

  let query = supabase
    .from("produtos")
    .select("*, marca:marcas(nome), categoria:categorias(nome)")
    .eq("ativo", true)
    .order("nome");

  if (categoriaAtual) {
    query = query.eq("categoria_id", categoriaAtual.id);
  }

  const { data: produtos, error } = await query.returns<ProdutoComRelacoes[]>();

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-semibold text-ink">{categoriaAtual ? categoriaAtual.nome : "Catálogo de Produtos"}</h1>
        <p className="mt-1 text-muted">
          {categoriaAtual ? (
            <Link href="/produtos" className="text-brand-green hover:underline">
              Ver todos os produtos
            </Link>
          ) : (
            "Rolamentos, engrenagens, correntes, graxas, ferramentas, parafusos e porcas especiais."
          )}
        </p>

        {error && (
          <p className="mt-6 text-sm text-red-600">
            Não foi possível carregar os produtos no momento. Tente novamente em instantes.
          </p>
        )}

        {!error && (!produtos || produtos.length === 0) && (
          <p className="mt-6 text-sm text-muted">
            Nenhum produto disponível no momento. Volte em breve!
          </p>
        )}

        {produtos && produtos.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {produtos.map((produto) => (
              <Link key={produto.id} href={`/produtos/${produto.id}`}>
                <Card className="h-full transition-shadow hover:shadow-sm">
                  {produto.imagem_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária cadastrada pelo admin, sem domínio fixo para next/image.
                    <img
                      src={produto.imagem_url}
                      alt={produto.nome}
                      className="mb-3 aspect-square w-full rounded-md object-cover"
                    />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-brand-green">
                      {produto.categoria?.nome ?? "Sem categoria"}
                    </span>
                    {produto.marca?.nome && (
                      <span className="text-xs font-medium text-muted">{produto.marca.nome}</span>
                    )}
                  </div>
                  <h2 className="mt-2 font-medium text-ink">{produto.nome}</h2>
                  <p className="mt-1 text-xs font-medium text-muted">SKU: {produto.sku}</p>
                  <p className="mt-4 text-lg font-medium text-ink">
                    {produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="mt-1 text-xs font-medium text-muted">
                    {produto.estoque} unidades em estoque
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
