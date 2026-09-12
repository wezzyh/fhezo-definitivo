import type { NextRequest, NextResponse } from "next/server";
import { lerCredenciaisManutencao, modoManutencaoAtivo } from "@/lib/config/lancamento";
import { COOKIE_LIBERACAO_MANUTENCAO, tokenLiberacaoValido } from "./liberacao";
import { CAMINHO_LIBERACAO_MANUTENCAO, respostaBloqueioManutencao, respostaPaginaManutencao } from "./pagina";

// Portão do modo construção, chamado no início do proxy (src/proxy.ts) para
// TODA requisição. Com MAINTENANCE_MODE ligado, só passa:
//   1. quem tem o cookie de liberação válido (assinado no servidor);
//   2. as rotas técnicas abaixo — caminho EXATO + método EXATO, nunca
//      prefixo, nunca por query string ou cabeçalho escolhido pelo cliente.
//
// Passar por aqui NÃO autentica ninguém: /admin continua exigindo login de
// admin logo depois, no próprio proxy (senha de manutenção ≠ admin).

type VariaveisAmbiente = Record<string, string | undefined>;

interface RotaIsenta {
  caminho: string;
  metodos: readonly string[];
}

export const ROTAS_ISENTAS_MANUTENCAO: readonly RotaIsenta[] = [
  // Webhook do Asaas: servidor→servidor, sem cookie. A autenticação continua
  // sendo o ASAAS_WEBHOOK_TOKEN conferido na própria rota.
  { caminho: "/api/webhooks/asaas", metodos: ["POST"] },
  // Retorno do OAuth do Melhor Envio (redirect vindo de melhorenvio.com.br).
  // Continua exigindo sessão de ADMIN — no proxy e na própria rota.
  { caminho: "/admin/integracao/melhorenvio/callback", metodos: ["GET"] },
  // Retorno do OAuth do Bling — mesmo caso do Melhor Envio.
  { caminho: "/admin/integracao/bling/callback", metodos: ["GET"] },
  // Onde a senha de manutenção é conferida (sem isso ninguém se libera).
  { caminho: CAMINHO_LIBERACAO_MANUTENCAO, metodos: ["POST"] },
];

/**
 * Arquivos de build do Next (JS/CSS/fontes com hash no nome), públicos por
 * natureza — não carregam dado nenhum. O matcher do proxy já os exclui;
 * a regra se repete aqui para o portão não depender só do matcher.
 */
function arquivoEstaticoNext(caminho: string, metodo: string): boolean {
  if (metodo !== "GET" && metodo !== "HEAD") return false;
  return caminho.startsWith("/_next/static/") || caminho === "/favicon.ico";
}

export function rotaIsentaDaManutencao(caminho: string, metodo: string, ehServerAction: boolean): boolean {
  // Uma Server Action pode ser encaminhada pelo Next para o worker que a
  // contém, mesmo se o POST chegar num caminho que não é o dela. Nenhuma
  // rota isenta usa Server Action — então cabeçalho Next-Action nunca passa
  // por exceção, só com o cookie de liberação.
  if (ehServerAction) return false;
  if (arquivoEstaticoNext(caminho, metodo)) return true;
  return ROTAS_ISENTAS_MANUTENCAO.some((rota) => rota.caminho === caminho && rota.metodos.includes(metodo));
}

/** null = pode seguir; senão, a resposta de bloqueio a devolver. */
export async function bloqueioModoManutencao(
  request: NextRequest,
  env: VariaveisAmbiente = process.env,
  agoraMs: number = Date.now(),
): Promise<NextResponse | null> {
  if (!modoManutencaoAtivo(env)) return null;

  const caminho = request.nextUrl.pathname;
  const metodo = request.method.toUpperCase();
  const ehServerAction = request.headers.has("next-action");

  if (rotaIsentaDaManutencao(caminho, metodo, ehServerAction)) return null;

  const token = request.cookies.get(COOKIE_LIBERACAO_MANUTENCAO)?.value;
  if (await tokenLiberacaoValido(lerCredenciaisManutencao(env), token, agoraMs)) return null;

  if ((metodo === "GET" || metodo === "HEAD") && !ehServerAction) return respostaPaginaManutencao();
  return respostaBloqueioManutencao();
}
