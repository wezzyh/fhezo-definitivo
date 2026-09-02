import { notFound } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { formatarAtributosTecnicos } from "@/lib/produtos/formatar-atributos";
import { BotaoAdicionarCarrinho } from "./botao-adicionar-carrinho";
import type { Produto } from "@/types/database";

interface PaginaProdutoProps {
  params: Promise<{ id: string }>;
}

export default async function PaginaProduto({ params }: PaginaProdutoProps) {
  const { id } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const { data: produtosEncontrados } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", id)
    .eq("ativo", true)
    .limit(1)
    .returns<Produto[]>();

  const produto = produtosEncontrados?.[0];

  if (!produto) {
    notFound();
  }

  const atributos = formatarAtributosTecnicos(produto.atributos);

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <span className="text-xs font-medium uppercase tracking-wide text-brand-green">
          {produto.categoria}
        </span>
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
