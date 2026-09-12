// Rascunho do cadastro em sessionStorage: um recarregamento acidental no
// meio das etapas não apaga o que foi digitado. sessionStorage (e não
// localStorage) de propósito — some ao fechar a aba, então dado pessoal
// (CPF, endereço) não fica no computador depois de ir embora.
//
// A senha e os aceites (termos/marketing) NUNCA são gravados: a senha por
// segurança; os aceites porque consentimento tem que ser dado de novo, na
// hora, e não herdado de uma sessão anterior.

import { valoresIniciaisCadastro, type ValoresFormularioCadastro } from "./esquemas";

const CHAVE_SESSIONSTORAGE = "fhezo:cadastro:rascunho:v1";

/**
 * Copia de `extra` só as chaves que existem em `base`, com o mesmo tipo —
 * um rascunho de uma versão anterior do formulário (ou editado à mão) não
 * consegue injetar campo desconhecido nem trocar string por objeto.
 */
function mesclar<T>(base: T, extra: unknown): T {
  if (typeof base !== "object" || base === null) {
    return typeof extra === typeof base ? (extra as T) : base;
  }
  if (typeof extra !== "object" || extra === null) return base;

  const resultado: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const chave of Object.keys(resultado)) {
    resultado[chave] = mesclar(resultado[chave], (extra as Record<string, unknown>)[chave]);
  }
  return resultado as T;
}

function semSegredos(valores: ValoresFormularioCadastro): Record<string, unknown> {
  const copia: Record<string, unknown> = { ...valores, acesso: { email: valores.acesso.email } };
  delete copia.aceiteTermos;
  delete copia.aceiteMarketing;
  return copia;
}

/** null quando não há rascunho, ele é ilegível, ou é igual ao formulário vazio. */
export function lerRascunho(): ValoresFormularioCadastro | null {
  try {
    const bruto = window.sessionStorage.getItem(CHAVE_SESSIONSTORAGE);
    if (!bruto) return null;

    const valores = mesclar(valoresIniciaisCadastro, JSON.parse(bruto));
    const vazio = JSON.stringify(semSegredos(valoresIniciaisCadastro));
    return JSON.stringify(semSegredos(valores)) === vazio ? null : valores;
  } catch {
    return null;
  }
}

export function salvarRascunho(valores: ValoresFormularioCadastro): void {
  try {
    window.sessionStorage.setItem(CHAVE_SESSIONSTORAGE, JSON.stringify(semSegredos(valores)));
  } catch {
    // sessionStorage indisponível (aba anônima restrita, cota cheia) — o
    // cadastro continua funcionando, só não sobrevive a um recarregamento.
  }
}

export function apagarRascunho(): void {
  try {
    window.sessionStorage.removeItem(CHAVE_SESSIONSTORAGE);
  } catch {
    // idem salvarRascunho
  }
}
