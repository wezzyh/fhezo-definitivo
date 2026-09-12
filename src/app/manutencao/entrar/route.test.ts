import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { COOKIE_LIBERACAO_MANUTENCAO, tokenLiberacaoValido } from "@/lib/manutencao/liberacao";
import { POST } from "./route";

const SENHA = "senha-de-teste-forte-123";
const SEGREDO = "segredo-de-teste-".padEnd(48, "x");

function enviar(
  senha: string,
  opcoes: { origem?: string | null; url?: string; host?: string; secFetchSite?: string } = {},
) {
  const url = opcoes.url ?? "https://loja.test/manutencao/entrar";
  const cabecalhos = new Headers({ "content-type": "application/x-www-form-urlencoded" });
  const origem = opcoes.origem === undefined ? new URL(url).origin : opcoes.origem;
  if (origem !== null) cabecalhos.set("origin", origem);
  if (opcoes.host) cabecalhos.set("host", opcoes.host);
  if (opcoes.secFetchSite) cabecalhos.set("sec-fetch-site", opcoes.secFetchSite);
  return POST(new NextRequest(url, { method: "POST", headers: cabecalhos, body: new URLSearchParams({ senha }) }));
}

function valorDoCookie(setCookie: string) {
  return decodeURIComponent(setCookie.split(";")[0].split("=").slice(1).join("="));
}

beforeEach(() => {
  vi.stubEnv("MAINTENANCE_MODE", "true");
  vi.stubEnv("MAINTENANCE_PASSWORD", SENHA);
  vi.stubEnv("MAINTENANCE_SECRET", SEGREDO);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /manutencao/entrar", () => {
  it("senha correta → cookie HttpOnly/Secure/Lax/7 dias, assinado, sem a senha; redireciona para /", async () => {
    const r = await enviar(SENHA);

    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("/");
    const setCookie = r.headers.get("set-cookie")!;
    expect(setCookie).toContain(`${COOKIE_LIBERACAO_MANUTENCAO}=`);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toMatch(/Max-Age=604800/);
    expect(setCookie).not.toContain(SENHA);
    expect(setCookie).not.toContain(encodeURIComponent(SENHA));
    expect(setCookie).not.toContain(SEGREDO);

    const token = valorDoCookie(setCookie);
    expect(await tokenLiberacaoValido({ senha: SENHA, segredo: SEGREDO }, token, Date.now())).toBe(true);
  });

  it("em produção o cookie é Secure mesmo atrás de proxy HTTP", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const r = await enviar(SENHA, { url: "http://loja.test/manutencao/entrar" });
    expect(r.headers.get("set-cookie")).toMatch(/Secure/i);
  });

  it.each(["senha-errada-qualquer", "", SENHA.toUpperCase(), SENHA + " "])(
    "senha errada %j → 401 com a página de construção, sem cookie",
    async (senha) => {
      const r = await enviar(senha);
      expect(r.status).toBe(401);
      expect(r.headers.get("set-cookie")).toBeNull();
      const html = await r.text();
      expect(html).toContain("Senha incorreta.");
      expect(html).not.toContain(SENHA);
    },
  );

  it("sem MAINTENANCE_PASSWORD/SECRET configurados, nem a senha 'certa' libera", async () => {
    vi.stubEnv("MAINTENANCE_SECRET", "");
    const r = await enviar(SENHA);
    expect(r.status).toBe(401);
    expect(r.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    ["Origin de outro site", { origem: "https://site-malicioso.test" }],
    ["Origin 'null'", { origem: "null" }],
    ["Sec-Fetch-Site cross-site", { secFetchSite: "cross-site" }],
    ["Sec-Fetch-Site same-site (subdomínio)", { secFetchSite: "same-site" }],
    ["Origin ≠ Host", { origem: "https://loja.test", host: "outro.test" }],
  ])("%s → 403, sem cookie (CSRF)", async (_nome, opcoes) => {
    const r = await enviar(SENHA, opcoes);
    expect(r.status).toBe(403);
    expect(r.headers.get("set-cookie")).toBeNull();
  });

  it("navegador real: 'Origin: null' + Sec-Fetch-Site same-origin → aceito", async () => {
    // O que o Chrome manda no POST do formulário quando a página tem
    // Referrer-Policy restritiva — era o 403 no localhost.
    const r = await enviar(SENHA, {
      url: "http://localhost:3000/manutencao/entrar",
      origem: "null",
      host: "localhost:3000",
      secFetchSite: "same-origin",
    });
    expect(r.status).toBe(303);
    expect(r.headers.get("set-cookie")).toContain(COOKIE_LIBERACAO_MANUTENCAO);
  });

  it("a página não usa Referrer-Policy que faz o navegador mandar 'Origin: null'", async () => {
    const r = await enviar("senha-errada-qualquer");
    expect(r.headers.get("referrer-policy")).not.toBe("no-referrer");
  });

  it("Origin igual ao Host real, mesmo com URL interna normalizada pelo servidor → aceito", async () => {
    // Como no `next start`: o navegador usa 127.0.0.1, o servidor enxerga localhost.
    const r = await enviar(SENHA, {
      url: "http://localhost:3107/manutencao/entrar",
      origem: "http://127.0.0.1:3107",
      host: "127.0.0.1:3107",
      secFetchSite: "same-origin",
    });
    expect(r.status).toBe(303);
    expect(r.headers.get("set-cookie")).toContain(COOKIE_LIBERACAO_MANUTENCAO);
  });

  it("MAINTENANCE_MODE=false → só redireciona, sem emitir cookie", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "false");
    const r = await enviar(SENHA);
    expect(r.status).toBe(303);
    expect(r.headers.get("set-cookie")).toBeNull();
  });
});
