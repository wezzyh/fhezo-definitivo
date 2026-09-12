import type { SupabaseClient } from "@supabase/supabase-js";
import type { Integracao } from "@/types/database";
import {
  obterConfigMelhorEnvio,
  obterCredenciaisOAuthMelhorEnvio,
  type ConfigMelhorEnvio,
} from "@/lib/config/integracoes";
import type { AmbienteIntegracao } from "@/lib/config/regras-ambiente";

// Fluxo de autorização OAuth 2.0 do Melhor Envio e persistência dos tokens
// na tabela "integracoes". Compartilhado pela rota de callback
// (src/app/admin/integracao/melhorenvio/callback/route.ts) e pelo cálculo
// de frete (src/lib/frete/cotacao.ts), que lê/renova o token salvo aqui
// em vez de depender de um token fixo em variável de ambiente.
//
// APPSEC-028: URLs de OAuth vêm de obterConfigMelhorEnvio (sandbox ou
// produção conforme MELHOR_ENVIO_ENV, sempre as mesmas da API), e cada token
// é salvo com o ambiente que o emitiu. Um token de outro ambiente — ou sem
// ambiente registrado, anterior à migração 0031 — nunca é usado.

export const PROVEDOR_MELHOR_ENVIO = "melhor_envio";

const SCOPES_MELHOR_ENVIO = [
  "cart-read",
  "cart-write",
  "shipping-calculate",
  "shipping-generate",
];

// Renova um pouco antes da expiração real para evitar usar um token que
// vence entre a checagem e a chamada à API do Melhor Envio.
const MARGEM_EXPIRACAO_MS = 60_000;

/** Monta a URL para onde o admin é levado para autorizar a integração. */
export function montarUrlAutorizacaoMelhorEnvio(): string {
  const config = obterConfigMelhorEnvio();
  const { clientId, redirectUri } = obterCredenciaisOAuthMelhorEnvio();

  const parametros = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES_MELHOR_ENVIO.join(" "),
  });

  return `${config.urlAutorizacao}?${parametros.toString()}`;
}

interface RespostaTokenMelhorEnvio {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/** Tokens já marcados com o ambiente (sandbox/produção) do servidor OAuth que os emitiu. */
export interface TokensMelhorEnvio extends RespostaTokenMelhorEnvio {
  ambiente: AmbienteIntegracao;
}

function ehRespostaTokenValida(dados: unknown): dados is RespostaTokenMelhorEnvio {
  if (!dados || typeof dados !== "object") return false;
  const registro = dados as Record<string, unknown>;
  return (
    typeof registro.access_token === "string" &&
    typeof registro.refresh_token === "string" &&
    typeof registro.expires_in === "number"
  );
}

async function solicitarToken(config: ConfigMelhorEnvio, corpo: Record<string, string>): Promise<TokensMelhorEnvio> {
  const resposta = await fetch(config.urlToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(corpo),
    cache: "no-store",
  });

  const dados: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok || !ehRespostaTokenValida(dados)) {
    throw new Error(`O Melhor Envio recusou a solicitação de token (status ${resposta.status}).`);
  }

  return { ...dados, ambiente: config.ambiente };
}

/** Troca o "code" recebido no callback OAuth pelo access_token/refresh_token. */
export async function trocarCodigoPorToken(code: string): Promise<TokensMelhorEnvio> {
  const config = obterConfigMelhorEnvio();
  const { clientId, clientSecret, redirectUri } = obterCredenciaisOAuthMelhorEnvio();

  return solicitarToken(config, {
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });
}

async function renovarToken(config: ConfigMelhorEnvio, refreshToken: string): Promise<TokensMelhorEnvio> {
  const { clientId, clientSecret } = obterCredenciaisOAuthMelhorEnvio();

  return solicitarToken(config, {
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}

/** Salva (ou substitui) os tokens da integração com o Melhor Envio, com o ambiente que os emitiu. */
export async function salvarTokensMelhorEnvio(
  supabase: SupabaseClient,
  tokens: TokensMelhorEnvio,
): Promise<void> {
  const expiraEm = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await supabase.from("integracoes").upsert(
    {
      provedor: PROVEDOR_MELHOR_ENVIO,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expira_em: expiraEm,
      ambiente: tokens.ambiente,
    },
    { onConflict: "provedor" },
  );

  if (error) {
    throw new Error(`Erro ao salvar os tokens do Melhor Envio: ${error.message}`);
  }
}

/** Busca a linha de integração salva para o Melhor Envio, se existir. */
export async function buscarIntegracaoMelhorEnvio(
  supabase: SupabaseClient,
): Promise<Integracao | null> {
  const { data } = await supabase
    .from("integracoes")
    .select("*")
    .eq("provedor", PROVEDOR_MELHOR_ENVIO)
    .limit(1)
    .returns<Integracao[]>();

  return data?.[0] ?? null;
}

/**
 * Retorna um access_token válido para o Melhor Envio, renovando-o
 * automaticamente via refresh_token quando necessário. Retorna `null`
 * quando a integração nunca foi conectada, a renovação falha, a
 * configuração de ambiente é inválida, ou o token salvo é de OUTRO ambiente
 * (ex.: token de sandbox num deploy de produção) — quem chama deve tratar
 * isso como "frete indisponível"; o admin precisa reconectar no ambiente
 * certo.
 */
export async function obterTokenValidoMelhorEnvio(
  supabase: SupabaseClient,
): Promise<string | null> {
  let config: ConfigMelhorEnvio;
  try {
    config = obterConfigMelhorEnvio();
  } catch {
    return null;
  }

  const integracao = await buscarIntegracaoMelhorEnvio(supabase);

  if (!integracao?.access_token) {
    return null;
  }

  // Inclui o caso de token sem ambiente registrado (salvo antes da migração
  // 0031): sem saber de onde veio, não é usado.
  if (integracao.ambiente !== config.ambiente) {
    return null;
  }

  const expiraEm = integracao.expira_em ? new Date(integracao.expira_em).getTime() : 0;
  const expirado = Date.now() + MARGEM_EXPIRACAO_MS >= expiraEm;

  if (!expirado) {
    return integracao.access_token;
  }

  if (!integracao.refresh_token) {
    return null;
  }

  try {
    const novosTokens = await renovarToken(config, integracao.refresh_token);
    await salvarTokensMelhorEnvio(supabase, novosTokens);
    return novosTokens.access_token;
  } catch {
    return null;
  }
}
