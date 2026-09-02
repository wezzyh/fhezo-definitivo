import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
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
          cookiesParaDefinir.forEach(({ name, value }) => request.cookies.set(name, value));
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

  // TODO: quando houver mais de um administrador, checar aqui também se
  // `user` possui a permissão/role de admin, e não apenas se está
  // autenticado. Hoje isso não é necessário porque existe um único usuário
  // administrador.
  if (!user && !ehPaginaDeLogin) {
    const urlLogin = request.nextUrl.clone();
    urlLogin.pathname = "/admin/login";
    return NextResponse.redirect(urlLogin);
  }

  if (user && ehPaginaDeLogin) {
    const urlAdmin = request.nextUrl.clone();
    urlAdmin.pathname = "/admin";
    return NextResponse.redirect(urlAdmin);
  }

  return respostaSupabase;
}

export const config = {
  matcher: ["/admin/:path*"],
};
