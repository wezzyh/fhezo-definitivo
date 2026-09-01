import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { Produto } from "@/types/database";

// Dados mockados apenas para visualização do layout.
// TODO: substituir por uma busca real no Supabase (tabela "produtos").
const produtosMock: Pick<Produto, "id" | "nome" | "sku" | "categoria" | "preco" | "estoque">[] = [
  {
    id: "1",
    nome: "Rolamento Rígido de Esferas 6205",
    sku: "ROL-6205",
    categoria: "Rolamentos",
    preco: 89.9,
    estoque: 120,
  },
  {
    id: "2",
    nome: "Engrenagem Cilíndrica de Dentes Retos M2",
    sku: "ENG-M2-40",
    categoria: "Engrenagens",
    preco: 154.5,
    estoque: 35,
  },
  {
    id: "3",
    nome: "Corrente de Transmissão Passo 08B",
    sku: "COR-08B-5M",
    categoria: "Correntes",
    preco: 210.0,
    estoque: 18,
  },
  {
    id: "4",
    nome: "Graxa Industrial de Lítio 400g",
    sku: "GRX-LI-400",
    categoria: "Graxas",
    preco: 32.9,
    estoque: 200,
  },
  {
    id: "5",
    nome: "Chave Combinada 19mm",
    sku: "FER-CHV-19",
    categoria: "Ferramentas",
    preco: 45.0,
    estoque: 60,
  },
  {
    id: "6",
    nome: "Parafuso Sextavado M10x40 Especial",
    sku: "PAR-M10-40",
    categoria: "Parafusos e Porcas",
    preco: 3.2,
    estoque: 5000,
  },
];

export default function PaginaProdutos() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900">Catálogo de Produtos</h1>
      <p className="mt-1 text-zinc-600">
        Rolamentos, engrenagens, correntes, graxas, ferramentas, parafusos e porcas especiais.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {produtosMock.map((produto) => (
          <Link key={produto.id} href={`/produtos/${produto.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <span className="text-xs font-medium uppercase tracking-wide text-blue-900">
                {produto.categoria}
              </span>
              <h2 className="mt-2 font-semibold text-zinc-900">{produto.nome}</h2>
              <p className="mt-1 text-xs text-zinc-500">SKU: {produto.sku}</p>
              <p className="mt-4 text-lg font-bold text-zinc-900">
                {produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{produto.estoque} unidades em estoque</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
