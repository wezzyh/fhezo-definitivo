import { notFound } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { formatarAtributosTecnicos } from "@/lib/produtos/formatar-atributos";
import { BotaoAdicionarCarrinho } from "./botao-adicionar-carrinho";
import type { Produto } from "@/types/database";
import type { Metadata } from "next";

interface ProdutoComRelacoes extends Produto {
  marca: { nome: string } | null;
  categoria: { nome: string } | null;
}

interface PaginaProdutoProps {
  params: Promise<{ id: string }>;
}

async function buscarProduto(id: string): Promise<ProdutoComRelacoes | null> {
  const supabase = await criarClienteSupabaseServidor();

  const { data: produtosEncontrados } = await supabase
    .from("produtos")
    .select("*, marca:marcas(nome), categoria:categorias(nome)")
    .eq("id", id)
    .eq("ativo", true)
    .limit(1)
    .returns<ProdutoComRelacoes[]>();

  return produtosEncontrados?.[0] ?? null;
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

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {produto.imagem_url && (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária cadastrada pelo admin, sem domínio fixo para next/image.
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            className="mb-6 aspect-video w-full rounded-md object-cover"
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-brand-green">
            {produto.categoria?.nome ?? "Sem categoria"}
          </span>
          {produto.marca?.nome && (
            <>
              <span className="text-xs text-muted">•</span>
              <span className="text-xs font-medium text-muted">{produto.marca.nome}</span>
            </>
          )}
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{produto.nome}</h1>
        <p className="mt-1 text-sm font-medium text-muted">SKU: {produto.sku}</p>

        {produto.descricao && <p className="mt-4 text-ink">{produto.descricao}</p>}

        <p className="mt-6 text-2xl font-medium text-ink">
          {produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
        <p className="mt-1 text-sm font-medium text-muted">
          {produto.estoque} unidades em estoque
        </p>

        {atributos.length > 0 && (
          <>
            <h2 className="mt-8 text-lg font-semibold text-ink">Especificações técnicas</h2>
            <div className="mt-4 overflow-hidden rounded-md border border-zinc-200 bg-white">
              <table className="w-full text-sm">
                <tbody>
                  {atributos.map((atributo, indice) => (
                    <tr
                      key={atributo.rotulo}
                      className={indice > 0 ? "border-t border-zinc-200" : undefined}
                    >
                      <th scope="row" className="w-1/2 px-4 py-3 text-left font-normal text-muted">
                        {atributo.rotulo}
                      </th>
                      <td className="px-4 py-3 text-right font-medium text-ink">
                        {atributo.valor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-8">
          <BotaoAdicionarCarrinho
            produtoId={produto.id}
            sku={produto.sku}
            nome={produto.nome}
            preco={produto.preco}
            estoque={produto.estoque}
            pesoKg={produto.peso_kg}
            alturaCm={produto.altura_cm}
            larguraCm={produto.largura_cm}
            comprimentoCm={produto.comprimento_cm}
          />
        </div>
      </div>
    </div>
  );
}
