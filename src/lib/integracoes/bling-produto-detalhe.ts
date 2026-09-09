import "server-only";

import type { ProdutoBlingDetalhe } from "./bling-api";

/** Dados extraídos do detalhe de um produto no Bling, já no formato pronto pra gravar no nosso banco — nunca inclui dimensões (ver comentário em bling-api.ts sobre a unidade de medida não confiável). */
export interface DadosImportadosBling {
  /** "Descrição curta" + "Descrição complementar" concatenadas — o usuário usa as duas de forma redundante no Bling, então nenhuma é descartada. Null se as duas vierem vazias. */
  descricao: string | null;
  /** URLs de imagem, na ordem em que devem aparecer na galeria (a primeira vira a capa). Vazio se o produto não tiver imagem cadastrada no Bling. */
  imagens: string[];
  marcaNome: string | null;
  ean: string | null;
  ncm: string | null;
  /** Peso bruto (embalagem incluída) com fallback pro líquido — o que interessa pro cálculo de frete. Null se nenhum dos dois vier preenchido/positivo. */
  pesoKg: number | null;
}

export function extrairDadosImportadosBling(detalhe: ProdutoBlingDetalhe): DadosImportadosBling {
  const partesDescricao = [detalhe.descricaoCurta, detalhe.descricaoComplementar]
    .map((parte) => parte?.trim())
    .filter((parte): parte is string => Boolean(parte));

  const imagensExternas = (detalhe.midia?.imagens?.externas ?? []).map((imagem) => imagem.link).filter(Boolean);
  const imagensInternas = (detalhe.midia?.imagens?.internas ?? [])
    .slice()
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((imagem) => imagem.linkMiniatura)
    .filter(Boolean);
  // Prioriza imagens externas (URLs diretas, sem expirar) — internas (upload
  // direto no Bling) só como alternativa se não houver nenhuma externa.
  const imagens = imagensExternas.length > 0 ? imagensExternas : imagensInternas;

  const pesoBruto = detalhe.pesoBruto && detalhe.pesoBruto > 0 ? detalhe.pesoBruto : null;
  const pesoLiquido = detalhe.pesoLiquido && detalhe.pesoLiquido > 0 ? detalhe.pesoLiquido : null;

  return {
    descricao: partesDescricao.length > 0 ? partesDescricao.join("\n\n") : null,
    imagens,
    marcaNome: detalhe.marca?.trim() || null,
    ean: detalhe.gtin?.trim() || null,
    ncm: detalhe.tributacao?.ncm?.trim() || null,
    pesoKg: pesoBruto ?? pesoLiquido,
  };
}
