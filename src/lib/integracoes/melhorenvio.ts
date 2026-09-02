import type { SupabaseClient } from "@supabase/supabase-js";
import type { Integracao } from "@/types/database";

// Fluxo de autorização OAuth 2.0 do Melhor Envio (sandbox) e persistência
// dos tokens na tabela "integracoes". Compartilhado pela rota de callback
// (src/app/admin/integracao/melhorenvio/callback/route.ts) e pelo cálculo
// de frete (src/lib/frete/melhorenvio.ts), que lê/renova o token salvo aqui
// em vez de depender de um token fixo em variável de ambiente.

export const PROVEDOR_MELHOR_ENVIO = "melhor_envio";

const URL_AUTORIZACAO = "https://sandbox.melhorenvio.com.br/oauth/authorize";
const URL_TOKEN = "https://sandbox.melhorenvio.com.br/oauth/token";

const SCOPES_MELHOR_ENVIO = [
  "cart-read",
  "cart-write",
  "shipping-calculate",
  "shipping-generate",
];

// Renova um pouco antes da expiração real para evitar usar um token que
// vence entre a checagem e a chamada à API do Melhor Envio.
const MARGEM_EXPIRACAO_MS = 60_000;

function lerCredenciaisMelhorEnvio(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;
  const clientSecret = process.env.MELHOR_ENVIO_CLIENT_SECRET;
  const redirectUri = process.env.MELHOR_ENVIO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Configuração incompleta: defina MELHOR_ENVIO_CLIENT_ID, MELHOR_ENVIO_CLIENT_SECRET e MELHOR_ENVIO_REDIRECT_URI.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

/** Monta a URL para onde o admin é levado para autorizar a integração. */
export function montarUrlAutorizacaoMelhorEnvio(): string {
  const { clientId, redirectUri } = lerCredenciaisMelhorEnvio();

  const parametros = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES_MELHOR_ENVIO.join(" "),
  });

  return `${URL_AUTORIZACAO}?${parametros.toString()}`;
}

interface RespostaTokenMelhorEnvio {
  access_token: string;
  refresh_token: string;
  expires_in: number;
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

async function solicitarToken(corpo: Record<string, string>): Promise<RespostaTokenMelhorEnvio> {
  const resposta = await fetch(URL_TOKEN, {
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

  return dados;
}

/** Troca o "code" recebido no callback OAuth pelo access_token/refresh_token. */
export async function trocarCodigoPorToken(code: string): Promise<RespostaTokenMelhorEnvio> {
  const { clientId, clientSecret, redirectUri } = lerCredenciaisMelhorEnvio();

  return solicitarToken({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });
}

async function renovarToken(refreshToken: string): Promise<RespostaTokenMelhorEnvio> {
  const { clientId, clientSecret } = lerCredenciaisMelhorEnvio();

  return solicitarToken({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}

/** Salva (ou substitui) os tokens da integração com o Melhor Envio. */
export async function salvarTokensMelhorEnvio(
  supabase: SupabaseClient,
  tokens: RespostaTokenMelhorEnvio,
): Promise<void> {
  const expiraEm = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await supabase.from("integracoes").upsert(
    {
      provedor: PROVEDOR_MELHOR_ENVIO,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expira_em: expiraEm,
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
 * quando a integração nunca foi conectada ou a renovação falha — quem
 * chama deve tratar isso como "frete indisponível", sem travar o caller.
 */
export async function obterTokenValidoMelhorEnvio(
  supabase: SupabaseClient,
): Promise<string | null> {
  const integracao = await buscarIntegracaoMelhorEnvio(supabase);

  if (!integracao?.access_token) {
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
    const novosTokens = await renovarToken(integracao.refresh_token);
    await salvarTokensMelhorEnvio(supabase, novosTokens);
    return novosTokens.access_token;
  } catch {
    return null;
  }
}
