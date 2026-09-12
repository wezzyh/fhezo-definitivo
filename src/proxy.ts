import { politicaCheckout } from "@/lib/checkout/csp";
import { bloqueioModoManutencao } from "@/lib/manutencao/portao";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Modo construção (MAINTENANCE_MODE) vem antes de tudo, para qualquer
  // caminho. Passar por ele não dispensa nada do que vem abaixo: /admin
  // continua exigindo admin e /checkout continua com a CSP própria.
  const bloqueio = await bloqueioModoManutencao(request);
  if (bloqueio) return bloqueio;

  if (
    request.nextUrl.pathname === "/checkout" ||
    request.nextUrl.pathname.startsWith("/checkout/")
  ) {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const politica = politicaCheckout(
      nonce,
      process.env.NODE_ENV === "development",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", politica);
    const resposta = NextResponse.next({
      request: { headers: requestHeaders },
    });
    resposta.headers.set("Content-Security-Policy", politica);
    resposta.headers.set("Cache-Control", "private, no-store, max-age=0");
    resposta.headers.set("Referrer-Policy", "no-referrer");
    resposta.headers.set("X-Content-Type-Options", "nosniff");
    resposta.headers.set("X-Frame-Options", "DENY");
    return resposta;
  }
  // O matcher agora cobre o site inteiro (por causa do modo construção);
  // a trava de admin abaixo continua valendo só para /admin, como antes.
  if (
    request.nextUrl.pathname !== "/admin" &&
    !request.nextUrl.pathname.startsWith("/admin/")
  ) {
    return NextResponse.next();
  }
  let respostaSupabase = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaDefinir) {
          cookiesParaDefinir.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          respostaSupabase = NextResponse.next({ request });
          cookiesParaDefinir.forEach(({ name, value, options }) =>
            respostaSupabase.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() revalida o token com o servidor do Supabase, em vez de confiar
  // apenas no conteúdo do cookie local.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ehPaginaDeLogin = request.nextUrl.pathname === "/admin/login";

  if (!user) {
    if (ehPaginaDeLogin) return respostaSupabase;

    const urlLogin = request.nextUrl.clone();
    urlLogin.pathname = "/admin/login";
    return NextResponse.redirect(urlLogin);
  }

  // Estar autenticado NÃO basta para entrar no /admin. Desde que existe
  // login de cliente no site público (migração 0018), um cliente comum
  // também é "authenticated" — sem a checagem abaixo, qualquer pessoa que
  // se cadastrasse em /cadastro entraria no painel administrativo inteiro.
  // A RLS já impediria esse cliente de LER ou GRAVAR qualquer dado interno
  // (todas as políticas "to authenticated" exigem is_admin() desde a 0018),
  // mas ele ainda enxergaria a estrutura do painel — telas, menus e
  // formulários — o que não deve acontecer.
  //
  // is_admin() é a mesma função que as políticas de RLS usam, então não
  // existe uma segunda definição de "quem é admin" para sair do ar de
  // sincronia: a lista é a tabela "admins". Em caso de erro na chamada
  // (rede, função ausente), o acesso é NEGADO de propósito — falhar
  // fechado é o comportamento certo aqui.
  const { data: ehAdmin, error: erroAdmin } = await supabase.rpc("is_admin");

  if (erroAdmin || ehAdmin !== true) {
    // Na tela de login o acesso é liberado mesmo para não-admin: é
    // justamente onde um cliente logado por engano troca para a conta de
    // administrador (o formulário faz signIn, substituindo a sessão).
    if (ehPaginaDeLogin) return respostaSupabase;

    const urlInicio = request.nextUrl.clone();
    urlInicio.pathname = "/";
    urlInicio.search = "";
    return NextResponse.redirect(urlInicio);
  }

  if (ehPaginaDeLogin) {
    const urlAdmin = request.nextUrl.clone();
    urlAdmin.pathname = "/admin";
    return NextResponse.redirect(urlAdmin);
  }

  return respostaSupabase;
}

// Tudo, menos os arquivos de build do Next e o favicon: o modo construção
// precisa ver toda página, rota e Server Action. (Server Actions são POSTs
// para o caminho da página — um matcher mais estreito deixaria as de fora
// sem portão.)
export const config = {
  matcher: ["/((?!_next/static/|favicon\\.ico$).*)"],
};
