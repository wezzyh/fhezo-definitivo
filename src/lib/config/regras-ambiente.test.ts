import { describe, expect, it } from "vitest";
import {
  ErroConfiguracaoAmbiente,
  ambienteDaChaveAsaas,
  lerAmbienteDeploy,
  lerAmbienteIntegracaoValidado,
  validarAmbientesIntegracoes,
  validarChaveAsaasParaAmbiente,
} from "./regras-ambiente";

describe("combinação deploy × integração (APPSEC-028)", () => {
  it("Production + Asaas sandbox → FALHA", () => {
    expect(() =>
      lerAmbienteIntegracaoValidado({ VERCEL_ENV: "production", ASAAS_ENV: "sandbox" }, "ASAAS_ENV"),
    ).toThrow(ErroConfiguracaoAmbiente);
  });

  it("Production + Melhor Envio sandbox → FALHA", () => {
    expect(() =>
      lerAmbienteIntegracaoValidado({ VERCEL_ENV: "production", MELHOR_ENVIO_ENV: "sandbox" }, "MELHOR_ENVIO_ENV"),
    ).toThrow(ErroConfiguracaoAmbiente);
  });

  it("Production + ambos production → OK", () => {
    expect(
      validarAmbientesIntegracoes({ VERCEL_ENV: "production", ASAAS_ENV: "production", MELHOR_ENVIO_ENV: "production" }),
    ).toEqual({ deploy: "production", asaas: "production", melhorEnvio: "production" });
  });

  it("Preview + sandbox → OK", () => {
    expect(
      validarAmbientesIntegracoes({ VERCEL_ENV: "preview", ASAAS_ENV: "sandbox", MELHOR_ENVIO_ENV: "sandbox" }),
    ).toEqual({ deploy: "preview", asaas: "sandbox", melhorEnvio: "sandbox" });
  });

  it("Preview + production → FALHA (credencial real em preview)", () => {
    expect(() =>
      validarAmbientesIntegracoes({ VERCEL_ENV: "preview", ASAAS_ENV: "production", MELHOR_ENVIO_ENV: "sandbox" }),
    ).toThrow(ErroConfiguracaoAmbiente);
  });

  it("Local (sem VERCEL_ENV) + sandbox → OK; + production → FALHA", () => {
    expect(validarAmbientesIntegracoes({ ASAAS_ENV: "sandbox", MELHOR_ENVIO_ENV: "sandbox" }).deploy).toBe("development");
    expect(() => lerAmbienteIntegracaoValidado({ ASAAS_ENV: "production" }, "ASAAS_ENV")).toThrow(
      ErroConfiguracaoAmbiente,
    );
  });

  it.each(["prod", "teste", "PRODUCTION", "Sandbox", " sandbox", "sandbox ", "homologacao"])(
    "ambiente desconhecido %j → FALHA (sem fallback)",
    (valor) => {
      expect(() => lerAmbienteIntegracaoValidado({ ASAAS_ENV: valor }, "ASAAS_ENV")).toThrow(ErroConfiguracaoAmbiente);
    },
  );

  it.each([undefined, ""])("variável ausente (%j) → FALHA", (valor) => {
    expect(() => lerAmbienteIntegracaoValidado({ MELHOR_ENVIO_ENV: valor }, "MELHOR_ENVIO_ENV")).toThrow(
      /não está definida/,
    );
  });

  it("VERCEL_ENV desconhecido → FALHA", () => {
    expect(() => lerAmbienteDeploy({ VERCEL_ENV: "staging" })).toThrow(ErroConfiguracaoAmbiente);
  });

  it("a mensagem de erro nunca repete o valor recebido (evita vazar chave colada no lugar errado)", () => {
    try {
      lerAmbienteIntegracaoValidado({ ASAAS_ENV: "$aact_prod_SEGREDO123" }, "ASAAS_ENV");
      throw new Error("deveria ter falhado");
    } catch (erro) {
      expect((erro as Error).message).not.toContain("SEGREDO123");
    }
  });
});

describe("chave de API do Asaas × ASAAS_ENV", () => {
  it("reconhece o ambiente pelo prefixo da chave", () => {
    expect(ambienteDaChaveAsaas("$aact_prod_abc")).toBe("production");
    expect(ambienteDaChaveAsaas("$aact_hmlg_abc")).toBe("sandbox");
    expect(ambienteDaChaveAsaas("$aact_abc_formato_antigo")).toBeNull();
  });

  it("chave de sandbox com ASAAS_ENV=production → FALHA, sem mostrar a chave", () => {
    expect(() => validarChaveAsaasParaAmbiente("$aact_hmlg_SEGREDO", "production")).toThrow(ErroConfiguracaoAmbiente);
    expect(() => validarChaveAsaasParaAmbiente("$aact_hmlg_SEGREDO", "production")).not.toThrow(/SEGREDO/);
  });

  it("chave de produção com ASAAS_ENV=sandbox → FALHA", () => {
    expect(() => validarChaveAsaasParaAmbiente("$aact_prod_x", "sandbox")).toThrow(ErroConfiguracaoAmbiente);
  });

  it("chave sem prefixo de ambiente → vale só ASAAS_ENV", () => {
    expect(() => validarChaveAsaasParaAmbiente("$aact_formato_antigo", "production")).not.toThrow();
  });

  it("no build, chave de sandbox em Production derruba a validação", () => {
    expect(() =>
      validarAmbientesIntegracoes({
        VERCEL_ENV: "production",
        ASAAS_ENV: "production",
        MELHOR_ENVIO_ENV: "production",
        ASAAS_API_KEY: "$aact_hmlg_x",
      }),
    ).toThrow(ErroConfiguracaoAmbiente);
  });
});
