// Kill switch do checkout (CHECKOUT_ENABLED) contra a Server Action real
// criarPedido, chamada direto — sem passar pela página. Com o checkout
// fechado, nada pode acontecer: nem ler sessão, nem reservar limite, nem
// descontar estoque, nem falar com o Asaas, nem gravar pedido.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/checkout/idempotencia", () => ({ executarUmaVez: vi.fn() }));
vi.mock("@/lib/clientes/sessao", () => ({ obterClienteLogado: vi.fn(async () => null) }));
vi.mock("@/lib/checkout/limite-cartao", () => ({ permitirTentativaCartao: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("@/lib/config/integracoes", () => ({ obterConfigAsaas: vi.fn(() => ({ ambiente: "sandbox" })) }));
vi.mock("@/lib/supabase/admin", () => ({ criarClienteSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/pagamento/asaas", () => ({
  buscarOuCriarClienteAsaas: vi.fn(),
  criarCobrancaAsaas: vi.fn(),
  buscarQrCodePixAsaas: vi.fn(),
  buscarLinhaDigitavelBoletoAsaas: vi.fn(),
}));
vi.mock("@/lib/pagamento/pedidos", () => ({ mapearStatusAsaasParaPedido: vi.fn() }));
vi.mock("@/lib/pagamento/estoque", () => ({ descontarEstoqueItens: vi.fn(), reverterEstoqueItens: vi.fn() }));
vi.mock("@/lib/checkout/frete-pedido", () => ({ calcularFreteDoPedido: vi.fn() }));

import { executarUmaVez } from "@/lib/checkout/idempotencia";
import { obterClienteLogado } from "@/lib/clientes/sessao";
import { permitirTentativaCartao } from "@/lib/checkout/limite-cartao";
import { headers } from "next/headers";
import { obterConfigAsaas } from "@/lib/config/integracoes";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { buscarOuCriarClienteAsaas, criarCobrancaAsaas } from "@/lib/pagamento/asaas";
import { descontarEstoqueItens, reverterEstoqueItens } from "@/lib/pagamento/estoque";
import { calcularFreteDoPedido } from "@/lib/checkout/frete-pedido";
import { MENSAGEM_CHECKOUT_FECHADO } from "@/lib/config/lancamento";
import { criarPedido, type CriarPedidoInput } from "./actions";

const pedidoValido: CriarPedidoInput = {
  checkoutId: "55555555-5555-4555-8555-555555555555",
  clienteId: "33333333-3333-4333-8333-333333333333",
  tipoCliente: "PF",
  dadosPF: { nomeCompleto: "Maria Silva", cpf: "52998224725", email: "maria@exemplo.com", telefone: "11912345678" },
  dadosPJ: { razaoSocial: "", cnpj: "", email: "", telefone: "", inscricaoEstadual: "" },
  endereco: {
    cep: "01001000",
    rua: "Praça da Sé",
    numero: "1",
    complemento: "",
    bairro: "Sé",
    cidade: "São Paulo",
    uf: "SP",
  },
  freteServicoId: 1,
  itens: [{ produtoId: "11111111-1111-4111-8111-111111111111", quantidade: 1 }],
  formaPagamento: "cartao",
  cartao: { numero: "4111111111111111", nomeImpresso: "MARIA SILVA", validade: "12/30", cvv: "123" },
  titularCartao: {
    nome: "Maria Silva",
    cpf: "52998224725",
    email: "maria@exemplo.com",
    telefone: "11912345678",
    cep: "01001000",
    numeroEndereco: "1",
  },
};

function esperarNenhumEfeito() {
  for (const efeito of [
    obterClienteLogado,
    executarUmaVez,
    permitirTentativaCartao,
    headers,
    obterConfigAsaas,
    criarClienteSupabaseAdmin,
    buscarOuCriarClienteAsaas,
    criarCobrancaAsaas,
    descontarEstoqueItens,
    reverterEstoqueItens,
    calcularFreteDoPedido,
  ]) {
    expect(efeito).not.toHaveBeenCalled();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("criarPedido com CHECKOUT_ENABLED desligado", () => {
  it.each(["false", "", "TRUE", "True", "1", "yes", " true"])(
    "CHECKOUT_ENABLED=%j → recusa com a mensagem amigável, sem nenhum efeito colateral",
    async (valor) => {
      vi.stubEnv("CHECKOUT_ENABLED", valor);
      for (const forma of ["pix", "boleto", "cartao"] as const) {
        const r = await criarPedido({ ...pedidoValido, formaPagamento: forma });
        expect(r).toEqual({ sucesso: false, mensagem: MENSAGEM_CHECKOUT_FECHADO });
      }
      esperarNenhumEfeito();
    },
  );

  it("variável ausente → fechado (fail closed)", async () => {
    vi.stubEnv("CHECKOUT_ENABLED", "");
    delete process.env.CHECKOUT_ENABLED;
    expect(await criarPedido(pedidoValido)).toEqual({ sucesso: false, mensagem: MENSAGEM_CHECKOUT_FECHADO });
    esperarNenhumEfeito();
  });

  it("payload adulterado/lixo chamando a action direto → mesma recusa, antes até da validação", async () => {
    vi.stubEnv("CHECKOUT_ENABLED", "false");
    for (const lixo of [null, undefined, {}, "x", { itens: [{ produtoId: "x", quantidade: -9 }] }]) {
      expect(await criarPedido(lixo as never)).toEqual({ sucesso: false, mensagem: MENSAGEM_CHECKOUT_FECHADO });
    }
    esperarNenhumEfeito();
  });
});

describe("criarPedido com CHECKOUT_ENABLED=true", () => {
  it("o kill switch sai do caminho e o fluxo normal começa (sessão consultada)", async () => {
    vi.stubEnv("CHECKOUT_ENABLED", "true");
    const r = await criarPedido({ ...pedidoValido, formaPagamento: "pix" });
    expect(r.sucesso).toBe(false);
    if (!r.sucesso) expect(r.mensagem).not.toBe(MENSAGEM_CHECKOUT_FECHADO);
    expect(obterClienteLogado).toHaveBeenCalled();
  });
});
