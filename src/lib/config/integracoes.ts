import "server-only";

// Configuração central das integrações de pagamento (Asaas) e frete (Melhor
// Envio) — APPSEC-028. É o ÚNICO lugar do código com as URLs operacionais
// dessas duas integrações: nenhum outro arquivo monta host de API ou de
// OAuth. O ambiente (sandbox/produção) vem de ASAAS_ENV / MELHOR_ENVIO_ENV e
// é conferido contra o ambiente do deploy em regras-ambiente.ts — produção
// nunca usa sandbox, e preview/local nunca usam produção.
//
// Cada função lê o ambiente na hora (sem cache) e LANÇA
// ErroConfiguracaoAmbiente se algo estiver errado: quem chama trata como
// "integração indisponível" e não faz a operação — sem fallback.

import {
  ErroConfiguracaoAmbiente,
  lerAmbienteIntegracaoValidado,
  validarChaveAsaasParaAmbiente,
  type AmbienteIntegracao,
} from "./regras-ambiente";

type VariaveisAmbiente = Record<string, string | undefined>;

const URL_API_ASAAS: Record<AmbienteIntegracao, string> = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
};

const URLS_MELHOR_ENVIO: Record<AmbienteIntegracao, { urlApi: string; urlAutorizacao: string; urlToken: string }> = {
  sandbox: {
    urlApi: "https://sandbox.melhorenvio.com.br/api/v2",
    urlAutorizacao: "https://sandbox.melhorenvio.com.br/oauth/authorize",
    urlToken: "https://sandbox.melhorenvio.com.br/oauth/token",
  },
  production: {
    urlApi: "https://melhorenvio.com.br/api/v2",
    urlAutorizacao: "https://melhorenvio.com.br/oauth/authorize",
    urlToken: "https://melhorenvio.com.br/oauth/token",
  },
};

export interface ConfigAsaas {
  ambiente: AmbienteIntegracao;
  urlApi: string;
  chaveApi: string;
}

export function obterConfigAsaas(env: VariaveisAmbiente = process.env): ConfigAsaas {
  const ambiente = lerAmbienteIntegracaoValidado(env, "ASAAS_ENV");

  const chaveApi = env.ASAAS_API_KEY;
  if (!chaveApi) {
    throw new ErroConfiguracaoAmbiente("ASAAS_API_KEY não está configurada.");
  }
  validarChaveAsaasParaAmbiente(chaveApi, ambiente);

  return { ambiente, urlApi: URL_API_ASAAS[ambiente], chaveApi };
}

export interface ConfigMelhorEnvio {
  ambiente: AmbienteIntegracao;
  urlApi: string;
  urlAutorizacao: string;
  urlToken: string;
}

/** URLs de API e de OAuth sempre do MESMO ambiente — nunca OAuth de um e API do outro. */
export function obterConfigMelhorEnvio(env: VariaveisAmbiente = process.env): ConfigMelhorEnvio {
  const ambiente = lerAmbienteIntegracaoValidado(env, "MELHOR_ENVIO_ENV");
  return { ambiente, ...URLS_MELHOR_ENVIO[ambiente] };
}

export interface CredenciaisOAuthMelhorEnvio {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Só o fluxo OAuth (conectar/renovar) precisa das credenciais; a cotação usa só o token salvo. */
export function obterCredenciaisOAuthMelhorEnvio(env: VariaveisAmbiente = process.env): CredenciaisOAuthMelhorEnvio {
  const clientId = env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = env.MELHOR_ENVIO_CLIENT_SECRET;
  const redirectUri = env.MELHOR_ENVIO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new ErroConfiguracaoAmbiente(
      "Configuração incompleta: defina MELHOR_ENVIO_CLIENT_ID, MELHOR_ENVIO_CLIENT_SECRET e MELHOR_ENVIO_REDIRECT_URI.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}
