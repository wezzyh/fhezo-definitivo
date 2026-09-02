// Converte chaves de atributos técnicos em snake_case (ex.: "diametro_interno_mm")
// em rótulos legíveis em português (ex.: "Diâmetro interno") e formata o valor
// junto da unidade quando ela estiver embutida na própria chave (ex.: "20mm").

const DICIONARIO_TERMOS: Record<string, string> = {
  diametro: "Diâmetro",
  interno: "interno",
  externo: "externo",
  largura: "Largura",
  altura: "Altura",
  comprimento: "Comprimento",
  peso: "Peso",
  liquido: "líquido",
  material: "Material",
  base: "Base",
  elos: "Elos",
  passo: "Passo",
  rosca: "Rosca",
  modulo: "Módulo",
  dentes: "dentes",
  numero: "Número",
  de: "de",
  viscosidade: "Viscosidade",
  temperatura: "Temperatura",
  faixa: "Faixa",
  capacidade: "Capacidade",
  potencia: "Potência",
  rotacao: "Rotação",
  torque: "Torque",
  pressao: "Pressão",
  abertura: "Abertura",
  acabamento: "Acabamento",
};

// Sufixos de unidade reconhecidos ao final da chave (ex.: "_mm", "_kg").
const UNIDADES_CONHECIDAS = new Set([
  "mm",
  "cm",
  "m",
  "kg",
  "g",
  "l",
  "ml",
  "v",
  "w",
  "kw",
  "rpm",
  "nm",
  "mpa",
  "bar",
  "c",
]);

function capitalizarPalavra(palavra: string): string {
  return palavra.charAt(0).toUpperCase() + palavra.slice(1);
}

function separarUnidade(chave: string): { partesRotulo: string[]; unidade: string | null } {
  const partes = chave.split("_").filter(Boolean);
  const ultimaParte = partes[partes.length - 1]?.toLowerCase();

  if (ultimaParte && UNIDADES_CONHECIDAS.has(ultimaParte) && partes.length > 1) {
    return { partesRotulo: partes.slice(0, -1), unidade: ultimaParte };
  }

  return { partesRotulo: partes, unidade: null };
}

export function formatarChaveAtributo(chave: string): string {
  const { partesRotulo } = separarUnidade(chave);

  const palavras = partesRotulo.map((parte, indice) => {
    const termo = DICIONARIO_TERMOS[parte.toLowerCase()] ?? parte;
    return indice === 0 ? capitalizarPalavra(termo) : termo;
  });

  return palavras.join(" ") || chave;
}

export function formatarValorAtributo(chave: string, valor: unknown): string {
  const { unidade } = separarUnidade(chave);

  if (unidade) {
    return `${valor}${unidade}`;
  }

  return String(valor);
}

export interface AtributoFormatado {
  rotulo: string;
  valor: string;
}

export function formatarAtributosTecnicos(
  atributos: Record<string, unknown> | null | undefined,
): AtributoFormatado[] {
  if (!atributos) return [];

  return Object.entries(atributos).map(([chave, valor]) => ({
    rotulo: formatarChaveAtributo(chave),
    valor: formatarValorAtributo(chave, valor),
  }));
}
