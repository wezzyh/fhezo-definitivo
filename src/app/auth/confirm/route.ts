import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

// Ponto de chegada de TODO link enviado por e-mail pelo Supabase Auth
// (confirmação de cadastro e recuperação de senha). Fica fora do grupo
// "(site)" de propósito: é um Route Handler, não uma página — não usa
// layout nem renderiza nada, só troca o token da URL por uma sessão real
// (cookies) e redireciona.
//
// Aceita os DOIS formatos de link, porque qual deles chega depende de como
// os templates de e-mail estão configurados no painel do Supabase:
//
// 1. "?token_hash=...&type=..." — formato do template customizado
//    ({{ .TokenHash }}). Resolvido com verifyOtp.
// 2. "?code=..." — formato do template padrão ({{ .ConfirmationURL }}),
//    que passa antes pelo endpoint /auth/v1/verify do Supabase e chega
//    aqui já no fluxo PKCE. Resolvido com exchangeCodeForSession.
//
// Suportar os dois evita que o fluxo quebre se alguém editar (ou restaurar)
// um template no painel depois.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Só aceita destino interno — "next" vem da URL e não pode virar um
  // redirecionamento aberto para outro domínio.
  const destinoBruto = searchParams.get("next") ?? "/conta";
  const destino = destinoBruto.startsWith("/") && !destinoBruto.startsWith("//") ? destinoBruto : "/conta";

  const supabase = await criarClienteSupabaseServidor();

  let deuCerto = false;

  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    deuCerto = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    deuCerto = !error;
  }

  if (!deuCerto) {
    // Link expirado, já usado, ou aberto em outro navegador (no fluxo PKCE
    // o verificador fica num cookie do navegador que pediu o e-mail).
    return NextResponse.redirect(new URL("/login?erro=link_invalido", request.url));
  }

  // Não vincula a conta a cadastros antigos com o mesmo e-mail (APPSEC-003):
  // o e-mail de uma compra sem conta nunca foi verificado.
  return NextResponse.redirect(new URL(destino, request.url));
}
