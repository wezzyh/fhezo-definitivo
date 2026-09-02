import type { SupabaseClient } from "@supabase/supabase-js";
import type { Integracao } from "@/types/database";

// Fluxo de autorização OAuth 2.0 do Bling (ERP) e persistência dos tokens
// na tabela "integracoes" (provedor = 'bling') — mesmo padrão já usado
// para o Melhor Envio (ver src/lib/integracoes/melhorenvio.ts). Compartilhado
// pela rota de callback (src/app/admin/integracao/bling/callback/route.ts)
// e pelo cliente de API de recursos (src/lib/integracoes/bling-api.ts).
//
// Diferenças em relação ao Melhor Envio, específicas do protocolo do Bling:
// - client_id/client_secret vão no header `Authorization: Basic`, nunca no
//   corpo da requisição.
// - O corpo do POST /oauth/token é `application/x-www-form-urlencoded`,
//   não JSON.
// - É preciso o header `enable-jwt: 1` em toda chamada — troca de code,
//   renovação e também nas chamadas de recurso (ver bling-api.ts). Sem
//   ele o Bling ainda emite o formato de token antigo, que a Bling está
//   descontinuando aos poucos.
//
// Fontes: https://developer.bling.com.br/bling-api,
// https://developer.bling.com.br/migracao-jwt

export const PROVEDOR_BLING = "bling";

const URL_AUTORIZACAO = "https://www.bling.com.br/Api/v3/oauth/authorize";
const URL_TOKEN = "https://www.bling.com.br/Api/v3/oauth/token";

// Renova um pouco antes da expiração real para evitar usar um token que
// vence entre a checagem e a chamada à API do Bling.
const MARGEM_EXPIRACAO_MS = 60_000;

function lerCredenciaisBling(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = process.env.BLING_CLIENT_ID;
  const clientSecret = process.env.BLING_CLIENT_SECRET;
  const redirectUri = process.env.BLING_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Configuração incompleta: defina BLING_CLIENT_ID, BLING_CLIENT_SECRET e BLING_REDIRECT_URI.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

function codificarBasicAuth(clientId: string, clientSecret: string): string {
  return Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
}

/** Monta a URL para onde o admin é levado para autorizar a integração. */
export function montarUrlAutorizacaoBling(): string {
  const { clientId, redirectUri } = lerCredenciaisBling();

  const parametros = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    state: "fhezo-admin",
    redirect_uri: redirectUri,
  });

  return `${URL_AUTORIZACAO}?${parametros.toString()}`;
}

interface RespostaTokenBling {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

function ehRespostaTokenValida(dados: unknown): dados is RespostaTokenBling {
  if (!dados || typeof dados !== "object") return false;
  const registro = dados as Record<string, unknown>;
  return (
    typeof registro.access_token === "string" &&
    typeof registro.refresh_token === "string" &&
    typeof registro.expires_in === "number"
  );
}

async function solicitarToken(corpo: Record<string, string>): Promise<RespostaTokenBling> {
  const { clientId, clientSecret } = lerCredenciaisBling();

  const resposta = await fetch(URL_TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${codificarBasicAuth(clientId, clientSecret)}`,
      "enable-jwt": "1",
    },
    body: new URLSearchParams(corpo).toString(),
    cache: "no-store",
  });

  const dados: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok || !ehRespostaTokenValida(dados)) {
    throw new Error(`O Bling recusou a solicitação de token (status ${resposta.status}).`);
  }

  return dados;
}

/** Troca o "code" recebido no callback OAuth pelo access_token/refresh_token. */
export async function trocarCodigoPorTokenBling(code: string): Promise<RespostaTokenBling> {
  const { redirectUri } = lerCredenciaisBling();

  return solicitarToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
}

async function renovarTokenBling(refreshToken: string): Promise<RespostaTokenBling> {
  return solicitarToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

/** Salva (ou substitui) os tokens da integração com o Bling. */
export async function salvarTokensBling(
  supabase: SupabaseClient,
  tokens: RespostaTokenBling,
): Promise<void> {
  const expiraEm = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await supabase.from("integracoes").upsert(
    {
      provedor: PROVEDOR_BLING,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expira_em: expiraEm,
    },
    { onConflict: "provedor" },
  );

  if (error) {
    throw new Error(`Erro ao salvar os tokens do Bling: ${error.message}`);
  }
}

/** Busca a linha de integração salva para o Bling, se existir. */
export async function buscarIntegracaoBling(supabase: SupabaseClient): Promise<Integracao | null> {
  const { data } = await supabase
    .from("integracoes")
    .select("*")
    .eq("provedor", PROVEDOR_BLING)
    .limit(1)
    .returns<Integracao[]>();

  return data?.[0] ?? null;
}

/**
 * Retorna um access_token válido para o Bling, renovando-o automaticamente
 * via refresh_token quando necessário (o refresh_token do Bling expira em
 * 30 dias). Retorna `null` quando a integração nunca foi conectada ou a
 * renovação falha — quem chama deve tratar isso como "Bling indisponível",
 * sem travar o caller.
 */
export async function obterTokenValidoBling(supabase: SupabaseClient): Promise<string | null> {
  const integracao = await buscarIntegracaoBling(supabase);

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
    const novosTokens = await renovarTokenBling(integracao.refresh_token);
    await salvarTokensBling(supabase, novosTokens);
    return novosTokens.access_token;
  } catch {
    return null;
  }
}
