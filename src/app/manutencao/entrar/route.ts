import { NextResponse, type NextRequest } from "next/server";
import { lerCredenciaisManutencao, modoManutencaoAtivo } from "@/lib/config/lancamento";
import {
  COOKIE_LIBERACAO_MANUTENCAO,
  DURACAO_LIBERACAO_SEGUNDOS,
  criarTokenLiberacao,
  senhaManutencaoConfere,
} from "@/lib/manutencao/liberacao";
import { respostaPaginaManutencao } from "@/lib/manutencao/pagina";

// Liberação do modo construção: confere MAINTENANCE_PASSWORD e grava o
// cookie assinado (src/lib/manutencao/liberacao.ts). É a única rota do site
// que recebe a senha; ela nunca é ecoada, logada nem gravada no cookie.
//
// Isso NÃO é login de admin: o cookie só deixa o navegador passar pelo
// portão do modo construção. /admin continua exigindo o login de sempre.

// Atraso fixo em toda senha errada — encarece tentativa por força bruta.
// Não substitui um limite persistente (ver HANDOFF.md, "Modo construção").
const ATRASO_SENHA_ERRADA_MS = 400;
const TAMANHO_MAXIMO_CORPO = 4096;

function esperar(ms: number) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

// Location relativo: request.nextUrl pode ter o host normalizado pelo
// servidor (ex.: "localhost"), diferente do domínio que o navegador usou.
function redirecionarParaInicio() {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/", "Cache-Control": "private, no-store, max-age=0" },
  });
}

/**
 * Formulário só é aceito vindo da própria página (CSRF de login).
 *
 * Sec-Fetch-Site vem primeiro: é preenchido pelo próprio navegador (página
 * de outro site não consegue falsificar) e continua correto mesmo quando o
 * navegador manda "Origin: null" — o que acontece em POST de formulário
 * conforme a Referrer-Policy. Sem ele (navegador antigo), compara Origin com
 * o cabeçalho Host, e não com request.nextUrl, pelo mesmo motivo do
 * redirecionamento acima.
 */
function mesmaOrigem(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null) return site === "same-origin";

  const origem = request.headers.get("origin");
  if (origem === null) return true;
  try {
    return new URL(origem).host === (request.headers.get("host") ?? request.nextUrl.host);
  } catch {
    return false; // "null" ou lixo
  }
}

export async function POST(request: NextRequest) {
  if (!mesmaOrigem(request)) {
    return new NextResponse(null, { status: 403 });
  }

  if (!modoManutencaoAtivo()) return redirecionarParaInicio();

  if (Number(request.headers.get("content-length") ?? "0") > TAMANHO_MAXIMO_CORPO) {
    return new NextResponse(null, { status: 413 });
  }

  const formulario = await request.formData().catch(() => null);
  const credenciais = lerCredenciaisManutencao();

  if (!credenciais || !(await senhaManutencaoConfere(credenciais, formulario?.get("senha")))) {
    await esperar(ATRASO_SENHA_ERRADA_MS);
    return respostaPaginaManutencao({ status: 401, erro: true });
  }

  const resposta = redirecionarParaInicio();
  resposta.cookies.set(COOKIE_LIBERACAO_MANUTENCAO, await criarTokenLiberacao(credenciais, Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_LIBERACAO_SEGUNDOS,
  });
  return resposta;
}
