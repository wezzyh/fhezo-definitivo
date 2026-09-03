import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Dados mockados apenas para visualização do layout.
// TODO: substituir por uma busca real no Supabase (tabela "produtos", com
// join em "categorias" — ver src/app/(site)/produtos/page.tsx).
interface ProdutoDestaqueMock {
  id: string;
  nome: string;
  sku: string;
  categoriaNome: string;
  preco: number;
}

const produtosEmDestaque: ProdutoDestaqueMock[] = [
  {
    id: "1",
    nome: "Rolamento Rígido de Esferas 6205",
    sku: "ROL-6205",
    categoriaNome: "Rolamentos",
    preco: 89.9,
  },
  {
    id: "2",
    nome: "Engrenagem Cilíndrica de Dentes Retos M2",
    sku: "ENG-M2-40",
    categoriaNome: "Engrenagens",
    preco: 154.5,
  },
  {
    id: "3",
    nome: "Corrente de Transmissão Passo 08B",
    sku: "COR-08B-5M",
    categoriaNome: "Correntes",
    preco: 210.0,
  },
  {
    id: "4",
    nome: "Graxa Industrial de Lítio 400g",
    sku: "GRX-LI-400",
    categoriaNome: "Graxas",
    preco: 32.9,
  },
];

export default function PaginaInicial() {
  return (
    <div className="bg-page">
      <section className="bg-dark text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            Componentes industriais de precisão para manter sua operação em movimento
          </h1>
          <p className="mt-4 max-w-xl text-zinc-300">
            Rolamentos, engrenagens, correntes, graxas, ferramentas, parafusos e porcas
            especiais, com estoque pronto e atendimento técnico especializado.
          </p>
          <div className="mt-8">
            <Link href="/produtos">
              <Button variant="primary">Ver catálogo de produtos</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold text-ink">Produtos em destaque</h2>
        <p className="mt-1 text-muted">
          Uma seleção dos itens mais procurados pelos nossos clientes.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {produtosEmDestaque.map((produto) => (
            <Card key={produto.id}>
              <span className="text-xs font-medium uppercase tracking-wide text-brand-green">
                {produto.categoriaNome}
              </span>
              <h3 className="mt-2 font-medium text-ink">{produto.nome}</h3>
              <p className="mt-1 text-xs font-medium text-muted">SKU: {produto.sku}</p>
              <p className="mt-4 text-lg font-medium text-ink">
                {produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
