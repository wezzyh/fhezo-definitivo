import { NextResponse, type NextRequest } from "next/server";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { trocarCodigoPorToken, salvarTokensMelhorEnvio } from "@/lib/integracoes/melhorenvio";

// Callback do fluxo OAuth 2.0 do Melhor Envio: recebe o "code", troca pelo
// access_token/refresh_token e salva na tabela "integracoes". Protegido —
// só continua se houver um admin autenticado (o proxy em src/proxy.ts já
// bloqueia /admin/* para quem não está logado, mas a checagem é repetida
// aqui porque um Route Handler pode ser chamado diretamente).
export async function GET(request: NextRequest) {
  const supabase = await criarClienteSupabaseServidor();

  const redirecionarParaAdmin = (mensagem: string, sucesso: boolean) => {
    const destino = request.nextUrl.clone();
    destino.pathname = "/admin/integracao";
    destino.search = "";
    destino.searchParams.set("integracao", sucesso ? "sucesso" : "erro");
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
    return redirecionarParaAdmin(
      "A autorização foi cancelada ou negada no Melhor Envio.",
      false,
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return redirecionarParaAdmin(
      "O Melhor Envio não retornou o código de autorização esperado.",
      false,
    );
  }

  try {
    const tokens = await trocarCodigoPorToken(code);
    await salvarTokensMelhorEnvio(supabase, tokens);
  } catch (erro) {
    const mensagem =
      erro instanceof Error ? erro.message : "Erro desconhecido ao conectar com o Melhor Envio.";
    return redirecionarParaAdmin(`Falha ao conectar com o Melhor Envio: ${mensagem}`, false);
  }

  return redirecionarParaAdmin("Melhor Envio conectado com sucesso.", true);
}
