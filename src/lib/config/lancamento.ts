// Chaves de lançamento da loja: modo construção (MAINTENANCE_MODE) e
// recebimento de pedidos (CHECKOUT_ENABLED). Funções puras, sem
// "server-only" e sem dependências de Next, de propósito: este arquivo é
// importado pelo proxy (src/proxy.ts) e pelo next.config.ts.
//
// Mesmo estilo de APPSEC-028 (regras-ambiente.ts): cada chave aceita SÓ
// "true" ou "false", escritos exatamente assim. Não existe valor padrão que
// abra a loja — ausente ou inválido cai sempre no lado seguro:
//   MAINTENANCE_MODE  ausente/inválido → manutenção LIGADA
//   CHECKOUT_ENABLED  ausente/inválido → checkout DESLIGADO
// No build de Production na Vercel, ausente/inválido derruba o build
// (validarConfigLancamento), para o erro aparecer antes de ir ao ar.

import { ErroConfiguracaoAmbiente } from "./regras-ambiente";

type VariaveisAmbiente = Record<string, string | undefined>;
type ChaveLancamento = "MAINTENANCE_MODE" | "CHECKOUT_ENABLED";

export const MENSAGEM_CHECKOUT_FECHADO = "A loja ainda não está recebendo pedidos. Volte em breve.";

// A senha de manutenção é conferida num endpoint público sem limite
// persistente de tentativas — curta demais seria adivinhável.
export const TAMANHO_MINIMO_SENHA_MANUTENCAO = 12;
// Chave de assinatura HMAC do cookie de liberação.
export const TAMANHO_MINIMO_SEGREDO_MANUTENCAO = 32;

/** true/false quando o valor é exatamente "true"/"false"; null para ausente ou qualquer outra coisa. */
function lerChave(env: VariaveisAmbiente, variavel: ChaveLancamento): boolean | null {
  const valor = env[variavel];
  if (valor === "true") return true;
  if (valor === "false") return false;
  return null;
}

/** Fail closed: só "false" explícito desliga a manutenção. */
export function modoManutencaoAtivo(env: VariaveisAmbiente = process.env): boolean {
  return lerChave(env, "MAINTENANCE_MODE") !== false;
}

/** Fail closed: só "true" explícito abre o checkout. */
export function checkoutHabilitado(env: VariaveisAmbiente = process.env): boolean {
  return lerChave(env, "CHECKOUT_ENABLED") === true;
}

export interface CredenciaisManutencao {
  senha: string;
  segredo: string;
}

/**
 * Senha e segredo de assinatura, ou null se algum estiver ausente, curto
 * demais ou se os dois forem iguais. null = ninguém consegue liberar o
 * acesso pela senha (a página de construção continua no ar — falha fechado).
 */
export function lerCredenciaisManutencao(env: VariaveisAmbiente = process.env): CredenciaisManutencao | null {
  const senha = env.MAINTENANCE_PASSWORD;
  const segredo = env.MAINTENANCE_SECRET;
  if (!senha || senha.length < TAMANHO_MINIMO_SENHA_MANUTENCAO) return null;
  if (!segredo || segredo.length < TAMANHO_MINIMO_SEGREDO_MANUTENCAO) return null;
  if (senha === segredo) return null;
  return { senha, segredo };
}

function exigirChave(env: VariaveisAmbiente, variavel: ChaveLancamento): boolean {
  const valor = lerChave(env, variavel);
  if (valor !== null) return valor;
  // O valor recebido não é repetido na mensagem (mesma regra de regras-ambiente.ts).
  throw new ErroConfiguracaoAmbiente(
    env[variavel] === undefined || env[variavel] === ""
      ? `${variavel} não está definida. Use exatamente "true" ou "false".`
      : `${variavel} tem um valor inválido. Use exatamente "true" ou "false".`,
  );
}

/**
 * Validação do build de Production (next.config.ts). Lança na primeira
 * configuração inválida; nenhuma mensagem inclui senha ou segredo.
 */
export function validarConfigLancamento(env: VariaveisAmbiente): {
  manutencao: boolean;
  checkout: boolean;
} {
  const manutencao = exigirChave(env, "MAINTENANCE_MODE");
  const checkout = exigirChave(env, "CHECKOUT_ENABLED");

  if (manutencao && !lerCredenciaisManutencao(env)) {
    throw new ErroConfiguracaoAmbiente(
      `MAINTENANCE_MODE=true exige MAINTENANCE_PASSWORD (mínimo ${TAMANHO_MINIMO_SENHA_MANUTENCAO} caracteres) e ` +
        `MAINTENANCE_SECRET (mínimo ${TAMANHO_MINIMO_SEGREDO_MANUTENCAO} caracteres), diferentes entre si.`,
    );
  }
  return { manutencao, checkout };
}
