// Modo construção de ponta a ponta pelo proxy real (src/proxy.ts): portão
// de manutenção + trava de admin que já existia. Só o Supabase é dublê.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseFalso = vi.hoisted(() => ({
  usuario: null as null | { id: string },
  ehAdmin: false,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: supabaseFalso.usuario } }) },
    rpc: async () => ({ data: supabaseFalso.ehAdmin, error: null }),
  }),
}));

import { NextRequest } from "next/server";
import { COOKIE_LIBERACAO_MANUTENCAO, criarTokenLiberacao } from "@/lib/manutencao/liberacao";
import { proxy, config } from "./proxy";

const SENHA = "senha-de-teste-forte-123";
const SEGREDO = "segredo-de-teste-".padEnd(48, "x");
const ORIGEM = "https://loja.test";

function requisicao(
  caminho: string,
  opcoes: { metodo?: string; cookie?: string; cabecalhos?: Record<string, string> } = {},
) {
  const cabecalhos = new Headers(opcoes.cabecalhos);
  if (opcoes.cookie) cabecalhos.set("cookie", opcoes.cookie);
  return new NextRequest(ORIGEM + caminho, { method: opcoes.metodo ?? "GET", headers: cabecalhos });
}

async function cookieValido() {
  return `${COOKIE_LIBERACAO_MANUTENCAO}=${await criarTokenLiberacao({ senha: SENHA, segredo: SEGREDO }, Date.now())}`;
}

const seguiu = (r: Response) => r.headers.get("x-middleware-next") === "1";
const bloqueado = (r: Response) => r.status === 503 && !seguiu(r);

beforeEach(() => {
  supabaseFalso.usuario = null;
  supabaseFalso.ehAdmin = false;
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://projeto.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("MAINTENANCE_MODE", "true");
  vi.stubEnv("CHECKOUT_ENABLED", "false");
  vi.stubEnv("MAINTENANCE_PASSWORD", SENHA);
  vi.stubEnv("MAINTENANCE_SECRET", SEGREDO);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("modo construção — visitante comum (sem cookie)", () => {
  it.each([
    "/",
    "/produtos",
    "/produtos/11111111-1111-4111-8111-111111111111",
    "/carrinho",
    "/checkout",
    "/checkout/identificacao",
    "/checkout/pagamento",
    "/checkout/confirmacao?pedido=x",
    "/conta",
    "/login",
    "/cadastro",
    "/auth/confirm?token_hash=x&type=email",
    "/qualquer/url/digitada",
    "/admin",
    "/admin/login",
    "/admin/produtos",
    "/_next/image?url=%2Fx.png&w=64&q=75",
    "/api/qualquer-outra",
  ])("GET %s → página 'Site em construção'", async (caminho) => {
    const r = await proxy(requisicao(caminho));
    expect(bloqueado(r)).toBe(true);
    expect(r.headers.get("cache-control")).toContain("no-store");
    expect(r.headers.get("x-robots-tag")).toContain("noindex");
    const html = await r.text();
    expect(html).toContain("Loja Fhezo");
    expect(html).toContain("Site em construção");
    expect(html).not.toContain(SENHA);
    expect(html).not.toContain(SEGREDO);
  });

  it("Server Action chamada direto (POST + Next-Action) em qualquer caminho → bloqueada", async () => {
    for (const caminho of ["/", "/checkout/pagamento", "/cadastro", "/admin/login", "/api/webhooks/asaas", "/manutencao/entrar"]) {
      const r = await proxy(
        requisicao(caminho, { metodo: "POST", cabecalhos: { "next-action": "7f00deadbeef", "content-type": "text/plain" } }),
      );
      expect(bloqueado(r), caminho).toBe(true);
      expect(r.headers.get("content-type")).toContain("text/plain");
    }
  });

  it.each([
    ["query string", "/?manutencao=false&liberado=1&senha=" + SENHA, {}],
    ["cabeçalho inventado", "/", { "x-maintenance-bypass": "1", "x-liberado": "true" }],
    ["x-middleware-subrequest", "/", { "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy" }],
    ["cookie com nome certo e valor 'true'", "/", { cookie: `${COOKIE_LIBERACAO_MANUTENCAO}=true` }],
    ["cookie com a senha em claro", "/", { cookie: `${COOKIE_LIBERACAO_MANUTENCAO}=${SENHA}` }],
  ])("tentativa de bypass por %s → bloqueada", async (_nome, caminho, cabecalhos) => {
    expect(bloqueado(await proxy(requisicao(caminho, { cabecalhos })))).toBe(true);
  });

  it("cookie adulterado → bloqueado", async () => {
    const valido = await cookieValido();
    const adulterado = valido.slice(0, -1) + (valido.endsWith("A") ? "B" : "A");
    expect(bloqueado(await proxy(requisicao("/", { cookie: adulterado })))).toBe(true);
  });

  it("cookie assinado com outro segredo → bloqueado", async () => {
    const outro = `${COOKIE_LIBERACAO_MANUTENCAO}=${await criarTokenLiberacao({ senha: SENHA, segredo: "z".repeat(48) }, Date.now())}`;
    expect(bloqueado(await proxy(requisicao("/", { cookie: outro })))).toBe(true);
  });

  it("caminhos parecidos com as exceções não pegam carona", async () => {
    for (const [caminho, metodo] of [
      ["/api/webhooks/asaas", "GET"],
      ["/api/webhooks/asaas/extra", "POST"],
      ["/api/webhooks/asaasx", "POST"],
      ["/api/webhooks", "POST"],
      ["/api/webhooks/asaas/../../../checkout", "POST"],
      ["/admin/integracao/melhorenvio/callback", "POST"],
      ["/admin/integracao/melhorenvio/callback/x", "GET"],
      ["/admin/integracao", "GET"],
      ["/manutencao/entrar", "GET"],
      ["/_next/static/../../checkout", "GET"],
    ] as const) {
      expect(bloqueado(await proxy(requisicao(caminho, { metodo }))), `${metodo} ${caminho}`).toBe(true);
    }
  });

  it("MAINTENANCE_MODE ausente ou inválido → continua bloqueado (fail closed)", async () => {
    for (const valor of ["", "False", "0", "off"]) {
      vi.stubEnv("MAINTENANCE_MODE", valor);
      expect(bloqueado(await proxy(requisicao("/"))), JSON.stringify(valor)).toBe(true);
    }
    delete process.env.MAINTENANCE_MODE;
    expect(bloqueado(await proxy(requisicao("/")))).toBe(true);
  });

  it("sem MAINTENANCE_SECRET configurado, nem um cookie antes válido libera", async () => {
    const cookie = await cookieValido();
    vi.stubEnv("MAINTENANCE_SECRET", "");
    expect(bloqueado(await proxy(requisicao("/", { cookie })))).toBe(true);
  });
});

describe("modo construção — rotas técnicas liberadas", () => {
  it("webhook do Asaas (POST) passa pelo portão — a autenticação continua sendo o token da rota", async () => {
    const r = await proxy(requisicao("/api/webhooks/asaas", { metodo: "POST", cabecalhos: { "content-type": "application/json" } }));
    expect(seguiu(r)).toBe(true);
  });

  it("callbacks OAuth passam pelo portão, mas continuam exigindo sessão de admin", async () => {
    for (const caminho of ["/admin/integracao/melhorenvio/callback?code=abc", "/admin/integracao/bling/callback?code=abc"]) {
      const semLogin = await proxy(requisicao(caminho));
      expect(semLogin.status, caminho).toBe(307);
      expect(new URL(semLogin.headers.get("location")!).pathname).toBe("/admin/login");

      supabaseFalso.usuario = { id: "cliente-comum" };
      const naoAdmin = await proxy(requisicao(caminho));
      expect(new URL(naoAdmin.headers.get("location")!).pathname).toBe("/");

      supabaseFalso.ehAdmin = true;
      supabaseFalso.usuario = { id: "admin" };
      expect(seguiu(await proxy(requisicao(caminho)))).toBe(true);
      supabaseFalso.usuario = null;
      supabaseFalso.ehAdmin = false;
    }
  });

  it("POST do formulário de senha passa pelo portão", async () => {
    expect(seguiu(await proxy(requisicao("/manutencao/entrar", { metodo: "POST" })))).toBe(true);
  });

  it("arquivos de build do Next passam (e o matcher nem chama o proxy para eles)", async () => {
    expect(seguiu(await proxy(requisicao("/_next/static/chunks/app.js")))).toBe(true);
    const matcher = new RegExp("^" + config.matcher[0] + "$");
    expect(matcher.test("/_next/static/chunks/app.js")).toBe(false);
    expect(matcher.test("/favicon.ico")).toBe(false);
    for (const caminho of ["/", "/checkout", "/admin", "/api/webhooks/asaas", "/_next/image", "/favicon.ico.html", "/produtos/x"]) {
      expect(matcher.test(caminho), caminho).toBe(true);
    }
  });
});

describe("modo construção — navegador liberado pela senha", () => {
  it.each(["/", "/produtos", "/produtos/abc", "/conta", "/login"])("GET %s → segue para o site real", async (caminho) => {
    expect(seguiu(await proxy(requisicao(caminho, { cookie: await cookieValido() })))).toBe(true);
  });

  it("checkout segue, mantendo a CSP própria do checkout", async () => {
    const r = await proxy(requisicao("/checkout/pagamento", { cookie: await cookieValido() }));
    expect(seguiu(r)).toBe(true);
    expect(r.headers.get("content-security-policy")).toContain("nonce-");
  });

  it("Server Action com cookie válido segue (a própria action ainda aplica suas travas)", async () => {
    const r = await proxy(
      requisicao("/checkout/pagamento", { metodo: "POST", cookie: await cookieValido(), cabecalhos: { "next-action": "abc" } }),
    );
    expect(seguiu(r)).toBe(true);
  });

  it("senha de manutenção NÃO substitui o login de admin", async () => {
    const cookie = await cookieValido();

    const semLogin = await proxy(requisicao("/admin/produtos", { cookie }));
    expect(semLogin.status).toBe(307);
    expect(new URL(semLogin.headers.get("location")!).pathname).toBe("/admin/login");

    expect(seguiu(await proxy(requisicao("/admin/login", { cookie })))).toBe(true);

    supabaseFalso.usuario = { id: "cliente-comum" };
    const naoAdmin = await proxy(requisicao("/admin/produtos", { cookie }));
    expect(new URL(naoAdmin.headers.get("location")!).pathname).toBe("/");

    supabaseFalso.usuario = { id: "admin" };
    supabaseFalso.ehAdmin = true;
    expect(seguiu(await proxy(requisicao("/admin/produtos", { cookie })))).toBe(true);
  });
});

describe("loja lançada (MAINTENANCE_MODE=false)", () => {
  beforeEach(() => {
    vi.stubEnv("MAINTENANCE_MODE", "false");
  });

  it.each(["/", "/produtos/abc", "/checkout", "/qualquer"])("GET %s → segue normalmente, sem cookie", async (caminho) => {
    expect(seguiu(await proxy(requisicao(caminho)))).toBe(true);
  });

  it("/admin continua exigindo login de admin", async () => {
    const r = await proxy(requisicao("/admin"));
    expect(r.status).toBe(307);
    expect(new URL(r.headers.get("location")!).pathname).toBe("/admin/login");
  });

  it("não precisa de senha/segredo configurados", async () => {
    vi.stubEnv("MAINTENANCE_PASSWORD", "");
    vi.stubEnv("MAINTENANCE_SECRET", "");
    expect(seguiu(await proxy(requisicao("/")))).toBe(true);
  });
});
