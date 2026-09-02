import Link from "next/link";
import { Card } from "@/components/ui/card";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { Produto } from "@/types/database";

export default async function PaginaProdutos() {
  const supabase = await criarClienteSupabaseServidor();
  const { data: produtos, error } = await supabase
    .from("produtos")
    .select("*")
    .eq("ativo", true)
    .order("nome")
    .returns<Produto[]>();

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-2xl font-semibold text-ink">Catálogo de Produtos</h1>
        <p className="mt-1 text-muted">
          Rolamentos, engrenagens, correntes, graxas, ferramentas, parafusos e porcas especiais.
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
                  <span className="text-xs font-medium uppercase tracking-wide text-brand-green">
                    {produto.categoria}
                  </span>
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
