import { describe, expect, it } from "vitest";
import {
  checkoutHabilitado,
  lerCredenciaisManutencao,
  modoManutencaoAtivo,
  validarConfigLancamento,
} from "./lancamento";
import { ErroConfiguracaoAmbiente } from "./regras-ambiente";

const SENHA = "senha-de-teste-forte-123";
const SEGREDO = "segredo-de-teste-".padEnd(48, "x");

describe("MAINTENANCE_MODE — fail closed", () => {
  it('só "false" exato desliga a manutenção', () => {
    expect(modoManutencaoAtivo({ MAINTENANCE_MODE: "false" })).toBe(false);
    expect(modoManutencaoAtivo({ MAINTENANCE_MODE: "true" })).toBe(true);
  });

  it.each([undefined, "", "False", "FALSE", "0", "no", "off", " false", "false "])(
    "valor %j → manutenção LIGADA (nunca abre a loja por engano)",
    (valor) => {
      expect(modoManutencaoAtivo({ MAINTENANCE_MODE: valor })).toBe(true);
    },
  );
});

describe("CHECKOUT_ENABLED — fail closed", () => {
  it('só "true" exato abre o checkout', () => {
    expect(checkoutHabilitado({ CHECKOUT_ENABLED: "true" })).toBe(true);
    expect(checkoutHabilitado({ CHECKOUT_ENABLED: "false" })).toBe(false);
  });

  it.each([undefined, "", "True", "TRUE", "1", "yes", "on", " true", "true "])(
    "valor %j → checkout FECHADO",
    (valor) => {
      expect(checkoutHabilitado({ CHECKOUT_ENABLED: valor })).toBe(false);
    },
  );
});

describe("credenciais do modo manutenção", () => {
  it("senha e segredo válidos", () => {
    expect(lerCredenciaisManutencao({ MAINTENANCE_PASSWORD: SENHA, MAINTENANCE_SECRET: SEGREDO })).toEqual({
      senha: SENHA,
      segredo: SEGREDO,
    });
  });

  it.each([
    ["senha ausente", { MAINTENANCE_SECRET: SEGREDO }],
    ["segredo ausente", { MAINTENANCE_PASSWORD: SENHA }],
    ["senha curta", { MAINTENANCE_PASSWORD: "curta", MAINTENANCE_SECRET: SEGREDO }],
    ["segredo curto", { MAINTENANCE_PASSWORD: SENHA, MAINTENANCE_SECRET: "curto" }],
    ["senha igual ao segredo", { MAINTENANCE_PASSWORD: SEGREDO, MAINTENANCE_SECRET: SEGREDO }],
  ])("%s → null (ninguém se libera)", (_nome, env) => {
    expect(lerCredenciaisManutencao(env)).toBeNull();
  });
});

describe("validarConfigLancamento (build de Production)", () => {
  it("lançamento: manutenção off + checkout on → OK sem senha", () => {
    expect(validarConfigLancamento({ MAINTENANCE_MODE: "false", CHECKOUT_ENABLED: "true" })).toEqual({
      manutencao: false,
      checkout: true,
    });
  });

  it("construção: manutenção on + checkout off + credenciais → OK", () => {
    expect(
      validarConfigLancamento({
        MAINTENANCE_MODE: "true",
        CHECKOUT_ENABLED: "false",
        MAINTENANCE_PASSWORD: SENHA,
        MAINTENANCE_SECRET: SEGREDO,
      }),
    ).toEqual({ manutencao: true, checkout: false });
  });

  it.each([
    ["MAINTENANCE_MODE ausente", { CHECKOUT_ENABLED: "false" }],
    ["CHECKOUT_ENABLED ausente", { MAINTENANCE_MODE: "false" }],
    ["MAINTENANCE_MODE inválido", { MAINTENANCE_MODE: "True", CHECKOUT_ENABLED: "false" }],
    ["CHECKOUT_ENABLED inválido", { MAINTENANCE_MODE: "false", CHECKOUT_ENABLED: "1" }],
    ["manutenção on sem credenciais", { MAINTENANCE_MODE: "true", CHECKOUT_ENABLED: "false" }],
  ])("%s → FALHA", (_nome, env) => {
    expect(() => validarConfigLancamento(env)).toThrow(ErroConfiguracaoAmbiente);
  });

  it("a mensagem de erro nunca repete senha, segredo ou valor recebido", () => {
    const erros: string[] = [];
    for (const env of [
      { MAINTENANCE_MODE: "SEGREDO-VAZADO", CHECKOUT_ENABLED: "false" },
      { MAINTENANCE_MODE: "true", CHECKOUT_ENABLED: "false", MAINTENANCE_PASSWORD: "SEGREDO-VAZADO", MAINTENANCE_SECRET: "x" },
    ]) {
      try {
        validarConfigLancamento(env);
      } catch (erro) {
        erros.push((erro as Error).message);
      }
    }
    expect(erros).toHaveLength(2);
    for (const mensagem of erros) expect(mensagem).not.toContain("SEGREDO-VAZADO");
  });
});
