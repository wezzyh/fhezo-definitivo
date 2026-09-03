import { NextResponse } from "next/server";
import { COLUNAS_ESPERADAS } from "@/lib/produtos/importacao-tipos";

// Arquivo de exemplo pra download em /admin/produtos/importar — mostra o
// formato de colunas esperado com duas linhas reais de exemplo (uma com
// tudo preenchido, outra só com o mínimo obrigatório: sku, nome, preco,
// estoque). Só CSV — abre igual em Excel/Sheets, sem precisar gerar um
// XLSX à parte pra mesma finalidade.
const LINHAS_EXEMPLO = [
  [
    "ROL-6205",
    "Rolamento Rígido de Esferas 6205",
    "Rolamentos",
    "SKF",
    "89.90",
    "50",
    "0.2",
    "5",
    "5",
    "5",
    "7891234567890",
    "8482.10.10",
    "Rolamento rígido de esferas, uso geral.",
  ],
  ["PRF-M8-20", "Parafuso Sextavado M8x20", "", "", "1.50", "500", "", "", "", "", "", "", ""],
];

function escaparCampoCsv(valor: string): string {
  if (valor.includes(",") || valor.includes('"') || valor.includes("\n")) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export async function GET() {
  const linhas = [COLUNAS_ESPERADAS.join(","), ...LINHAS_EXEMPLO.map((linha) => linha.map(escaparCampoCsv).join(","))];
  // BOM UTF-8 no início: sem isso o Excel no Windows costuma abrir
  // acentos ("Rígidos", "sextavado") como caracteres quebrados.
  const conteudo = "﻿" + linhas.join("\r\n") + "\r\n";

  return new NextResponse(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-importacao-produtos.csv"',
    },
  });
}
