import { describe, expect, it } from "vitest";
import { carrinhoReducer, type ItemCarrinho } from "./reducer";
const item: ItemCarrinho = {
  produtoId: "a",
  nome: "Rolamento",
  sku: "A",
  preco: 10,
  estoque: 3,
  quantidade: 1,
  pesoKg: 1,
  alturaCm: 1,
  larguraCm: 1,
  comprimentoCm: 1,
};
describe("carrinho compartilhado", () => {
  it("altera somente o item escolhido e respeita seu estoque", () => {
    const estado = {
      itens: [item, { ...item, produtoId: "b", quantidade: 2, estoque: 8 }],
    };
    const novo = carrinhoReducer(estado, {
      tipo: "ALTERAR_QUANTIDADE",
      produtoId: "a",
      quantidade: 9,
    });
    expect(novo.itens.map((i) => i.quantidade)).toEqual([3, 2]);
  });
  it("atualiza preço e estoque reais sem reduzir silenciosamente a quantidade", () => {
    const novo = carrinhoReducer(
      { itens: [{ ...item, quantidade: 3 }] },
      { tipo: "SINCRONIZAR", itens: [{ ...item, estoque: 0, preco: 12 }] },
    );
    expect(novo.itens[0]).toMatchObject({
      quantidade: 3,
      estoque: 0,
      preco: 12,
    });
  });
  it("hidrata de forma defensiva quando o armazenamento está corrompido", () => {
    expect(
      carrinhoReducer(
        { itens: [] },
        { tipo: "HIDRATAR", itens: [null, item] as ItemCarrinho[] },
      ).itens,
    ).toEqual([item]);
  });
});
