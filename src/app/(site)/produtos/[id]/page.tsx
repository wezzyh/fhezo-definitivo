import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretRight, Cube } from "@phosphor-icons/react/ssr";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { formatarAtributosTecnicos } from "@/lib/produtos/formatar-atributos";
import { calcularDesconto, calcularPrecoPix, calcularParcelamento } from "@/lib/produtos/precificacao";
import { CartaoProduto } from "@/components/produtos/cartao-produto";
import { BotaoAdicionarCarrinho } from "./botao-adicionar-carrinho";
import type { Produto } from "@/types/database";
import type { Metadata } from "next";

interface ProdutoComRelacoes extends Produto {
  marca: { nome: string } | null;
  categoria: { id: string; nome: string; slug: string } | null;
}

interface PaginaProdutoProps {
  params: Promise<{ id: string }>;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function buscarProduto(id: string): Promise<ProdutoComRelacoes | null> {
  const supabase = await criarClienteSupabaseServidor();

  const { data: produtosEncontrados } = await supabase
    .from("produtos")
    .select("*, marca:marcas(nome), categoria:categorias(id, nome, slug)")
    .eq("id", id)
    .eq("ativo", true)
    .limit(1)
    .returns<ProdutoComRelacoes[]>();

  return produtosEncontrados?.[0] ?? null;
}

async function buscarProdutosSimilares(categoriaId: string, idAtual: string) {
  const supabase = await criarClienteSupabaseServidor();

  const { data } = await supabase
    .from("produtos")
    .select("*")
    .eq("categoria_id", categoriaId)
    .eq("ativo", true)
    .neq("id", idAtual)
    .limit(5)
    .returns<Produto[]>();

  return data ?? [];
}

export async function generateMetadata({ params }: PaginaProdutoProps): Promise<Metadata> {
  const { id } = await params;
  const produto = await buscarProduto(id);

  if (!produto) return {};

  return {
    title: produto.seo_titulo || produto.nome,
    description: produto.seo_descricao || produto.descricao || undefined,
  };
}

export default async function PaginaProduto({ params }: PaginaProdutoProps) {
  const { id } = await params;
  const produto = await buscarProduto(id);

  if (!produto) {
    notFound();
  }

  const atributos = formatarAtributosTecnicos(produto.atributos);
  const { temDesconto, percentualDesconto } = calcularDesconto(produto.preco, produto.preco_de);
  const parcelamento = calcularParcelamento(produto.preco);
  const semEstoque = produto.estoque <= 0;
  const produtosSimilares = produto.categoria ? await buscarProdutosSimilares(produto.categoria.id, produto.id) : [];

  return (
    <main className="bg-warm-100 pb-16">
      <div className="mx-auto w-full max-w-store px-4 sm:px-5">
        <nav className="flex h-[60px] items-center gap-2 overflow-hidden whitespace-nowrap text-[13px] text-ink-500">
          <Link href="/" className="hover:text-fhezo-700">
            Início
          </Link>
          <CaretRight size={12} />
          <Link
            href={produto.categoria ? `/produtos?categoria=${produto.categoria.slug}` : "/produtos"}
            className="hover:text-fhezo-700"
          >
            {produto.categoria?.nome ?? "Produtos"}
          </Link>
          <CaretRight size={12} />
          <strong className="truncate text-ink-700">{produto.nome}</strong>
        </nav>

        <section className="grid gap-10 rounded-fhezo bg-white p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(420px,.8fr)] lg:p-8">
          <div className="flex min-h-[320px] items-center justify-center rounded-fhezo bg-warm-50 p-6 lg:min-h-[480px]">
            {produto.imagem_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária cadastrada pelo admin, sem domínio fixo para next/image.
              <img src={produto.imagem_url} alt={produto.nome} className="max-h-[440px] w-full object-contain" />
            ) : (
              <Cube size={96} weight="thin" className="text-ink-200" />
            )}
          </div>

          <div>
            <h1 className="font-display text-[27px] font-semibold leading-[1.08] text-ink-900">{produto.nome}</h1>

            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm text-ink-500">
              <span>
                Código: <strong className="text-ink-700">{produto.sku}</strong>
              </span>
              {produto.marca?.nome && (
                <span>
                  Marca: <strong className="text-ink-800">{produto.marca.nome}</strong>
                </span>
              )}
            </div>

            <div className="mt-5">
              <span className="inline-flex items-center gap-1.5 rounded-fhezo border border-fhezo-500 px-2 py-1 text-[12px] font-semibold text-fhezo-700">
                <Cube size={14} />
                {semEstoque ? "Sem estoque" : "Em estoque"}
              </span>
            </div>

            <div className="mt-6">
              {temDesconto && produto.preco_de && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-ink-500">
                    de <span className="line-through">{formatarMoeda(produto.preco_de)}</span>
                  </span>
                  <span className="rounded-fhezo bg-fhezo-warning px-2 py-1 font-display text-sm font-bold text-ink-950">
                    -{percentualDesconto}% OFF
                  </span>
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
                <strong className="font-display text-[42px] font-semibold leading-none text-fhezo-600">
                  {formatarMoeda(produto.preco)}
                </strong>
              </div>

              <p className="mt-3 font-semibold text-fhezo-700">
                à vista no Pix por {formatarMoeda(calcularPrecoPix(produto.preco))}
              </p>

              {parcelamento.parcelas > 1 && (
                <p className="mt-1 text-sm text-ink-600">
                  ou {parcelamento.parcelas}x de {formatarMoeda(parcelamento.valorParcela)} sem juros
                </p>
              )}
            </div>

            {produto.descricao && <p className="mt-6 text-sm text-ink-700">{produto.descricao}</p>}

            <div className="mt-7">
              <BotaoAdicionarCarrinho
                produtoId={produto.id}
                sku={produto.sku}
                nome={produto.nome}
                preco={produto.preco}
                estoque={produto.estoque}
                pesoKg={produto.peso_kg}
                imagemUrl={produto.imagem_url}
                alturaCm={produto.altura_cm}
                larguraCm={produto.largura_cm}
                comprimentoCm={produto.comprimento_cm}
              />
            </div>
          </div>
        </section>

        {atributos.length > 0 && (
          <section className="mt-12 bg-white">
            <div className="border-b border-ink-200 px-6 py-5">
              <h2 className="font-display text-[25px] font-semibold text-ink-900">Informações técnicas</h2>
            </div>
            <div className="grid gap-x-12 px-6 py-6 lg:grid-cols-2">
              {atributos.map((atributo) => (
                <div
                  key={atributo.rotulo}
                  className="grid grid-cols-[160px_minmax(0,1fr)] border-b border-ink-200 py-3 text-sm"
                >
                  <span className="font-semibold text-ink-600">{atributo.rotulo}</span>
                  <span className="text-ink-900">{atributo.valor}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {produtosSimilares.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-[28px] font-semibold text-ink-900">Produtos similares</h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {produtosSimilares.map((item) => (
                <CartaoProduto key={item.id} produto={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
