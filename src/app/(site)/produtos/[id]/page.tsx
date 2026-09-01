import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Produto } from "@/types/database";

// Dados mockados apenas para visualização do layout.
// TODO: substituir por uma busca real no Supabase (tabela "produtos", filtrando por id).
const produtosMock: Pick<
  Produto,
  "id" | "nome" | "sku" | "categoria" | "preco" | "estoque" | "atributosTecnicos"
>[] = [
  {
    id: "1",
    nome: "Rolamento Rígido de Esferas 6205",
    sku: "ROL-6205",
    categoria: "Rolamentos",
    preco: 89.9,
    estoque: 120,
    atributosTecnicos: {
      "Diâmetro interno": "25mm",
      "Diâmetro externo": "52mm",
      Largura: "15mm",
    },
  },
  {
    id: "2",
    nome: "Engrenagem Cilíndrica de Dentes Retos M2",
    sku: "ENG-M2-40",
    categoria: "Engrenagens",
    preco: 154.5,
    estoque: 35,
    atributosTecnicos: { Módulo: "2", "Número de dentes": "40", Material: "Aço 1045" },
  },
  {
    id: "3",
    nome: "Corrente de Transmissão Passo 08B",
    sku: "COR-08B-5M",
    categoria: "Correntes",
    preco: 210.0,
    estoque: 18,
    atributosTecnicos: { Passo: "08B", Comprimento: "5 metros", Elos: "250" },
  },
  {
    id: "4",
    nome: "Graxa Industrial de Lítio 400g",
    sku: "GRX-LI-400",
    categoria: "Graxas",
    preco: 32.9,
    estoque: 200,
    atributosTecnicos: { "Peso líquido": "400g", Base: "Lítio", "Faixa de temperatura": "-10°C a 130°C" },
  },
  {
    id: "5",
    nome: "Chave Combinada 19mm",
    sku: "FER-CHV-19",
    categoria: "Ferramentas",
    preco: 45.0,
    estoque: 60,
    atributosTecnicos: { Abertura: "19mm", Material: "Cromo-vanádio" },
  },
  {
    id: "6",
    nome: "Parafuso Sextavado M10x40 Especial",
    sku: "PAR-M10-40",
    categoria: "Parafusos e Porcas",
    preco: 3.2,
    estoque: 5000,
    atributosTecnicos: { Rosca: "M10", Comprimento: "40mm", Acabamento: "Zincado" },
  },
];

interface PaginaProdutoProps {
  params: Promise<{ id: string }>;
}

export default async function PaginaProduto({ params }: PaginaProdutoProps) {
  const { id } = await params;
  const produto = produtosMock.find((item) => item.id === id);

  if (!produto) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <span className="text-xs font-medium uppercase tracking-wide text-blue-900">
        {produto.categoria}
      </span>
      <h1 className="mt-2 text-3xl font-bold text-zinc-900">{produto.nome}</h1>
      <p className="mt-1 text-sm text-zinc-500">SKU: {produto.sku}</p>

      <p className="mt-6 text-2xl font-bold text-zinc-900">
        {produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{produto.estoque} unidades em estoque</p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900">Especificações técnicas</h2>
      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Object.entries(produto.atributosTecnicos).map(([chave, valor]) => (
          <div key={chave} className="rounded-md border border-zinc-200 p-3">
            <dt className="text-xs text-zinc-500">{chave}</dt>
            <dd className="font-medium text-zinc-900">{String(valor)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        <Button variant="primary">Adicionar ao orçamento</Button>
      </div>
    </div>
  );
}
