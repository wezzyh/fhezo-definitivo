import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type {
  SecaoHero as TipoSecaoHero,
  SecaoCategoriasDestaque as TipoSecaoCategoriasDestaque,
  SecaoProdutosDestaque as TipoSecaoProdutosDestaque,
} from "@/lib/conteudo/tipos";
import type { Categoria, Produto } from "@/types/database";

// Uma seção da home por tipo — cada uma é seu próprio Server Component
// (async quando precisa buscar dado), renderizada a partir do array
// "secoes" de conteudo_site (tipo "home") em page.tsx. Editável em
// /admin/conteudo/home.

export function SecaoHero({ secao }: { secao: TipoSecaoHero }) {
  return (
    <section className="bg-dark text-white">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">{secao.titulo}</h1>
        <p className="mt-4 max-w-xl text-zinc-300">{secao.subtitulo}</p>
        <div className="mt-8">
          <Link href={secao.cta_href}>
            <Button variant="primary">{secao.cta_texto}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export async function SecaoCategoriasDestaque({ secao }: { secao: TipoSecaoCategoriasDestaque }) {
  if (secao.categoria_ids.length === 0) return null;

  const supabase = await criarClienteSupabaseServidor();
  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nome, slug")
    .in("id", secao.categoria_ids)
    .eq("ativo", true)
    .returns<Pick<Categoria, "id" | "nome" | "slug">[]>();

  if (!categorias || categorias.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-2xl font-semibold text-ink">{secao.titulo}</h2>
      {secao.subtitulo && <p className="mt-1 text-muted">{secao.subtitulo}</p>}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {categorias.map((categoria) => (
          <Link key={categoria.id} href={`/produtos?categoria=${categoria.slug}`}>
            <Card className="text-center transition-shadow hover:shadow-sm">
              <span className="font-medium text-ink">{categoria.nome}</span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export async function SecaoProdutosDestaque({ secao }: { secao: TipoSecaoProdutosDestaque }) {
  const supabase = await criarClienteSupabaseServidor();

  let query = supabase.from("produtos").select("*, categoria:categorias(nome)").eq("ativo", true);

  if (secao.modo === "manual") {
    if (secao.produto_ids.length === 0) return null;
    query = query.in("id", secao.produto_ids);
  } else {
    if (secao.categoria_id) query = query.eq("categoria_id", secao.categoria_id);
    query = query.order("created_at", { ascending: false }).limit(secao.limite);
  }

  const { data: produtos } = await query.returns<(Produto & { categoria: { nome: string } | null })[]>();
  if (!produtos || produtos.length === 0) return null;

  const produtosOrdenados =
    secao.modo === "manual"
      ? secao.produto_ids
          .map((id) => produtos.find((produto) => produto.id === id))
          .filter((produto): produto is NonNullable<typeof produto> => Boolean(produto))
      : produtos;

  if (produtosOrdenados.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-2xl font-semibold text-ink">{secao.titulo}</h2>
      {secao.subtitulo && <p className="mt-1 text-muted">{secao.subtitulo}</p>}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {produtosOrdenados.map((produto) => (
          <Link key={produto.id} href={`/produtos/${produto.id}`}>
            <Card className="h-full transition-shadow hover:shadow-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-brand-green">
                {produto.categoria?.nome ?? "Sem categoria"}
              </span>
              <h3 className="mt-2 font-medium text-ink">{produto.nome}</h3>
              <p className="mt-1 text-xs font-medium text-muted">SKU: {produto.sku}</p>
              <p className="mt-4 text-lg font-medium text-ink">
                {produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
