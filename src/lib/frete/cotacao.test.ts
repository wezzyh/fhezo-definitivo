import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ criarClienteSupabaseAdmin: vi.fn(() => ({})) }));
vi.mock("@/lib/integracoes/melhorenvio", () => ({ obterTokenValidoMelhorEnvio: vi.fn() }));

import { obterTokenValidoMelhorEnvio } from "@/lib/integracoes/melhorenvio";
import { MENSAGEM_FRETE_INDISPONIVEL, cotarFreteMelhorEnvio, lerValorFrete } from "./cotacao";

const ITEM = { id: "p1", larguraCm: 10, alturaCm: 11, comprimentoCm: 12, pesoKg: 1.5, valorUnitario: 20, quantidade: 2 };
const fetchFalso = vi.fn();

function resposta(corpo: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => corpo };
}

beforeEach(() => {
  fetchFalso.mockReset();
  vi.mocked(obterTokenValidoMelhorEnvio).mockClear();
  vi.stubEnv("MELHOR_ENVIO_CEP_ORIGEM", "80000-000");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("MELHOR_ENVIO_ENV", "sandbox");
  vi.stubGlobal("fetch", fetchFalso);
  vi.mocked(obterTokenValidoMelhorEnvio).mockResolvedValue("token");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("lerValorFrete — valor vindo do Melhor Envio (APPSEC-001, requisito 6)", () => {
  it.each([
    ["25.90", 25.9],
    ["0", 0],
    ["100", 100],
    [42.5, 42.5],
  ])("aceita %s", (entrada, esperado) => {
    expect(lerValorFrete(entrada)).toBe(esperado);
  });

  it.each(["-5", -5, "abc", "", "NaN", "Infinity", "1e3", "25,90", Number.NaN, Number.POSITIVE_INFINITY, null, undefined, {}])(
    "recusa %s",
    (entrada) => {
      expect(lerValorFrete(entrada)).toBeNull();
    },
  );
});

describe("cotarFreteMelhorEnvio", () => {
  it("manda para a API exatamente os itens recebidos", async () => {
    fetchFalso.mockResolvedValue(resposta([{ id: 1, name: "PAC", price: "25.90", company: { name: "Correios" } }]));

    await cotarFreteMelhorEnvio("01310-100", [ITEM]);

    const corpo = JSON.parse(fetchFalso.mock.calls[0][1].body as string);
    expect(corpo).toEqual({
      from: { postal_code: "80000000" },
      to: { postal_code: "01310100" },
      products: [{ id: "p1", width: 10, height: 11, length: 12, weight: 1.5, insurance_value: 20, quantity: 2 }],
    });
  });

  it("descarta opções com preço inválido, erro ou id inválido", async () => {
    fetchFalso.mockResolvedValue(
      resposta([
        { id: 1, name: "PAC", price: "25.90", delivery_time: 6, company: { name: "Correios" } },
        { id: 2, name: "Negativo", price: "-3" },
        { id: 3, name: "Texto", price: "abc" },
        { id: 4, name: "Com erro", price: "10", error: "Serviço indisponível" },
        { id: "5", name: "Id texto", price: "10" },
        { id: 6, name: "Sem preço" },
      ]),
    );

    const resultado = await cotarFreteMelhorEnvio("01310-100", [ITEM]);

    expect(resultado).toEqual({
      sucesso: true,
      opcoes: [{ id: 1, nome: "PAC", transportadora: "Correios", prazoDias: 6, valor: 25.9 }],
    });
  });

  it("falha quando nenhuma opção é válida", async () => {
    fetchFalso.mockResolvedValue(resposta([{ id: 2, price: "-3" }]));
    expect((await cotarFreteMelhorEnvio("01310-100", [ITEM])).sucesso).toBe(false);
  });

  it.each([
    ["resposta HTTP de erro", () => fetchFalso.mockResolvedValue(resposta({}, false))],
    ["resposta que não é lista", () => fetchFalso.mockResolvedValue(resposta({ message: "Unauthenticated" }))],
    ["falha de rede", () => fetchFalso.mockRejectedValue(new Error("ECONNRESET"))],
  ])("falha fechado com %s", async (_nome, preparar) => {
    preparar();
    expect(await cotarFreteMelhorEnvio("01310-100", [ITEM])).toEqual({
      sucesso: false,
      mensagem: MENSAGEM_FRETE_INDISPONIVEL,
    });
  });

  it("falha sem chamar a API quando a integração não tem token", async () => {
    vi.mocked(obterTokenValidoMelhorEnvio).mockResolvedValue(null);
    expect((await cotarFreteMelhorEnvio("01310-100", [ITEM])).sucesso).toBe(false);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("local/preview com MELHOR_ENVIO_ENV=sandbox → cota na API de sandbox", async () => {
    fetchFalso.mockResolvedValue(resposta([{ id: 1, name: "PAC", price: "25.90" }]));

    await cotarFreteMelhorEnvio("01310-100", [ITEM]);

    expect(fetchFalso.mock.calls[0][0]).toBe("https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate");
  });

  it("Production + MELHOR_ENVIO_ENV=production → cota na API de produção (APPSEC-028)", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("MELHOR_ENVIO_ENV", "production");
    fetchFalso.mockResolvedValue(resposta([{ id: 1, name: "PAC", price: "25.90" }]));

    await cotarFreteMelhorEnvio("01310-100", [ITEM]);

    expect(fetchFalso.mock.calls[0][0]).toBe("https://melhorenvio.com.br/api/v2/me/shipment/calculate");
  });

  it.each([
    ["Production + MELHOR_ENVIO_ENV=sandbox", "production", "sandbox"],
    ["MELHOR_ENVIO_ENV ausente", "production", ""],
    ["MELHOR_ENVIO_ENV inválido", "preview", "teste"],
  ])("%s → não cota e nem busca token (APPSEC-028)", async (_nome, vercel, melhorEnvio) => {
    vi.stubEnv("VERCEL_ENV", vercel);
    vi.stubEnv("MELHOR_ENVIO_ENV", melhorEnvio);
    const erroConsole = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await cotarFreteMelhorEnvio("01310-100", [ITEM])).toEqual({
      sucesso: false,
      mensagem: MENSAGEM_FRETE_INDISPONIVEL,
    });
    expect(fetchFalso).not.toHaveBeenCalled();
    expect(obterTokenValidoMelhorEnvio).not.toHaveBeenCalled();
    erroConsole.mockRestore();
  });
});
