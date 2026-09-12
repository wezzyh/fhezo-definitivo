import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));

import { montarUrlAutorizacaoMelhorEnvio, obterTokenValidoMelhorEnvio, salvarTokensMelhorEnvio } from "./melhorenvio";

const fetchFalso = vi.fn();

/** Dublê de "integracoes": responde a leitura com a linha dada e guarda o upsert. */
function bancoComIntegracao(linha: Record<string, unknown> | null) {
  const upserts: unknown[] = [];
  const cliente = {
    from: () => ({
      select: () => ({ eq: () => ({ limit: () => ({ returns: async () => ({ data: linha ? [linha] : [] }) }) }) }),
      upsert: async (valores: unknown) => {
        upserts.push(valores);
        return { error: null };
      },
    }),
  } as unknown as SupabaseClient;
  return { cliente, upserts };
}

const DAQUI_A_UMA_HORA = () => new Date(Date.now() + 3_600_000).toISOString();

beforeEach(() => {
  fetchFalso.mockReset();
  vi.stubGlobal("fetch", fetchFalso);
  vi.stubEnv("MELHOR_ENVIO_CLIENT_ID", "id");
  vi.stubEnv("MELHOR_ENVIO_CLIENT_SECRET", "segredo");
  vi.stubEnv("MELHOR_ENVIO_REDIRECT_URI", "https://loja.exemplo/admin/integracao/melhorenvio/callback");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function deploy(vercel: string, melhorEnvio: string) {
  vi.stubEnv("VERCEL_ENV", vercel);
  vi.stubEnv("MELHOR_ENVIO_ENV", melhorEnvio);
}

describe("token do Melhor Envio × ambiente (APPSEC-028)", () => {
  it("token de SANDBOX em Production → não é usado", async () => {
    deploy("production", "production");
    const { cliente } = bancoComIntegracao({ access_token: "tok", refresh_token: "ref", expira_em: DAQUI_A_UMA_HORA(), ambiente: "sandbox" });

    expect(await obterTokenValidoMelhorEnvio(cliente)).toBeNull();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("token de PRODUÇÃO em Production → usado", async () => {
    deploy("production", "production");
    const { cliente } = bancoComIntegracao({ access_token: "tok", refresh_token: "ref", expira_em: DAQUI_A_UMA_HORA(), ambiente: "production" });

    expect(await obterTokenValidoMelhorEnvio(cliente)).toBe("tok");
  });

  it("token sem ambiente registrado (anterior à migração 0031) → não é usado", async () => {
    deploy("preview", "sandbox");
    const { cliente } = bancoComIntegracao({ access_token: "tok", refresh_token: "ref", expira_em: DAQUI_A_UMA_HORA(), ambiente: null });

    expect(await obterTokenValidoMelhorEnvio(cliente)).toBeNull();
  });

  it("configuração inválida → nenhum token, sem consultar o banco", async () => {
    deploy("production", "sandbox");
    const { cliente } = bancoComIntegracao({ access_token: "tok", ambiente: "sandbox" });
    const espiao = vi.spyOn(cliente, "from");

    expect(await obterTokenValidoMelhorEnvio(cliente)).toBeNull();
    expect(espiao).not.toHaveBeenCalled();
  });

  it("renovação em Production usa o servidor OAuth de produção e salva o ambiente", async () => {
    deploy("production", "production");
    const { cliente, upserts } = bancoComIntegracao({
      access_token: "velho",
      refresh_token: "ref",
      expira_em: new Date(Date.now() - 1000).toISOString(),
      ambiente: "production",
    });
    fetchFalso.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "novo", refresh_token: "ref2", expires_in: 3600 }),
    });

    expect(await obterTokenValidoMelhorEnvio(cliente)).toBe("novo");
    expect(fetchFalso.mock.calls[0][0]).toBe("https://melhorenvio.com.br/oauth/token");
    expect(upserts[0]).toEqual(expect.objectContaining({ access_token: "novo", ambiente: "production" }));
  });

  it("salvarTokens grava o ambiente que emitiu o token", async () => {
    const { cliente, upserts } = bancoComIntegracao(null);

    await salvarTokensMelhorEnvio(cliente, { access_token: "a", refresh_token: "r", expires_in: 60, ambiente: "sandbox" });

    expect(upserts[0]).toEqual(expect.objectContaining({ provedor: "melhor_envio", ambiente: "sandbox" }));
  });

  it("URL de autorização em Production aponta para o OAuth de produção", () => {
    deploy("production", "production");
    expect(montarUrlAutorizacaoMelhorEnvio().startsWith("https://melhorenvio.com.br/oauth/authorize?")).toBe(true);
  });

  it("URL de autorização com configuração inválida → FALHA", () => {
    deploy("production", "sandbox");
    expect(() => montarUrlAutorizacaoMelhorEnvio()).toThrow();
  });
});
