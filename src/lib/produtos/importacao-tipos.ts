// Tipos e lógica PURA (sem parsing de arquivo, sem chamada ao banco) da
// importação de produtos — importável tanto pelo Server Action de preview
// (que faz a validação de verdade contra o banco) quanto pelo componente
// client da tela de preview (que precisa recalcular ao vivo o que cada
// linha vai fazer conforme o admin alterna "criar automaticamente" vs
// "pular linha" pra categoria/marca faltante, sem outra ida ao servidor).

export const LIMITE_LINHAS_IMPORTACAO = 300;

export const COLUNAS_ESPERADAS = [
  "sku",
  "nome",
  "categoria",
  "marca",
  "preco",
  "estoque",
  "peso_kg",
  "altura_cm",
  "largura_cm",
  "comprimento_cm",
  "ean",
  "ncm",
  "descricao",
] as const;

/** Uma linha do arquivo, só com os valores brutos (texto) já mapeados pelas colunas esperadas. */
export interface LinhaImportacao {
  /** 1-indexado, relativo às linhas de DADOS (não conta o cabeçalho). */
  numeroLinha: number;
  sku: string;
  nome: string;
  categoriaTexto: string;
  marcaTexto: string;
  precoTexto: string;
  estoqueTexto: string;
  pesoKgTexto: string;
  alturaCmTexto: string;
  larguraCmTexto: string;
  comprimentoCmTexto: string;
  ean: string;
  ncm: string;
  descricao: string;
}

/** Uma linha já validada contra o estado atual do banco (marcas/categorias/produtos existentes). */
export interface LinhaValidada {
  numeroLinha: number;
  sku: string;
  nome: string;
  preco: number | null;
  estoque: number | null;
  pesoKg: number;
  alturaCm: number;
  larguraCm: number;
  comprimentoCm: number;
  ean: string | null;
  ncm: string | null;
  descricao: string | null;
  categoriaTexto: string;
  marcaTexto: string;
  /** id resolvido se já existir uma categoria com esse nome. */
  categoriaId: string | null;
  marcaId: string | null;
  /** texto não vazio mas não bate com nenhuma categoria/marca existente. */
  categoriaFaltante: boolean;
  marcaFaltante: boolean;
  /** id do produto já existente com esse SKU (normalizado), se houver. */
  produtoExistenteId: string | null;
  erros: string[];
}

export type AcaoLinha =
  | "criar"
  | "atualizar"
  | "erro"
  | "pular_categoria_faltante"
  | "pular_marca_faltante";

export interface OpcoesFaltantes {
  modoCategoriaFaltante: "criar" | "pular";
  modoMarcaFaltante: "criar" | "pular";
}

/**
 * Decide o que vai acontecer com uma linha — pura, sem acesso ao banco,
 * por isso pode rodar tanto no preview (client, ao vivo, sem round-trip)
 * quanto na aplicação de fato (server, decisão final).
 */
export function classificarLinha(linha: LinhaValidada, opcoes: OpcoesFaltantes): AcaoLinha {
  if (linha.erros.length > 0) return "erro";
  if (linha.categoriaFaltante && opcoes.modoCategoriaFaltante === "pular") return "pular_categoria_faltante";
  if (linha.marcaFaltante && opcoes.modoMarcaFaltante === "pular") return "pular_marca_faltante";
  return linha.produtoExistenteId ? "atualizar" : "criar";
}

/**
 * Reconstrói uma LinhaImportacao a partir de um valor arbitrário vindo de
 * JSON.parse (o hidden field entre a tela de preview e a de aplicar) —
 * nunca confia que o formato realmente bate com o esperado (pode ter sido
 * adulterado, ou só estar desatualizado/corrompido); força cada campo a
 * string em vez de deixar um `.trim()` em algo que não é string quebrar a
 * ação inteira.
 */
export function sanitizarLinhaImportacao(bruto: unknown, numeroLinhaFallback: number): LinhaImportacao {
  const objeto = bruto && typeof bruto === "object" ? (bruto as Record<string, unknown>) : {};
  const texto = (campo: string) => (typeof objeto[campo] === "string" ? (objeto[campo] as string) : "");
  const numero = Number(objeto.numeroLinha);

  return {
    numeroLinha: Number.isInteger(numero) && numero > 0 ? numero : numeroLinhaFallback,
    sku: texto("sku"),
    nome: texto("nome"),
    categoriaTexto: texto("categoriaTexto"),
    marcaTexto: texto("marcaTexto"),
    precoTexto: texto("precoTexto"),
    estoqueTexto: texto("estoqueTexto"),
    pesoKgTexto: texto("pesoKgTexto"),
    alturaCmTexto: texto("alturaCmTexto"),
    larguraCmTexto: texto("larguraCmTexto"),
    comprimentoCmTexto: texto("comprimentoCmTexto"),
    ean: texto("ean"),
    ncm: texto("ncm"),
    descricao: texto("descricao"),
  };
}

export function rotuloAcao(acao: AcaoLinha): string {
  switch (acao) {
    case "criar":
      return "Novo produto (inativo, aguardando revisão)";
    case "atualizar":
      return "Atualiza produto existente";
    case "erro":
      return "Erro — não será importada";
    case "pular_categoria_faltante":
      return "Pulada — categoria não existe";
    case "pular_marca_faltante":
      return "Pulada — marca não existe";
  }
}
