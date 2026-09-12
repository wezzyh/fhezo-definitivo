import { NextResponse } from "next/server";

// Página "Site em construção", servida direto pelo proxy (e pela rota de
// liberação, quando a senha está errada). HTML autocontido — CSS inline,
// nenhum script, nenhuma imagem, nenhum asset externo — para não depender
// de nada que o próprio modo construção bloqueia, nem do banco. Nenhum
// dado da requisição é ecoado no HTML.

export const CAMINHO_LIBERACAO_MANUTENCAO = "/manutencao/entrar";

const CABECALHOS_PAGINA = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  // Não usar "no-referrer": com ela o navegador manda "Origin: null" no POST
  // do formulário e a rota de liberação o recusaria como outro site.
  "Referrer-Policy": "same-origin",
};

function html(erro: boolean): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Loja Fhezo — Site em construção</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:#f4f4f2;color:#18181b;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{width:100%;max-width:360px;text-align:center}
h1{margin:0;font-size:28px;letter-spacing:.02em}
p.status{margin:8px 0 40px;color:#52525b;font-size:16px}
form{display:flex;flex-direction:column;gap:8px;text-align:left}
label{font-size:12px;color:#71717a}
input{width:100%;padding:10px 12px;border:1px solid #d4d4d8;border-radius:6px;font:inherit;background:#fff}
button{padding:10px 12px;border:0;border-radius:6px;background:#18181b;color:#fff;font:inherit;cursor:pointer}
p.erro{margin:0;color:#b91c1c;font-size:13px}
</style>
</head>
<body>
<main>
<h1>Loja Fhezo</h1>
<p class="status">Site em construção</p>
<form method="post" action="${CAMINHO_LIBERACAO_MANUTENCAO}">
<label for="senha">Acesso da equipe</label>
<input id="senha" name="senha" type="password" autocomplete="current-password" required maxlength="1024">
${erro ? '<p class="erro" role="alert">Senha incorreta.</p>' : ""}
<button type="submit">Entrar</button>
</form>
</main>
</body>
</html>`;
}

export function respostaPaginaManutencao(opcoes: { status?: number; erro?: boolean } = {}): NextResponse {
  const status = opcoes.status ?? 503;
  return new NextResponse(html(opcoes.erro ?? false), {
    status,
    headers: status === 503 ? { ...CABECALHOS_PAGINA, "Retry-After": "3600" } : CABECALHOS_PAGINA,
  });
}

/** Para chamadas que não são navegação (Server Action, POST, fetch): sem HTML. */
export function respostaBloqueioManutencao(): NextResponse {
  return new NextResponse("Site em construção.", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      "Retry-After": "3600",
    },
  });
}
