import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Produto } from "@/types/database";

// Dados mockados apenas para visualização do layout.
// TODO: substituir por uma busca real no Supabase (tabela "produtos").
const produtosEmDestaque: Pick<Produto, "id" | "nome" | "sku" | "categoria" | "preco">[] = [
  {
    id: "1",
    nome: "Rolamento Rígido de Esferas 6205",
    sku: "ROL-6205",
    categoria: "Rolamentos",
    preco: 89.9,
  },
  {
    id: "2",
    nome: "Engrenagem Cilíndrica de Dentes Retos M2",
    sku: "ENG-M2-40",
    categoria: "Engrenagens",
    preco: 154.5,
  },
  {
    id: "3",
    nome: "Corrente de Transmissão Passo 08B",
    sku: "COR-08B-5M",
    categoria: "Correntes",
    preco: 210.0,
  },
  {
    id: "4",
    nome: "Graxa Industrial de Lítio 400g",
    sku: "GRX-LI-400",
    categoria: "Graxas",
    preco: 32.9,
  },
];

export default function PaginaInicial() {
  return (
    <div>
      <section className="bg-blue-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            Componentes industriais de precisão para manter sua operação em movimento
          </h1>
          <p className="mt-4 max-w-xl text-blue-100">
            Rolamentos, engrenagens, correntes, graxas, ferramentas, parafusos e porcas
            especiais, com estoque pronto e atendimento técnico especializado.
          </p>
          <div className="mt-8">
            <Link href="/produtos">
              <Button variant="primary" className="bg-white text-blue-950 hover:bg-blue-50">
                Ver catálogo de produtos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold text-zinc-900">Produtos em destaque</h2>
        <p className="mt-1 text-zinc-600">
          Uma seleção dos itens mais procurados pelos nossos clientes.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {produtosEmDestaque.map((produto) => (
            <Card key={produto.id}>
              <span className="text-xs font-medium uppercase tracking-wide text-blue-900">
                {produto.categoria}
              </span>
              <h3 className="mt-2 font-semibold text-zinc-900">{produto.nome}</h3>
              <p className="mt-1 text-xs text-zinc-500">SKU: {produto.sku}</p>
              <p className="mt-4 text-lg font-bold text-zinc-900">
                {produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
