// Regras fiscais do cadastro PJ: Inscrição Estadual × Contribuinte de ICMS
// × UF, SUFRAMA, e a tradução disso para o contato do Bling (API v3).
//
// Compatibilidade com o Bling: o contato do Bling só tem `indicadorIe` +
// `ie` como dado fiscal (mesmos códigos do campo indIEDest da NF-e). Não há
// campo para finalidade da compra, regime tributário, SUFRAMA nem inscrição
// municipal — esses ficam só no nosso banco (úteis para NF-e/DIFAL depois).

import { validateIE } from "validations-br";
import type { TipoPessoa } from "@/types/database";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
export type Uf = (typeof UFS)[number];

export function ehUf(valor: string): valor is Uf {
  return (UFS as readonly string[]).includes(valor);
}

export const CONTRIBUINTE_ICMS = ["sim", "nao", "isento"] as const;
export type ContribuinteIcms = (typeof CONTRIBUINTE_ICMS)[number];
export const ROTULOS_CONTRIBUINTE_ICMS: Record<ContribuinteIcms, string> = {
  sim: "Sim",
  nao: "Não",
  isento: "Isento",
};

export const FINALIDADES_COMPRA = [
  "revenda",
  "industrializacao",
  "uso_consumo",
  "manutencao_reparo",
  "ativo_imobilizado",
] as const;
export type FinalidadeCompra = (typeof FINALIDADES_COMPRA)[number];
export const ROTULOS_FINALIDADE_COMPRA: Record<FinalidadeCompra, string> = {
  revenda: "Revenda",
  industrializacao: "Industrialização",
  uso_consumo: "Uso e consumo",
  manutencao_reparo: "Manutenção e reparo",
  ativo_imobilizado: "Ativo imobilizado",
};

export const REGIMES_TRIBUTARIOS = ["simples_nacional", "lucro_presumido", "lucro_real"] as const;
export type RegimeTributario = (typeof REGIMES_TRIBUTARIOS)[number];
export const ROTULOS_REGIME_TRIBUTARIO: Record<RegimeTributario, string> = {
  simples_nacional: "Simples Nacional",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

// ---------------------------------------------------------------------------
// Inscrição Estadual
// ---------------------------------------------------------------------------

/**
 * Como o checkbox "Isento" da IE (etapa 2) se comporta conforme a resposta
 * "Contribuinte de ICMS" (etapa 3). Esta função é a ÚNICA definição dessa
 * dependência entre etapas — a tela e os esquemas (cliente e servidor)
 * leem daqui, para não existirem duas versões da regra.
 *
 * - "sim": IE obrigatória; "Isento" desmarcado e travado.
 * - "isento" (indIEDest 2, contribuinte isento de inscrição): IE não pode
 *   ser informada; "Isento" marcado e travado.
 * - "nao" / ainda não respondido: IE opcional, checkbox livre.
 */
export type EstadoCheckboxIsento = "livre" | "travado_desmarcado" | "travado_marcado";

export interface RegraInscricaoEstadual {
  obrigatoria: boolean;
  checkboxIsento: EstadoCheckboxIsento;
}

export function regraInscricaoEstadual(contribuinte: ContribuinteIcms | "" | undefined): RegraInscricaoEstadual {
  if (contribuinte === "sim") return { obrigatoria: true, checkboxIsento: "travado_desmarcado" };
  if (contribuinte === "isento") return { obrigatoria: false, checkboxIsento: "travado_marcado" };
  return { obrigatoria: false, checkboxIsento: "livre" };
}

function normalizarIe(ie: string): string {
  return ie.replace(/[\s./-]/g, "").toUpperCase();
}

/**
 * Checagem de formato usada na etapa 2, quando a UF ainda não é conhecida:
 * só dígitos (e o "P" de produtor rural de SP), de 2 a 14 — limites do
 * campo IE na NF-e. A regra do dígito verificador por UF vem depois
 * (validarInscricaoEstadual), quando o endereço já tem UF.
 */
export function formatoIeAceitavel(ie: string): boolean {
  return /^P?\d{2,14}$/.test(normalizarIe(ie));
}

/** Dígito verificador da IE conforme a regra da UF (27 UFs, via validations-br). */
export function validarInscricaoEstadual(ie: string, uf: Uf): boolean {
  return validateIE(normalizarIe(ie), uf);
}

// ---------------------------------------------------------------------------
// SUFRAMA
// ---------------------------------------------------------------------------

/**
 * Área de abrangência da SUFRAMA: Amazônia Ocidental (AC, AM, RO, RR) e as
 * Áreas de Livre Comércio de Macapá/Santana (AP). Fora dessas UFs o campo
 * nem aparece — e um valor que tenha ficado preenchido de uma UF anterior
 * é descartado ao salvar.
 */
const UFS_SUFRAMA: ReadonlySet<string> = new Set<Uf>(["AC", "AM", "AP", "RO", "RR"]);

export function ufTemSuframa(uf: string): boolean {
  return UFS_SUFRAMA.has(uf);
}

/** Inscrição SUFRAMA: 9 dígitos (formato XX.XXXX.XXX). */
export function validarInscricaoSuframa(valor: string): boolean {
  return /^\d{9}$/.test(valor.replace(/\D/g, ""));
}

// ---------------------------------------------------------------------------
// Bling
// ---------------------------------------------------------------------------

/**
 * Campo `indicadorIe` do contato no Bling v3 — mesmos códigos do indIEDest
 * da NF-e: 1 = contribuinte de ICMS, 2 = contribuinte isento de inscrição,
 * 9 = não contribuinte. Pessoa física é sempre 9.
 */
export type IndicadorIeBling = 1 | 2 | 9;

export function indicadorIeBling(tipo: TipoPessoa, contribuinte: ContribuinteIcms | null): IndicadorIeBling {
  if (tipo === "PF") return 9;
  if (contribuinte === "sim") return 1;
  if (contribuinte === "isento") return 2;
  return 9;
}
