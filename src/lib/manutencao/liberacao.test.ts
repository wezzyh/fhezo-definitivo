import { describe, expect, it } from "vitest";
import {
  DURACAO_LIBERACAO_SEGUNDOS,
  criarTokenLiberacao,
  senhaManutencaoConfere,
  tokenLiberacaoValido,
} from "./liberacao";

const CRED = { senha: "senha-de-teste-forte-123", segredo: "segredo-de-teste-".padEnd(48, "x") };
const AGORA = Date.UTC(2026, 8, 12, 12, 0, 0);

function trocarUltimoCaractere(texto: string) {
  return texto.slice(0, -1) + (texto.endsWith("A") ? "B" : "A");
}

describe("cookie de liberação — assinado no servidor", () => {
  it("token recém-criado é válido e NÃO contém a senha nem o segredo", async () => {
    const token = await criarTokenLiberacao(CRED, AGORA);
    expect(await tokenLiberacaoValido(CRED, token, AGORA)).toBe(true);
    expect(token).not.toContain(CRED.senha);
    expect(token).not.toContain(CRED.segredo);
    expect(token).toMatch(/^v1\.\d+\.[A-Za-z0-9_-]{43}$/);
  });

  it("vale até 7 dias; depois disso, recusado", async () => {
    const token = await criarTokenLiberacao(CRED, AGORA);
    expect(await tokenLiberacaoValido(CRED, token, AGORA + (DURACAO_LIBERACAO_SEGUNDOS - 1) * 1000)).toBe(true);
    expect(await tokenLiberacaoValido(CRED, token, AGORA + DURACAO_LIBERACAO_SEGUNDOS * 1000)).toBe(false);
  });

  it("assinatura adulterada → recusado", async () => {
    const token = await criarTokenLiberacao(CRED, AGORA);
    expect(await tokenLiberacaoValido(CRED, trocarUltimoCaractere(token), AGORA)).toBe(false);
  });

  it("expiração estendida à mão (assinatura antiga) → recusado", async () => {
    const [versao, expira, assinatura] = (await criarTokenLiberacao(CRED, AGORA)).split(".");
    const estendido = `${versao}.${Number(expira) + 60}.${assinatura}`;
    expect(await tokenLiberacaoValido(CRED, estendido, AGORA)).toBe(false);
  });

  it("token assinado com expiração além de 7 dias → recusado mesmo com assinatura certa", async () => {
    const doFuturo = await criarTokenLiberacao(CRED, AGORA + 30 * 24 * 3600 * 1000);
    expect(await tokenLiberacaoValido(CRED, doFuturo, AGORA)).toBe(false);
  });

  it("trocar MAINTENANCE_SECRET ou MAINTENANCE_PASSWORD revoga os cookies emitidos", async () => {
    const token = await criarTokenLiberacao(CRED, AGORA);
    expect(await tokenLiberacaoValido({ ...CRED, segredo: CRED.segredo + "novo" }, token, AGORA)).toBe(false);
    expect(await tokenLiberacaoValido({ ...CRED, senha: CRED.senha + "nova" }, token, AGORA)).toBe(false);
  });

  it.each([
    undefined,
    "",
    "true",
    "1",
    "liberado",
    "v1",
    "v1.999999999999.",
    "v2.1790000000.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "v1.abc.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "v1.1790000000.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "v1.1790000000.curta",
    "x".repeat(5000),
  ])("cookie ausente/forjado %j → recusado", async (token) => {
    expect(await tokenLiberacaoValido(CRED, token, AGORA)).toBe(false);
  });

  it("sem credenciais configuradas, nenhum token vale (falha fechado)", async () => {
    const token = await criarTokenLiberacao(CRED, AGORA);
    expect(await tokenLiberacaoValido(null, token, AGORA)).toBe(false);
  });
});

describe("conferência da senha", () => {
  it("senha correta → true", async () => {
    expect(await senhaManutencaoConfere(CRED, CRED.senha)).toBe(true);
  });

  it.each([
    ["errada", "outra-senha-qualquer"],
    ["prefixo", CRED.senha.slice(0, -1)],
    ["com espaço", CRED.senha + " "],
    ["maiúsculas", CRED.senha.toUpperCase()],
    ["vazia", ""],
    ["gigante", "a".repeat(5000)],
    ["não-string", 123],
    ["null", null],
  ])("senha %s → false", async (_nome, senha) => {
    expect(await senhaManutencaoConfere(CRED, senha)).toBe(false);
  });

  it("sem credenciais configuradas, nenhuma senha passa", async () => {
    expect(await senhaManutencaoConfere(null, CRED.senha)).toBe(false);
  });
});
