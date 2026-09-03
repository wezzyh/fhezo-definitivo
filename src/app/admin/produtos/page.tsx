import Link from "next/link";
import { Button } from "@/components/ui/button";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { FormularioExcluirProduto } from "./botao-excluir";
import type { Produto } from "@/types/database";

interface ProdutoComRelacoes extends Produto {
  marca: { nome: string } | null;
  categoria: { nome: string } | null;
}

interface AdminProdutosPageProps {
  searchParams: Promise<{ revisao?: string }>;
}

export default async function AdminProdutosPage({ searchParams }: AdminProdutosPageProps) {
  const { revisao } = await searchParams;
  const somenteRevisao = revisao === "1";

  const supabase = await criarClienteSupabaseServidor();
  const { data: todosProdutos, error } = await supabase
    .from("produtos")
    .select("*, marca:marcas(nome), categoria:categorias(nome)")
    .order("created_at", { ascending: false })
    .returns<ProdutoComRelacoes[]>();

  const pendentesRevisao = (todosProdutos ?? []).filter(
    (produto) => produto.bling_produto_id !== null && !produto.ativo,
  );
  const produtos = somenteRevisao ? pendentesRevisao : todosProdutos;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Produtos</h1>
        <Link href="/admin/produtos/novo">
          <Button variant="primary">+ Novo produto</Button>
        </Link>
      </div>

      {pendentesRevisao.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            <strong>{pendentesRevisao.length}</strong> produto(s) importado(s) do Bling aguardando
            revisão (categoria, preço, peso/dimensões, fotos) antes de ativar.
          </p>
          <Link
            href={somenteRevisao ? "/admin/produtos" : "/admin/produtos?revisao=1"}
            className="shrink-0 text-sm font-medium text-amber-900 underline hover:no-underline"
          >
            {somenteRevisao ? "Ver todos os produtos" : "Ver só os pendentes de revisão"}
          </Link>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600">Erro ao carregar produtos: {error.message}</p>
      )}

      {!error && (!produtos || produtos.length === 0) && (
        <p className="mt-6 text-sm text-muted">
          {somenteRevisao ? "Nenhum produto pendente de revisão." : "Nenhum produto cadastrado ainda."}
        </p>
      )}

      {produtos && produtos.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Marca</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Estoque</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => {
                const precisaRevisao = produto.bling_produto_id !== null && !produto.ativo;
                return (
                  <tr key={produto.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-muted">{produto.sku}</td>
                    <td className="px-4 py-3 font-medium text-ink">{produto.nome}</td>
                    <td className="px-4 py-3 text-muted">{produto.marca?.nome ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{produto.categoria?.nome ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-ink">
                      {produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{produto.estoque}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            produto.ativo
                              ? "bg-brand-green/10 text-brand-green-dark"
                              : "bg-zinc-200 text-muted"
                          }`}
                        >
                          {produto.ativo ? "Ativo" : "Inativo"}
                        </span>
                        {precisaRevisao && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Do Bling — revisar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/produtos/${produto.id}/editar`}
                          className="font-medium text-brand-green hover:underline"
                        >
                          Editar
                        </Link>
                        <FormularioExcluirProduto id={produto.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
