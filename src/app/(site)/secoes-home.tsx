import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { CartaoProduto } from "@/components/produtos/cartao-produto";
import type {
  SecaoHero as TipoSecaoHero,
  SecaoCategoriasDestaque as TipoSecaoCategoriasDestaque,
  SecaoProdutosDestaque as TipoSecaoProdutosDestaque,
} from "@/lib/conteudo/tipos";
import type { Categoria, Produto } from "@/types/database";

// Uma seção da home por tipo — cada uma é seu próprio Server Component
// (async quando precisa buscar dado), renderizada a partir do array
// "secoes" de conteudo_site (tipo "home") em page.tsx. Editável em
// /admin/conteudo/home. Visual alinhado à integração de
// referencia-novo-frontend/ — os dados continuam 100% vindos do CMS.

export function SecaoHero({ secao }: { secao: TipoSecaoHero }) {
  return (
    <section className="bg-ink-950 text-white">
      <div className="mx-auto w-full max-w-store px-4 py-20 sm:px-5">
        <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
          {secao.titulo}
        </h1>
        <p className="mt-4 max-w-xl text-ink-300">{secao.subtitulo}</p>
        <div className="mt-8">
          <Link
            href={secao.cta_href}
            className="inline-flex h-[52px] items-center justify-center rounded-fhezo bg-fhezo-600 px-6 font-display font-semibold uppercase text-white transition hover:bg-fhezo-700"
          >
            {secao.cta_texto}
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
    <section className="mx-auto w-full max-w-store px-4 py-16 sm:px-5">
      <h2 className="font-display text-2xl font-semibold text-ink-900">{secao.titulo}</h2>
      {secao.subtitulo && <p className="mt-1 text-ink-500">{secao.subtitulo}</p>}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {categorias.map((categoria) => (
          <Link
            key={categoria.id}
            href={`/produtos?categoria=${categoria.slug}`}
            className="flex items-center justify-center rounded-fhezo border border-ink-200 bg-white p-6 text-center transition hover:border-fhezo-300 hover:shadow-panel"
          >
            <span className="font-medium text-ink-800">{categoria.nome}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export async function SecaoProdutosDestaque({ secao }: { secao: TipoSecaoProdutosDestaque }) {
  const supabase = await criarClienteSupabaseServidor();

  let query = supabase.from("produtos").select("*").eq("ativo", true);

  if (secao.modo === "manual") {
    if (secao.produto_ids.length === 0) return null;
    query = query.in("id", secao.produto_ids);
  } else {
    if (secao.categoria_id) query = query.eq("categoria_id", secao.categoria_id);
    query = query.order("created_at", { ascending: false }).limit(secao.limite);
  }

  const { data: produtos } = await query.returns<Produto[]>();
  if (!produtos || produtos.length === 0) return null;

  const produtosOrdenados =
    secao.modo === "manual"
      ? secao.produto_ids
          .map((id) => produtos.find((produto) => produto.id === id))
          .filter((produto): produto is NonNullable<typeof produto> => Boolean(produto))
      : produtos;

  if (produtosOrdenados.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-store px-4 py-16 sm:px-5">
      <div className="relative mb-7 border-b border-ink-200 pb-4 text-center">
        <h2 className="font-display text-[29px] font-semibold leading-tight text-ink-900">{secao.titulo}</h2>
        {secao.subtitulo && (
          <span className="mt-2 block font-display text-xs font-semibold uppercase tracking-[.16em] text-fhezo-600">
            {secao.subtitulo}
          </span>
        )}
        <Link
          href="/produtos"
          className="absolute right-0 top-1/2 hidden -translate-y-1/2 text-sm font-semibold text-fhezo-700 underline md:block"
        >
          Ver todos os produtos
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {produtosOrdenados.map((produto) => (
          <CartaoProduto key={produto.id} produto={produto} />
        ))}
      </div>
    </section>
  );
}
