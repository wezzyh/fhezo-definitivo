import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { obterConfigAsaas, obterConfigMelhorEnvio, obterCredenciaisOAuthMelhorEnvio } from "./integracoes";
import { ErroConfiguracaoAmbiente } from "./regras-ambiente";

describe("obterConfigAsaas (APPSEC-028)", () => {
  it("Production + ASAAS_ENV=production → API de produção", () => {
    const config = obterConfigAsaas({ VERCEL_ENV: "production", ASAAS_ENV: "production", ASAAS_API_KEY: "$aact_prod_x" });
    expect(config).toEqual({ ambiente: "production", urlApi: "https://api.asaas.com/v3", chaveApi: "$aact_prod_x" });
    expect(config.urlApi).not.toContain("sandbox");
  });

  it("Preview + ASAAS_ENV=sandbox → API de sandbox", () => {
    expect(obterConfigAsaas({ VERCEL_ENV: "preview", ASAAS_ENV: "sandbox", ASAAS_API_KEY: "k" }).urlApi).toBe(
      "https://api-sandbox.asaas.com/v3",
    );
  });

  it("Production + ASAAS_ENV=sandbox → FALHA", () => {
    expect(() => obterConfigAsaas({ VERCEL_ENV: "production", ASAAS_ENV: "sandbox", ASAAS_API_KEY: "k" })).toThrow(
      ErroConfiguracaoAmbiente,
    );
  });

  it("chave ausente → FALHA", () => {
    expect(() => obterConfigAsaas({ VERCEL_ENV: "production", ASAAS_ENV: "production" })).toThrow(/ASAAS_API_KEY/);
  });

  it("chave de sandbox ($aact_hmlg_) em Production → FALHA", () => {
    expect(() =>
      obterConfigAsaas({ VERCEL_ENV: "production", ASAAS_ENV: "production", ASAAS_API_KEY: "$aact_hmlg_x" }),
    ).toThrow(ErroConfiguracaoAmbiente);
  });
});

describe("obterConfigMelhorEnvio (APPSEC-028)", () => {
  it("Production + MELHOR_ENVIO_ENV=production → API e OAuth de produção, nunca sandbox", () => {
    const config = obterConfigMelhorEnvio({ VERCEL_ENV: "production", MELHOR_ENVIO_ENV: "production" });
    expect(config).toEqual({
      ambiente: "production",
      urlApi: "https://melhorenvio.com.br/api/v2",
      urlAutorizacao: "https://melhorenvio.com.br/oauth/authorize",
      urlToken: "https://melhorenvio.com.br/oauth/token",
    });
    expect(JSON.stringify(config)).not.toContain("sandbox");
  });

  it("sandbox → API e OAuth de sandbox (nunca misturados)", () => {
    const config = obterConfigMelhorEnvio({ VERCEL_ENV: "preview", MELHOR_ENVIO_ENV: "sandbox" });
    expect(config.urlApi.startsWith("https://sandbox.melhorenvio.com.br/")).toBe(true);
    expect(config.urlAutorizacao.startsWith("https://sandbox.melhorenvio.com.br/")).toBe(true);
    expect(config.urlToken.startsWith("https://sandbox.melhorenvio.com.br/")).toBe(true);
  });

  it("Production + MELHOR_ENVIO_ENV=sandbox → FALHA", () => {
    expect(() => obterConfigMelhorEnvio({ VERCEL_ENV: "production", MELHOR_ENVIO_ENV: "sandbox" })).toThrow(
      ErroConfiguracaoAmbiente,
    );
  });

  it("credenciais OAuth ausentes → FALHA", () => {
    expect(() => obterCredenciaisOAuthMelhorEnvio({ MELHOR_ENVIO_CLIENT_ID: "id" })).toThrow(ErroConfiguracaoAmbiente);
  });
});
