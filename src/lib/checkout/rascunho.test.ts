import { describe, expect, it } from "vitest";
import { chaveCotacao, esquemaRascunhoCheckout } from "./rascunho";
import { errosIdentificacao } from "./validar-identificacao";
const item = { produtoId: "a", preco: 100, quantidade: 1, estoque: 3 };
describe("preservação e validade do checkout", () => {
  it("reordenação não invalida frete, mas CEP, preço, estoque e quantidade invalidam", () => {
    const outro = { ...item, produtoId: "b" };
    const original = chaveCotacao("01310-100", [item, outro]);
    expect(chaveCotacao("01310100", [outro, item])).toBe(original);
    expect(chaveCotacao("01310101", [item, outro])).not.toBe(original);
    for (const campo of ["quantidade", "preco", "estoque"])
      expect(
        chaveCotacao("01310100", [{ ...item, [campo]: 2 }, outro]),
      ).not.toBe(original);
  });
  it("recusa dados corrompidos na sessão", () => {
    expect(
      esquemaRascunhoCheckout.safeParse({
        tipoCliente: "PF",
        cartao: { cvv: "123" },
      }).success,
    ).toBe(false);
  });
  it("valida documento, contato e endereço sem exigir inscrição estadual", () => {
    const dadosPF = {
      nomeCompleto: "Maria Silva",
      cpf: "52998224725",
      email: "teste@example.com",
      telefone: "11999999999",
    };
    const dadosPJ = {
      razaoSocial: "Empresa",
      cnpj: "11222333000181",
      email: "teste@example.com",
      telefone: "11999999999",
      inscricaoEstadual: "",
    };
    const endereco = {
      cep: "01310100",
      rua: "Paulista",
      numero: "100",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      uf: "SP",
      complemento: "",
    };
    expect(
      errosIdentificacao({ tipoCliente: "PF", dadosPF, dadosPJ, endereco }),
    ).toEqual([]);
    expect(
      errosIdentificacao({ tipoCliente: "PJ", dadosPF, dadosPJ, endereco }),
    ).toEqual([]);
    expect(
      errosIdentificacao({
        tipoCliente: "PF",
        dadosPF: { ...dadosPF, cpf: "123", telefone: "9" },
        dadosPJ,
        endereco: { ...endereco, cep: "00000000", uf: "XX" },
      }),
    ).toHaveLength(4);
  });
});
