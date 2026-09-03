import "server-only";

import Papa from "papaparse";
import ExcelJS from "exceljs";
import { normalizarSku, normalizarEan } from "./duplicatas";
import { PESO_KG_PADRAO_FABRICA, DIMENSAO_CM_PADRAO_FABRICA } from "./qualidade";
import { LIMITE_LINHAS_IMPORTACAO, type LinhaImportacao, type LinhaValidada } from "./importacao-tipos";

// Parsing de CSV (papaparse) e XLSX (exceljs) — duas libs especializadas
// em vez do pacote "xlsx" (SheetJS), cuja versão publicada no npm está
// travada há mais de um ano numa versão com vulnerabilidades conhecidas
// sem patch (a própria SheetJS recomenda instalar via CDN deles em vez do
// npm). papaparse e exceljs são mantidos ativamente e não têm esse
// histórico.

function normalizarCabecalho(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function celulaParaTexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object") {
    if ("richText" in valor && Array.isArray(valor.richText)) {
      return valor.richText.map((parte) => parte.text).join("");
    }
    if ("result" in valor) return String(valor.result ?? "");
    if ("text" in valor) return String((valor as { text: unknown }).text ?? "");
    if (valor instanceof Date) return valor.toISOString();
  }
  return String(valor).trim();
}

function parsearCsv(buffer: Buffer): Record<string, string>[] {
  const texto = buffer.toString("utf-8");
  const resultado = Papa.parse<Record<string, string>>(texto, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizarCabecalho,
  });
  return resultado.data;
}

async function parsearXlsx(buffer: Buffer): Promise<Record<string, string>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const planilha = workbook.worksheets[0];
  if (!planilha) return [];

  const indiceParaCampo = new Map<number, string>();
  planilha.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const nome = normalizarCabecalho(celulaParaTexto(cell.value));
    if (nome) indiceParaCampo.set(colNumber, nome);
  });

  const linhas: Record<string, string>[] = [];
  planilha.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // cabeçalho
    const objeto: Record<string, string> = {};
    let temAlgumValor = false;
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const campo = indiceParaCampo.get(colNumber);
      if (!campo) return;
      const valor = celulaParaTexto(cell.value);
      if (valor) temAlgumValor = true;
      objeto[campo] = valor;
    });
    if (temAlgumValor) linhas.push(objeto);
  });

  return linhas;
}

function campo(linha: Record<string, string>, nome: string): string {
  return (linha[nome] ?? "").toString().trim();
}

export interface ResultadoParse {
  linhas: LinhaImportacao[];
  erro?: string;
}

export async function parsearArquivoImportacao(buffer: Buffer, nomeArquivo: string): Promise<ResultadoParse> {
  const extensao = nomeArquivo.toLowerCase().split(".").pop();

  let linhasBrutas: Record<string, string>[];
  if (extensao === "csv") {
    linhasBrutas = parsearCsv(buffer);
  } else if (extensao === "xlsx" || extensao === "xls") {
    linhasBrutas = await parsearXlsx(buffer);
  } else {
    return { linhas: [], erro: "Formato de arquivo não suportado. Envie um arquivo .csv ou .xlsx." };
  }

  if (linhasBrutas.length === 0) {
    return { linhas: [], erro: "O arquivo não tem nenhuma linha de dados." };
  }
  if (linhasBrutas.length > LIMITE_LINHAS_IMPORTACAO) {
    return {
      linhas: [],
      erro: `O arquivo tem ${linhasBrutas.length} linha(s) de dados — o limite por importação é ${LIMITE_LINHAS_IMPORTACAO}. Divida em arquivos menores.`,
    };
  }

  const colunasEncontradas = new Set(Object.keys(linhasBrutas[0] ?? {}));
  if (!colunasEncontradas.has("sku") || !colunasEncontradas.has("nome")) {
    return {
      linhas: [],
      erro:
        'O arquivo precisa ter pelo menos as colunas "sku" e "nome" no cabeçalho. Baixe o modelo para conferir o formato esperado.',
    };
  }

  const linhas: LinhaImportacao[] = linhasBrutas.map((linha, indice) => ({
    numeroLinha: indice + 1,
    sku: campo(linha, "sku"),
    nome: campo(linha, "nome"),
    categoriaTexto: campo(linha, "categoria"),
    marcaTexto: campo(linha, "marca"),
    precoTexto: campo(linha, "preco"),
    estoqueTexto: campo(linha, "estoque"),
    pesoKgTexto: campo(linha, "peso_kg"),
    alturaCmTexto: campo(linha, "altura_cm"),
    larguraCmTexto: campo(linha, "largura_cm"),
    comprimentoCmTexto: campo(linha, "comprimento_cm"),
    ean: campo(linha, "ean"),
    ncm: campo(linha, "ncm"),
    descricao: campo(linha, "descricao"),
  }));

  return { linhas };
}

function interpretarNumeroOpcional(texto: string, padrao: number, rotulo: string, erros: string[]): number {
  const limpo = texto.trim();
  if (!limpo) return padrao;
  const valor = Number(limpo.replace(",", "."));
  if (Number.isNaN(valor) || valor <= 0) {
    erros.push(`${rotulo} inválido: "${texto}".`);
    return padrao;
  }
  return valor;
}

export interface ContextoValidacaoImportacao {
  produtosExistentes: { id: string; sku: string; ean: string | null }[];
  marcas: { id: string; nome: string }[];
  categorias: { id: string; nome: string }[];
}

/**
 * Valida cada linha contra o estado ATUAL do banco (contexto deve ser
 * buscado de fresh, tanto no preview quanto de novo na hora de aplicar —
 * nunca reaproveitar um contexto antigo, o catálogo pode ter mudado entre
 * as duas telas).
 */
export function validarLinhasImportacao(
  linhas: LinhaImportacao[],
  contexto: ContextoValidacaoImportacao,
): LinhaValidada[] {
  const mapaProdutoPorSku = new Map(contexto.produtosExistentes.map((p) => [normalizarSku(p.sku), p]));
  const mapaMarcaPorNome = new Map(contexto.marcas.map((m) => [m.nome.trim().toLowerCase(), m.id]));
  const mapaCategoriaPorNome = new Map(contexto.categorias.map((c) => [c.nome.trim().toLowerCase(), c.id]));

  const skusVistos = new Set<string>();
  const eansVistos = new Set<string>();

  return linhas.map((linha) => {
    const erros: string[] = [];

    if (!linha.sku) erros.push("SKU vazio.");
    if (!linha.nome) erros.push("Nome vazio.");

    const skuNormalizado = linha.sku ? normalizarSku(linha.sku) : "";
    if (skuNormalizado) {
      if (skusVistos.has(skuNormalizado)) erros.push("SKU duplicado dentro deste mesmo arquivo.");
      skusVistos.add(skuNormalizado);
    }

    const produtoExistente = skuNormalizado ? mapaProdutoPorSku.get(skuNormalizado) ?? null : null;

    let preco: number | null = null;
    if (!linha.precoTexto.trim()) {
      erros.push("Preço vazio.");
    } else {
      const valor = Number(linha.precoTexto.replace(",", "."));
      if (Number.isNaN(valor) || valor < 0) erros.push(`Preço inválido: "${linha.precoTexto}".`);
      else preco = valor;
    }

    let estoque: number | null = null;
    if (!linha.estoqueTexto.trim()) {
      erros.push("Estoque vazio.");
    } else {
      const valor = Number(linha.estoqueTexto.replace(",", "."));
      if (Number.isNaN(valor) || !Number.isInteger(valor) || valor < 0) {
        erros.push(`Estoque inválido: "${linha.estoqueTexto}" (precisa ser um número inteiro ≥ 0).`);
      } else {
        estoque = valor;
      }
    }

    const pesoKg = interpretarNumeroOpcional(linha.pesoKgTexto, PESO_KG_PADRAO_FABRICA, "Peso", erros);
    const alturaCm = interpretarNumeroOpcional(linha.alturaCmTexto, DIMENSAO_CM_PADRAO_FABRICA, "Altura", erros);
    const larguraCm = interpretarNumeroOpcional(linha.larguraCmTexto, DIMENSAO_CM_PADRAO_FABRICA, "Largura", erros);
    const comprimentoCm = interpretarNumeroOpcional(
      linha.comprimentoCmTexto,
      DIMENSAO_CM_PADRAO_FABRICA,
      "Comprimento",
      erros,
    );

    const ean = linha.ean.trim() || null;
    if (ean) {
      const eanNormalizado = normalizarEan(ean);
      if (eansVistos.has(eanNormalizado)) erros.push("EAN duplicado dentro deste mesmo arquivo.");
      eansVistos.add(eanNormalizado);

      const outroComMesmoEan = contexto.produtosExistentes.find(
        (p) => p.ean && normalizarEan(p.ean) === eanNormalizado && p.id !== produtoExistente?.id,
      );
      if (outroComMesmoEan) {
        erros.push(`EAN já usado pelo produto de SKU "${outroComMesmoEan.sku}".`);
      }
    }

    const categoriaTexto = linha.categoriaTexto.trim();
    const categoriaId = categoriaTexto ? mapaCategoriaPorNome.get(categoriaTexto.toLowerCase()) ?? null : null;
    const categoriaFaltante = categoriaTexto !== "" && categoriaId === null;

    const marcaTexto = linha.marcaTexto.trim();
    const marcaId = marcaTexto ? mapaMarcaPorNome.get(marcaTexto.toLowerCase()) ?? null : null;
    const marcaFaltante = marcaTexto !== "" && marcaId === null;

    return {
      numeroLinha: linha.numeroLinha,
      sku: linha.sku,
      nome: linha.nome,
      preco,
      estoque,
      pesoKg,
      alturaCm,
      larguraCm,
      comprimentoCm,
      ean,
      ncm: linha.ncm.trim() || null,
      descricao: linha.descricao.trim() || null,
      categoriaTexto,
      marcaTexto,
      categoriaId,
      marcaId,
      categoriaFaltante,
      marcaFaltante,
      produtoExistenteId: produtoExistente?.id ?? null,
      erros,
    };
  });
}
