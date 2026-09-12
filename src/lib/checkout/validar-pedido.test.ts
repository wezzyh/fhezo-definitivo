import { describe, expect, it } from "vitest";
import {
  PRODUTOS_MAXIMOS_POR_PEDIDO,
  QUANTIDADE_MAXIMA_POR_ITEM,
  agruparItensPorProduto,
  esquemaCriarPedido,
} from "./validar-pedido";

const PRODUTO_A = "11111111-1111-4111-8111-111111111111";
const PRODUTO_B = "22222222-2222-4222-8222-222222222222";

function payload(sobrescrever: Record<string, unknown> = {}) {
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
  };
}

describe("esquemaCriarPedido — quantidade (APPSEC-002)", () => {
  it("aceita o payload que a página de pagamento envia", () => {
    expect(esquemaCriarPedido.safeParse(payload()).success).toBe(true);
  });

  it.each([
    ["negativa", -9],
    ["zero", 0],
    ["decimal", 1.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
    ["acima do teto", QUANTIDADE_MAXIMA_POR_ITEM + 1],
    ["MAX_SAFE_INTEGER", Number.MAX_SAFE_INTEGER],
    ["string", "3"],
    ["null", null],
    ["array", [3]],
    ["objeto", { valor: 3 }],
  ])("recusa quantidade %s", (_nome, quantidade) => {
    const resultado = esquemaCriarPedido.safeParse(
      payload({ itens: [{ produtoId: PRODUTO_A, quantidade }] }),
    );
    expect(resultado.success).toBe(false);
  });

  it("recusa item sem quantidade", () => {
    expect(
      esquemaCriarPedido.safeParse(
        payload({ itens: [{ produtoId: PRODUTO_A }] }),
      ).success,
    ).toBe(false);
  });

  it("recusa carrinho vazio", () => {
    const resultado = esquemaCriarPedido.safeParse(payload({ itens: [] }));
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe(
      "Seu carrinho está vazio.",
    );
  });

  it("recusa itens demais", () => {
    const itens = Array.from(
      { length: PRODUTOS_MAXIMOS_POR_PEDIDO + 1 },
      () => ({ produtoId: PRODUTO_A, quantidade: 1 }),
    );
    expect(esquemaCriarPedido.safeParse(payload({ itens })).success).toBe(
      false,
    );
  });

  it("recusa produtoId que não é UUID", () => {
    const resultado = esquemaCriarPedido.safeParse(
      payload({ itens: [{ produtoId: "1 or 1=1", quantidade: 1 }] }),
    );
    expect(resultado.success).toBe(false);
  });

  it("descarta campos que o navegador não deveria mandar (ex.: preço, total)", () => {
    const resultado = esquemaCriarPedido.safeParse(
      payload({
        itens: [{ produtoId: PRODUTO_A, quantidade: 1, preco: 0.01 }],
        total: 0.01,
      }),
    );
    expect(resultado.success).toBe(true);
    expect(resultado.data?.itens[0]).toEqual({
      produtoId: PRODUTO_A,
      quantidade: 1,
    });
    expect(resultado.data).not.toHaveProperty("total");
  });
});

describe("esquemaCriarPedido — frete (APPSEC-001)", () => {
  it("o valor do frete mandado pelo navegador é descartado (não faz parte do contrato)", () => {
    const resultado = esquemaCriarPedido.safeParse(
      payload({
        freteSelecionado: {
          id: 2,
          nome: "SEDEX",
          transportadora: "Correios",
          prazoDias: 2,
          valor: -1000,
        },
      }),
    );
    expect(resultado.success).toBe(true);
    expect(resultado.data).not.toHaveProperty("freteSelecionado");
    expect(resultado.data?.freteServicoId).toBe(2);
  });

  it.each([
    ["ausente", undefined],
    ["string", "2"],
    ["decimal", 1.5],
    ["negativo", -1],
    ["NaN", Number.NaN],
    ["null", null],
    ["objeto", { id: 2, valor: 0 }],
  ])("recusa freteServicoId %s", (_nome, freteServicoId) => {
    expect(
      esquemaCriarPedido.safeParse(payload({ freteServicoId })).success,
    ).toBe(false);
  });
});

describe("agruparItensPorProduto", () => {
  it("soma o mesmo produto em linhas diferentes", () => {
    expect(
      agruparItensPorProduto([
        { produtoId: PRODUTO_A, quantidade: 3 },
        { produtoId: PRODUTO_B, quantidade: 1 },
        { produtoId: PRODUTO_A, quantidade: 4 },
      ]),
    ).toEqual([
      { produtoId: PRODUTO_A, quantidade: 7 },
      { produtoId: PRODUTO_B, quantidade: 1 },
    ]);
  });

  it("recusa quando a soma estoura o teto por item", () => {
    expect(
      agruparItensPorProduto([
        { produtoId: PRODUTO_A, quantidade: QUANTIDADE_MAXIMA_POR_ITEM },
        { produtoId: PRODUTO_A, quantidade: 1 },
      ]),
    ).toBeNull();
  });
});
