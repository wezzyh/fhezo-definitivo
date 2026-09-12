import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { consultarCobrancaAsaas, criarCobrancaAsaas } from "./asaas";

const fetchFalso = vi.fn();

function resposta(corpo: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo };
}

beforeEach(() => {
  fetchFalso.mockReset();
  vi.stubGlobal("fetch", fetchFalso);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function ambiente(
  vercel: string,
  asaas: string | undefined,
  chave = "$aact_prod_x",
) {
  vi.stubEnv("VERCEL_ENV", vercel);
  vi.stubEnv("ASAAS_ENV", asaas ?? "");
  vi.stubEnv("ASAAS_API_KEY", chave);
}

describe("cliente Asaas usa a configuração central (APPSEC-028)", () => {
  it("Production + production → chama api.asaas.com com a chave configurada", async () => {
    ambiente("production", "production");
    fetchFalso.mockResolvedValue(resposta({ id: "pay_1", status: "PENDING" }));

    const resultado = await consultarCobrancaAsaas("pay_1");

    expect(resultado).toEqual({
      sucesso: true,
      dados: { id: "pay_1", status: "PENDING" },
    });
    expect(fetchFalso.mock.calls[0][0]).toBe(
      "https://api.asaas.com/v3/payments/pay_1",
    );
    expect(fetchFalso.mock.calls[0][1].headers.access_token).toBe(
      "$aact_prod_x",
    );
  });

  it("Preview + sandbox → chama api-sandbox.asaas.com", async () => {
    ambiente("preview", "sandbox", "$aact_hmlg_x");
    fetchFalso.mockResolvedValue(resposta({ id: "pay_1", status: "PENDING" }));

    await consultarCobrancaAsaas("pay_1");

    expect(fetchFalso.mock.calls[0][0]).toBe(
      "https://api-sandbox.asaas.com/v3/payments/pay_1",
    );
  });

  it.each([
    ["Production + ASAAS_ENV=sandbox", "production", "sandbox", "$aact_prod_x"],
    ["Production + ASAAS_ENV ausente", "production", undefined, "$aact_prod_x"],
    ["Production + ASAAS_ENV inválido", "production", "prod", "$aact_prod_x"],
    [
      "Production + chave de sandbox",
      "production",
      "production",
      "$aact_hmlg_x",
    ],
  ])(
    "%s → nenhuma chamada ao Asaas e falha genérica",
    async (_nome, vercel, asaas, chave) => {
      ambiente(vercel, asaas, chave);

      const cobranca = await criarCobrancaAsaas({
        customerId: "cus_1",
        billingType: "PIX",
        valor: 10,
        descricao: "teste",
      });

      expect(cobranca.sucesso).toBe(false);
      expect(fetchFalso).not.toHaveBeenCalled();
    },
  );

  it("erro do Asaas informa o status HTTP (usado pelo webhook para distinguir cobrança inexistente)", async () => {
    ambiente("production", "production");
    fetchFalso.mockResolvedValue(
      resposta({ errors: [{ description: "Cobrança não encontrada." }] }, 404),
    );

    expect(await consultarCobrancaAsaas("pay_de_outro_ambiente")).toEqual({
      sucesso: false,
      mensagem: "Não foi possível processar a solicitação de pagamento.",
      statusHttp: 404,
    });
  });

  it("paymentId é codificado na URL (não dá para mudar o caminho da API)", async () => {
    ambiente("production", "production");
    fetchFalso.mockResolvedValue(resposta({ id: "x", status: "PENDING" }));

    await consultarCobrancaAsaas("../customers?x=1");

    expect(fetchFalso.mock.calls[0][0]).toBe(
      "https://api.asaas.com/v3/payments/..%2Fcustomers%3Fx%3D1",
    );
  });
});

it("cartão hospedado cria cobrança sem transmitir PAN/CVV e mantém referência", async () => {
  ambiente("preview", "sandbox", "$aact_hmlg_x");
  fetchFalso.mockResolvedValue(
    resposta({
      id: "pay_1",
      status: "PENDING",
      invoiceUrl: "https://sandbox.asaas.com/i/teste",
    }),
  );
  await criarCobrancaAsaas({
    customerId: "cus_1",
    billingType: "CREDIT_CARD",
    valor: 100,
    descricao: "Pedido",
    referenciaExterna: "checkout",
  });
  const corpo = JSON.parse(fetchFalso.mock.calls[0][1].body);
  expect(corpo).toMatchObject({
    billingType: "CREDIT_CARD",
    externalReference: "checkout",
  });
  expect(corpo).not.toHaveProperty("creditCard");
  expect(corpo).not.toHaveProperty("creditCardHolderInfo");
});

const cartaoTeste = {
  numero: "4111111111111111",
  nomeImpresso: "CLIENTE TESTE",
  mesValidade: "12",
  anoValidade: "2035",
  cvv: "321",
};
const titularTeste = {
  nome: "Cliente Teste",
  cpf: "52998224725",
  email: "teste@example.com",
  telefone: "11999999999",
  cep: "01310100",
  numeroEndereco: "10",
};
it("cartão é enviado somente no corpo HTTPS do Asaas e resposta descarta token e dados sensíveis", async () => {
  ambiente("preview", "sandbox", "$aact_hmlg_x");
  fetchFalso.mockResolvedValue(
    resposta({
      id: "pay_teste",
      status: "CONFIRMED",
      creditCard: {
        creditCardToken: "segredo",
        creditCardNumber: cartaoTeste.numero,
      },
      creditCardToken: "segredo",
    }),
  );
  const r = await criarCobrancaAsaas({
    customerId: "cus_teste",
    billingType: "CREDIT_CARD",
    valor: 70,
    descricao: "Pedido",
    ipCliente: "203.0.113.10",
    cartao: cartaoTeste,
    titularCartao: titularTeste,
  });
  const [url, opcoes] = fetchFalso.mock.calls[0];
  expect(url).toBe("https://api-sandbox.asaas.com/v3/payments");
  expect(JSON.parse(opcoes.body)).toMatchObject({
    creditCard: { number: cartaoTeste.numero, ccv: cartaoTeste.cvv },
    creditCardHolderInfo: { addressNumber: "10" },
    remoteIp: "203.0.113.10",
  });
  expect(opcoes).toMatchObject({
    cache: "no-store",
    redirect: "error",
    signal: expect.any(AbortSignal),
  });
  expect(r).toEqual({
    sucesso: true,
    dados: { id: "pay_teste", status: "CONFIRMED" },
  });
  expect(console.error).not.toHaveBeenCalled();
});
it.each([400, 408, 500])(
  "erro %s com PAN/CVV refletidos é descartado",
  async (status) => {
    ambiente("preview", "sandbox", "$aact_hmlg_x");
    fetchFalso.mockResolvedValue(
      resposta(
        { errors: [{ description: JSON.stringify(cartaoTeste) }] },
        status,
      ),
    );
    const r = await criarCobrancaAsaas({
      customerId: "cus_teste",
      billingType: "CREDIT_CARD",
      valor: 70,
      descricao: "Pedido",
      cartao: cartaoTeste,
      titularCartao: titularTeste,
    });
    expect(r).toEqual({
      sucesso: false,
      statusHttp: status,
      mensagem: "Não foi possível processar a solicitação de pagamento.",
    });
    expect(console.error).not.toHaveBeenCalled();
  },
);
it("resposta de sucesso inválida e redirecionamento falham sem repetição automática", async () => {
  ambiente("preview", "sandbox", "$aact_hmlg_x");
  fetchFalso.mockResolvedValue(resposta(null));
  expect(
    (
      await criarCobrancaAsaas({
        customerId: "cus_teste",
        billingType: "PIX",
        valor: 70,
        descricao: "Pedido",
      })
    ).sucesso,
  ).toBe(false);
  expect(fetchFalso).toHaveBeenCalledTimes(1);
});
