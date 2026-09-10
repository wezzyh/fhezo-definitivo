import { headers } from "next/headers";

/**
 * URL base do site (ex.: "https://loja.fhezo.com.br"), montada a partir dos
 * cabeçalhos da requisição atual. Usada para gerar os links que vão DENTRO
 * dos e-mails do Supabase Auth (confirmação de cadastro e recuperação de
 * senha) — esses links precisam apontar para este site, não para o domínio
 * do Supabase.
 *
 * Lê do request em vez de exigir uma variável de ambiente nova porque o
 * projeto roda em três lugares (localhost, preview e produção) e cada um
 * tem host próprio; uma variável fixa quebraria em dois deles. O
 * "x-forwarded-proto" é o que a Vercel usa para informar o protocolo
 * original — em localhost ele não existe, daí o fallback para http.
 *
 * ATENÇÃO: toda URL gerada aqui precisa estar liberada em
 * Supabase > Authentication > URL Configuration > Redirect URLs, senão o
 * Supabase ignora o redirecionamento e manda o usuário para a Site URL.
 */
export async function obterUrlBaseSite(): Promise<string> {
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "localhost:3000";
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}
