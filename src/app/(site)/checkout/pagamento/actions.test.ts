// Reteste dos ataques P0 contra a Server Action real (criarPedido), com
// banco/Asaas/estoque/Melhor Envio substituídos por dublês:
// - APPSEC-002: quantidade adulterada é recusada antes de qualquer efeito.
// - APPSEC-001: o frete cobrado é SEMPRE o da cotação feita no servidor,
//   nunca o valor que o navegador mandou.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/checkout/idempotencia", () => ({
  executarUmaVez: (_id: string, executar: () => Promise<unknown>) => executar(),
}));
vi.mock("@/lib/clientes/sessao", () => ({
  obterClienteLogado: vi.fn(async () => ({
    userId: "user",
    cliente: {
      id: "33333333-3333-4333-8333-333333333333",
      tipo: "PF",
      nome: "Maria Silva",
      documento: "52998224725",
      email: "maria@exemplo.com",
      telefone: "11912345678",
    },
  })),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/checkout/limite-cartao", () => ({
  permitirTentativaCartao: vi.fn(async () => true),
}));
import { permitirTentativaCartao } from "@/lib/checkout/limite-cartao";
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ host: "localhost:3000" })),
}));
vi.mock("@/lib/config/integracoes", () => ({
  obterConfigAsaas: () => ({ ambiente: "sandbox" }),
}));
vi.mock("@/lib/supabase/admin", () => ({ criarClienteSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/pagamento/asaas", () => ({
  buscarOuCriarClienteAsaas: vi.fn(),
  criarCobrancaAsaas: vi.fn(),
  buscarQrCodePixAsaas: vi.fn(),
  buscarLinhaDigitavelBoletoAsaas: vi.fn(),
  consultarCobrancaAsaas: vi.fn(),
}));
vi.mock("@/lib/pagamento/pedidos", () => ({
  atualizarStatusPedidoPorPagamento: vi.fn(),
  mapearStatusAsaasParaPedido: vi.fn(() => null),
}));
vi.mock("@/lib/pagamento/estoque", () => ({
  descontarEstoqueItens: vi.fn(),
  reverterEstoqueItens: vi.fn(),
}));
vi.mock("@/lib/frete/cotacao", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/frete/cotacao")>()),
  cotarFreteMelhorEnvio: vi.fn(),
}));

import { obterClienteLogado } from "@/lib/clientes/sessao";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buscarOuCriarClienteAsaas,
  buscarQrCodePixAsaas,
  criarCobrancaAsaas,
} from "@/lib/pagamento/asaas";
import { headers } from "next/headers";
import {
  descontarEstoqueItens,
  reverterEstoqueItens,
} from "@/lib/pagamento/estoque";
import {
  MENSAGEM_FRETE_INDISPONIVEL,
  cotarFreteMelhorEnvio,
} from "@/lib/frete/cotacao";
import { MENSAGEM_FRETE_OPCAO_INVALIDA } from "@/lib/checkout/frete-pedido";
import { criarPedido, type CriarPedidoInput } from "./actions";

const PRODUTO_A = "11111111-1111-4111-8111-111111111111";
const PRODUTO_B = "22222222-2222-4222-8222-222222222222";
const PEDIDO_ID = "44444444-4444-4444-8444-444444444444";

const PRODUTO_BANCO_A = {
  id: PRODUTO_A,
  nome: "Rolamento",
  sku: "ROL-1",
  preco: 10,
  estoque: 10,
  ativo: true,
  peso_kg: 0.5,
  altura_cm: 5,
  largura_cm: 6,
  comprimento_cm: 7,
};
const PRODUTO_BANCO_B = {
  id: PRODUTO_B,
  nome: "Correia",
  sku: "COR-1",
  preco: 30,
  estoque: 10,
  ativo: true,
  peso_kg: 2,
  altura_cm: 10,
  largura_cm: 20,
  comprimento_cm: 30,
};

/** Cotação "real" do servidor: SEDEX (id 2) custa R$ 50. */
const COTACAO_SERVIDOR = {
  sucesso: true as const,
  opcoes: [
    { id: 1, nome: "PAC", transportadora: "Correios", prazoDias: 6, valor: 30 },
    {
      id: 2,
      nome: "SEDEX",
      transportadora: "Correios",
      prazoDias: 2,
      valor: 50,
    },
  ],
};

function payload(sobrescrever: Record<string, unknown> = {}): CriarPedidoInput {
  return {
    checkoutId: "55555555-5555-4555-8555-555555555555",
    clienteId: "33333333-3333-4333-8333-333333333333",
    tipoCliente: "PF",
    dadosPF: {
      nomeCompleto: "Maria Silva",
      cpf: "529.982.247-25",
      email: "maria@exemplo.com",
      telefone: "11912345678",
    },
    dadosPJ: {
      razaoSocial: "",
      cnpj: "",
      inscricaoEstadual: "",
      email: "",
      telefone: "",
    },
    endereco: {
      cep: "01310-100",
      rua: "Av. Paulista",
      numero: "1000",
      complemento: "",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      uf: "SP",
    },
    freteServicoId: 2,
    itens: [{ produtoId: PRODUTO_A, quantidade: 2 }],
    formaPagamento: "pix",
    ...sobrescrever,
  } as CriarPedidoInput;
}

/** Dublê do Supabase: responde a consulta de produtos e guarda o que foi inserido. */
function bancoFalso(produtos: object[]) {
  const inseridos: Record<string, unknown> = {};
  const cliente = {
    from: vi.fn((tabela: string) => {
      if (tabela === "produtos") {
        return {
          select: () => ({
            in: () => ({
              returns: async () => ({ data: produtos, error: null }),
            }),
          }),
        };
      }
      return {
        insert: (linhas: unknown) => {
          inseridos[tabela] = linhas;
          if (tabela === "pedidos") {
            return {
              select: () => ({
                single: async () => ({ data: { id: PEDIDO_ID }, error: null }),
              }),
            };
          }
          return Promise.resolve({ error: null });
        },
      };
    }),
  };
  vi.mocked(criarClienteSupabaseAdmin).mockReturnValue(cliente as never);
  return { inseridos };
}

/** Prepara um checkout Pix que vai até o fim com sucesso. */
function prepararCompra(produtos: object[]) {
  const banco = bancoFalso(produtos);
  vi.mocked(cotarFreteMelhorEnvio).mockResolvedValue(COTACAO_SERVIDOR);
  vi.mocked(buscarOuCriarClienteAsaas).mockResolvedValue({
    sucesso: true,
    dados: { customerId: "cus_teste" },
  });
  vi.mocked(descontarEstoqueItens).mockResolvedValue({ sucesso: true });
  vi.mocked(criarCobrancaAsaas).mockResolvedValue({
    sucesso: true,
    dados: { id: "pay_teste", status: "PENDING" },
  } as never);
  vi.mocked(buscarQrCodePixAsaas).mockResolvedValue({
    sucesso: true,
    dados: { qrCodeBase64: "qr", copiaECola: "pix" },
  });
  return banco;
}

function esperarNenhumEfeitoColateral(banco?: {
  inseridos: Record<string, unknown>;
}) {
  expect(buscarOuCriarClienteAsaas).not.toHaveBeenCalled();
  expect(descontarEstoqueItens).not.toHaveBeenCalled();
  expect(criarCobrancaAsaas).not.toHaveBeenCalled();
  if (banco) expect(banco.inseridos).toEqual({});
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("criarPedido — ataque de quantidade (APPSEC-002)", () => {
  it.each([
    ["negativa", -9],
    ["zero", 0],
    ["decimal", 1.5],
    ["NaN", Number.NaN],
    ["gigante", 1e9],
    ["string", "3"],
  ])(
    "recusa quantidade %s sem tocar em banco, Asaas ou estoque",
    async (_nome, quantidade) => {
      const resultado = await criarPedido(
        payload({
          itens: [
            { produtoId: PRODUTO_A, quantidade: 1 },
            { produtoId: PRODUTO_B, quantidade },
          ],
        }),
      );

      expect(resultado.sucesso).toBe(false);
      expect(criarClienteSupabaseAdmin).not.toHaveBeenCalled();
      expect(cotarFreteMelhorEnvio).not.toHaveBeenCalled();
      esperarNenhumEfeitoColateral();
    },
  );

  it("soma o mesmo produto repetido antes de conferir o estoque (3 + 4 > 6)", async () => {
    bancoFalso([{ ...PRODUTO_BANCO_A, estoque: 6 }]);

    const resultado = await criarPedido(
      payload({
        itens: [
          { produtoId: PRODUTO_A, quantidade: 3 },
          { produtoId: PRODUTO_A, quantidade: 4 },
        ],
      }),
    );

    expect(resultado).toEqual({
      sucesso: false,
      mensagem: expect.stringContaining("Não há estoque suficiente"),
    });
    esperarNenhumEfeitoColateral();
  });

  it("desconta o estoque com a quantidade somada, numa linha por produto", async () => {
    prepararCompra([PRODUTO_BANCO_A]);

    await criarPedido(
      payload({
        itens: [
          { produtoId: PRODUTO_A, quantidade: 3 },
          { produtoId: PRODUTO_A, quantidade: 4 },
        ],
      }),
    );

    expect(descontarEstoqueItens).toHaveBeenCalledWith(expect.anything(), [
      { produtoId: PRODUTO_A, quantidade: 7 },
    ]);
  });
});

describe("criarPedido — frete controlado pelo navegador (APPSEC-001)", () => {
  it.each([
    ["ataque original: -1000", -1000],
    ["zero adulterado", 0],
    ["menor que o real", 5],
    ["maior que o real", 500],
  ])(
    "frete do navegador (%s) é ignorado: cobra os R$ 50 cotados pelo servidor",
    async (_nome, valorForjado) => {
      const banco = prepararCompra([PRODUTO_BANCO_A]);

      const resultado = await criarPedido(
        payload({
          freteServicoId: 2,
          // Contrato antigo, forjado à mão — deve ser descartado.
          freteSelecionado: {
            id: 2,
            nome: "SEDEX",
            transportadora: "Forjada",
            prazoDias: 2,
            valor: valorForjado,
          },
        }),
      );

      // 2 × R$ 10 (preço do banco) + R$ 50 (frete cotado no servidor)
      expect(resultado.sucesso).toBe(true);
      expect(criarCobrancaAsaas).toHaveBeenCalledWith(
        expect.objectContaining({ valor: 70 }),
      );
      expect(banco.inseridos.pedidos).toEqual(
        expect.objectContaining({
          total: 70,
          frete_valor: 50,
          frete_transportadora: "Correios",
        }),
      );
    },
  );

  it("recalcula o frete ANTES de qualquer efeito colateral (Asaas, estoque, cobrança)", async () => {
    prepararCompra([PRODUTO_BANCO_A]);

    await criarPedido(payload());

    const ordemCotacao = vi.mocked(cotarFreteMelhorEnvio).mock
      .invocationCallOrder[0];
    expect(ordemCotacao).toBeLessThan(
      vi.mocked(buscarOuCriarClienteAsaas).mock.invocationCallOrder[0],
    );
    expect(ordemCotacao).toBeLessThan(
      vi.mocked(descontarEstoqueItens).mock.invocationCallOrder[0],
    );
    expect(ordemCotacao).toBeLessThan(
      vi.mocked(criarCobrancaAsaas).mock.invocationCallOrder[0],
    );
  });

  it("serviço que não está na cotação do servidor é recusado", async () => {
    const banco = prepararCompra([PRODUTO_BANCO_A]);

    const resultado = await criarPedido(payload({ freteServicoId: 999 }));

    expect(resultado).toEqual({
      sucesso: false,
      mensagem: MENSAGEM_FRETE_OPCAO_INVALIDA,
    });
    esperarNenhumEfeitoColateral(banco);
  });

  it("CEP mudou depois da cotação: recalcula para o CEP deste pedido", async () => {
    prepararCompra([PRODUTO_BANCO_A]);

    await criarPedido(
      payload({
        endereco: {
          cep: "20040-020",
          rua: "Av. Rio Branco",
          numero: "1",
          complemento: "",
          bairro: "Centro",
          cidade: "Rio de Janeiro",
          uf: "RJ",
        },
      }),
    );

    expect(cotarFreteMelhorEnvio).toHaveBeenCalledTimes(1);
    expect(cotarFreteMelhorEnvio).toHaveBeenCalledWith(
      "20040-020",
      expect.anything(),
    );
  });

  it("carrinho mudou depois da cotação: cota com todos os produtos atuais e medidas do BANCO", async () => {
    prepararCompra([PRODUTO_BANCO_A, PRODUTO_BANCO_B]);

    await criarPedido(
      payload({
        itens: [
          // medidas mandadas pelo navegador são descartadas pelo schema
          { produtoId: PRODUTO_A, quantidade: 2, pesoKg: 0.001, alturaCm: 1 },
          { produtoId: PRODUTO_B, quantidade: 1 },
        ],
      }),
    );

    expect(cotarFreteMelhorEnvio).toHaveBeenCalledWith("01310-100", [
      {
        id: PRODUTO_A,
        pesoKg: 0.5,
        alturaCm: 5,
        larguraCm: 6,
        comprimentoCm: 7,
        valorUnitario: 10,
        quantidade: 2,
      },
      {
        id: PRODUTO_B,
        pesoKg: 2,
        alturaCm: 10,
        larguraCm: 20,
        comprimentoCm: 30,
        valorUnitario: 30,
        quantidade: 1,
      },
    ]);
    // 2 × R$ 10 + 1 × R$ 30 + R$ 50
    expect(criarCobrancaAsaas).toHaveBeenCalledWith(
      expect.objectContaining({ valor: 100 }),
    );
  });

  it("Melhor Envio indisponível: nenhum pedido, cobrança ou desconto, e mensagem genérica", async () => {
    const banco = prepararCompra([PRODUTO_BANCO_A]);
    vi.mocked(cotarFreteMelhorEnvio).mockResolvedValue({
      sucesso: false,
      mensagem: "token expirado (detalhe interno)",
    });

    const resultado = await criarPedido(payload());

    expect(resultado).toEqual({
      sucesso: false,
      mensagem: MENSAGEM_FRETE_INDISPONIVEL,
    });
    esperarNenhumEfeitoColateral(banco);
  });

  it("cotação que lança exceção também falha fechado", async () => {
    const banco = prepararCompra([PRODUTO_BANCO_A]);
    vi.mocked(cotarFreteMelhorEnvio).mockRejectedValue(new Error("timeout"));

    const resultado = await criarPedido(payload());

    expect(resultado).toEqual({
      sucesso: false,
      mensagem: MENSAGEM_FRETE_INDISPONIVEL,
    });
    esperarNenhumEfeitoColateral(banco);
  });

  it("valor inválido na cotação (negativo) é recusado", async () => {
    const banco = prepararCompra([PRODUTO_BANCO_A]);
    vi.mocked(cotarFreteMelhorEnvio).mockResolvedValue({
      sucesso: true,
      opcoes: [
        {
          id: 2,
          nome: "SEDEX",
          transportadora: "Correios",
          prazoDias: 2,
          valor: -5,
        },
      ],
    });

    const resultado = await criarPedido(payload());

    expect(resultado.sucesso).toBe(false);
    esperarNenhumEfeitoColateral(banco);
  });

  it.each([
    ["peso zero", { peso_kg: 0 }],
    ["altura nula", { altura_cm: null }],
    ["largura negativa", { largura_cm: -1 }],
  ])(
    "produto com %s no banco falha fechado, sem inventar medida",
    async (_nome, defeito) => {
      const banco = prepararCompra([{ ...PRODUTO_BANCO_A, ...defeito }]);

      const resultado = await criarPedido(payload());

      expect(resultado.sucesso).toBe(false);
      expect(cotarFreteMelhorEnvio).not.toHaveBeenCalled();
      esperarNenhumEfeitoColateral(banco);
    },
  );
});

describe("checkout autenticado e total aprovado", () => {
  it("recusa visitante antes de reservar estoque ou criar cobrança", async () => {
    vi.mocked(obterClienteLogado).mockResolvedValueOnce(null);
    const resultado = await criarPedido(payload());
    expect(resultado).toMatchObject({
      sucesso: false,
      mensagem: expect.stringContaining("Entre na sua conta"),
    });
    esperarNenhumEfeitoColateral();
  });
  it("APPSEC-004: cliente A mandando o clienteId de B é recusado sem nenhum efeito", async () => {
    const banco = prepararCompra([PRODUTO_BANCO_A]);
    const resultado = await criarPedido(
      payload({ clienteId: "66666666-6666-4666-8666-666666666666" }),
    );
    expect(resultado).toMatchObject({
      sucesso: false,
      mensagem: expect.stringContaining("conta conectada mudou"),
    });
    esperarNenhumEfeitoColateral(banco);
  });
  it("APPSEC-004: o dono do pedido vem da sessão — sem clienteId no payload, grava o cliente da sessão", async () => {
    const banco = prepararCompra([PRODUTO_BANCO_A]);
    const resultado = await criarPedido(payload({ clienteId: undefined }));
    expect(resultado.sucesso).toBe(true);
    expect(banco.inseridos.pedidos).toMatchObject({
      cliente_id: "33333333-3333-4333-8333-333333333333",
    });
  });
  it("APPSEC-004: identidade mandada pelo navegador é ignorada — a cobrança usa o cadastro da sessão", async () => {
    prepararCompra([PRODUTO_BANCO_A]);
    await criarPedido(
      payload({
        dadosPF: {
          nomeCompleto: "Outra Pessoa",
          cpf: "111.444.777-35",
          email: "outra@exemplo.com",
          telefone: "11988887777",
        },
      }),
    );
    expect(buscarOuCriarClienteAsaas).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "Maria Silva",
        documento: "52998224725",
        email: "maria@exemplo.com",
      }),
    );
  });
  it("exige revisão quando frete/preço mudou depois da confirmação", async () => {
    const banco = prepararCompra([PRODUTO_BANCO_A]);
    const resultado = await criarPedido(payload({ totalEsperado: 20 }));
    expect(resultado).toMatchObject({
      sucesso: false,
      mensagem: expect.stringContaining("mudaram"),
    });
    esperarNenhumEfeitoColateral(banco);
  });
  it("falha de rede após solicitar cobrança bloqueia novas tentativas e não repõe estoque às cegas", async () => {
    prepararCompra([PRODUTO_BANCO_A]);
    vi.mocked(criarCobrancaAsaas).mockResolvedValueOnce({
      sucesso: false,
      mensagem: "Timeout",
    });
    const resultado = await criarPedido(payload());
    expect(resultado).toMatchObject({ sucesso: false, bloqueado: true });
  });
});

const cartaoTeste = {
  numero: "4111111111111111",
  nomeImpresso: "CLIENTE TESTE",
  validade: "12/35",
  cvv: "321",
};
const titularTeste = {
  nome: "Cliente Teste",
  cpf: "52998224725",
  email: "teste@example.com",
  telefone: "11999999999",
  cep: "01310100",
  numeroEndereco: "702",
};
describe("cartão transparente", () => {
  it("envia cartão somente ao Asaas, sem persistir ou retornar PAN/CVV/titular", async () => {
    const banco = prepararCompra([PRODUTO_BANCO_A]);
    const r = await criarPedido(
      payload({
        formaPagamento: "cartao",
        cartao: cartaoTeste,
        titularCartao: titularTeste,
      }),
    );
    expect(r.sucesso).toBe(true);
    expect(criarCobrancaAsaas).toHaveBeenCalledWith(
      expect.objectContaining({
        ipCliente: "127.0.0.1",
        cartao: {
          numero: cartaoTeste.numero,
          nomeImpresso: cartaoTeste.nomeImpresso,
          mesValidade: "12",
          anoValidade: "2035",
          cvv: "321",
        },
        titularCartao: titularTeste,
      }),
    );
    const gravado = JSON.stringify({ banco: banco.inseridos, resposta: r });
    expect(gravado).not.toContain(cartaoTeste.numero);
    expect(gravado).not.toContain('"cvv"');
    expect(gravado).not.toContain(titularTeste.email);
  });
  it.each([
    undefined,
    { ...cartaoTeste, numero: "0000000000000000" },
    { ...cartaoTeste, validade: "01/20" },
    { ...cartaoTeste, cvv: "a12" },
  ])("dados inválidos ou ausentes não produzem efeitos", async (cartao) => {
    const r = await criarPedido(
      payload({
        formaPagamento: "cartao",
        cartao,
        titularCartao: titularTeste,
      }),
    );
    expect(r.sucesso).toBe(false);
    esperarNenhumEfeitoColateral();
  });
  it("não permite HTTP fora do sandbox local", async () => {
    vi.mocked(headers).mockResolvedValueOnce(
      new Headers({
        host: "loja.example.com",
        "x-forwarded-for": "203.0.113.10",
        "x-forwarded-proto": "http",
      }) as never,
    );
    const r = await criarPedido(
      payload({
        formaPagamento: "cartao",
        cartao: cartaoTeste,
        titularCartao: titularTeste,
      }),
    );
    expect(r.sucesso).toBe(false);
    esperarNenhumEfeitoColateral();
  });
  it("recusa explícita libera estoque e devolve somente mensagem fixa", async () => {
    prepararCompra([PRODUTO_BANCO_A]);
    vi.mocked(criarCobrancaAsaas).mockResolvedValueOnce({
      sucesso: false,
      statusHttp: 400,
      mensagem: JSON.stringify(cartaoTeste),
    });
    const r = await criarPedido(
      payload({
        formaPagamento: "cartao",
        cartao: cartaoTeste,
        titularCartao: titularTeste,
      }),
    );
    expect(r).toEqual({
      sucesso: false,
      mensagem:
        "O pagamento não foi autorizado. Confira os dados ou escolha outra forma de pagamento.",
    });
    expect(reverterEstoqueItens).toHaveBeenCalledOnce();
  });
  it.each([408, 500, undefined])(
    "resultado incerto %s bloqueia repetição e mantém reserva",
    async (statusHttp) => {
      prepararCompra([PRODUTO_BANCO_A]);
      vi.mocked(criarCobrancaAsaas).mockResolvedValueOnce({
        sucesso: false,
        statusHttp,
        mensagem: "segredo",
      });
      const r = await criarPedido(
        payload({
          formaPagamento: "cartao",
          cartao: cartaoTeste,
          titularCartao: titularTeste,
        }),
      );
      expect(r).toMatchObject({ sucesso: false, bloqueado: true });
      expect(reverterEstoqueItens).not.toHaveBeenCalled();
    },
  );
});

it("limite de cartão atingido não reserva estoque nem chama Asaas", async () => {
  prepararCompra([PRODUTO_BANCO_A]);
  vi.mocked(permitirTentativaCartao).mockResolvedValueOnce(false);
  expect(
    (
      await criarPedido(
        payload({
          formaPagamento: "cartao",
          cartao: cartaoTeste,
          titularCartao: titularTeste,
        }),
      )
    ).sucesso,
  ).toBe(false);
  esperarNenhumEfeitoColateral();
});
