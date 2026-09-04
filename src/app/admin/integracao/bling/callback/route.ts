import { NextResponse, type NextRequest } from "next/server";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { trocarCodigoPorTokenBling, salvarTokensBling } from "@/lib/integracoes/bling";

// Callback do fluxo OAuth 2.0 do Bling: recebe o "code", troca pelo
// access_token/refresh_token e salva na tabela "integracoes". Mesmo padrão
// do callback do Melhor Envio (src/app/admin/integracao/melhorenvio/callback/route.ts)
// — protegido: só continua se houver um admin autenticado (o proxy em
// src/proxy.ts já bloqueia /admin/* para quem não está logado, mas a
// checagem é repetida aqui porque um Route Handler pode ser chamado
// diretamente).
export async function GET(request: NextRequest) {
  const supabase = await criarClienteSupabaseServidor();

  const redirecionarParaAdmin = (mensagem: string, sucesso: boolean) => {
    const destino = request.nextUrl.clone();
    destino.pathname = "/admin/integracao";
    destino.search = "";
    destino.searchParams.set("integracaoBling", sucesso ? "sucesso" : "erro");
    destino.searchParams.set("mensagem", mensagem);
    return NextResponse.redirect(destino);
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const urlLogin = request.nextUrl.clone();
    urlLogin.pathname = "/admin/login";
    urlLogin.search = "";
    return NextResponse.redirect(urlLogin);
  }

  const erroAutorizacao = request.nextUrl.searchParams.get("error");
  if (erroAutorizacao) {
    return redirecionarParaAdmin("A autorização foi cancelada ou negada no Bling.", false);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return redirecionarParaAdmin("O Bling não retornou o código de autorização esperado.", false);
  }

  try {
    const tokens = await trocarCodigoPorTokenBling(code);
    await salvarTokensBling(supabase, tokens);
  } catch (erro) {
    const mensagem =
      erro instanceof Error ? erro.message : "Erro desconhecido ao conectar com o Bling.";
    return redirecionarParaAdmin(`Falha ao conectar com o Bling: ${mensagem}`, false);
  }

  return redirecionarParaAdmin("Bling conectado com sucesso.", true);
}
