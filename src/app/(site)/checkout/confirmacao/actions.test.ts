import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/clientes/sessao", () => ({ obterClienteLogado: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ criarClienteSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/pagamento/asaas", () => ({
  consultarCobrancaAsaas: vi.fn(),
  buscarLinhaDigitavelBoletoAsaas: vi.fn(),
  buscarQrCodePixAsaas: vi.fn(),
}));
vi.mock("@/lib/pagamento/pedidos", () => ({
  mapearStatusAsaasParaPedido: vi.fn(),
  atualizarStatusPedidoPorPagamento: vi.fn(),
}));
import { obterClienteLogado } from "@/lib/clientes/sessao";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import {
  consultarCobrancaAsaas,
  buscarLinhaDigitavelBoletoAsaas,
  buscarQrCodePixAsaas,
} from "@/lib/pagamento/asaas";
import {
  mapearStatusAsaasParaPedido,
  atualizarStatusPedidoPorPagamento,
} from "@/lib/pagamento/pedidos";
import { buscarResumoPedido } from "./actions";
const id = "44444444-4444-4444-8444-444444444444";
let pedido: Record<string, unknown>;
beforeEach(() => {
  vi.resetAllMocks();
  pedido = {
    id,
    cliente_id: "cliente",
    status: "pendente",
    total: 120,
    frete_valor: 20,
    frete_transportadora: "Correios",
    forma_pagamento: "pix",
    asaas_payment_id: "pay_1",
  };
  vi.mocked(obterClienteLogado).mockResolvedValue({
    userId: "user",
    email: "teste@example.com",
    cliente: { id: "cliente" },
  } as never);
  vi.mocked(criarClienteSupabaseAdmin).mockReturnValue({
    from: (tabela: string) => {
      const q = {
        select: () => q,
        eq: () =>
          tabela === "pedidos"
            ? q
            : Promise.resolve({
                data: [
                  {
                    quantidade: 1,
                    preco_unitario: 100,
                    produtos: { nome: "Rolamento" },
                  },
                ],
                error: null,
              }),
        maybeSingle: async () => ({ data: pedido, error: null }),
      };
      return q;
    },
  } as never);
  vi.mocked(consultarCobrancaAsaas).mockResolvedValue({
    sucesso: true,
    dados: {
      id: "pay_1",
      status: "PENDING",
      invoiceUrl: "https://sandbox.asaas.com/i/1",
      bankSlipUrl: "https://sandbox.asaas.com/b/1",
    },
  });
  vi.mocked(buscarQrCodePixAsaas).mockResolvedValue({
    sucesso: true,
    dados: { qrCodeBase64: "png", copiaECola: "pix" },
  });
  vi.mocked(buscarLinhaDigitavelBoletoAsaas).mockResolvedValue({
    sucesso: true,
    dados: { linhaDigitavel: "123" },
  });
  vi.mocked(mapearStatusAsaasParaPedido).mockReturnValue(null);
});
describe("consulta do pedido autenticado", () => {
  it("não consulta pedido sem sessão", async () => {
    vi.mocked(obterClienteLogado).mockResolvedValue(null);
    expect(await buscarResumoPedido(id)).toMatchObject({ sucesso: false });
    expect(criarClienteSupabaseAdmin).not.toHaveBeenCalled();
  });
  it("Pix pendente mantém status e fornece QR da cobrança existente", async () => {
    expect(await buscarResumoPedido(id)).toMatchObject({
      sucesso: true,
      status: "pendente",
      pix: { copiaECola: "pix" },
    });
  });
  it("boleto mantém pendência e retorna linha e URL do provedor", async () => {
    pedido.forma_pagamento = "boleto";
    expect(await buscarResumoPedido(id)).toMatchObject({
      status: "pendente",
      boleto: { url: "https://sandbox.asaas.com/b/1", linhaDigitavel: "123" },
    });
  });
  it("cartão pendente oferece a página hospedada sem confirmar pagamento", async () => {
    pedido.forma_pagamento = "cartao";
    expect(await buscarResumoPedido(id)).toMatchObject({
      status: "pendente",
      urlPagamento: "https://sandbox.asaas.com/i/1",
    });
  });
  it("só confirma pagamento quando o provedor confirma", async () => {
    vi.mocked(mapearStatusAsaasParaPedido).mockReturnValue("pago");
    expect(await buscarResumoPedido(id)).toMatchObject({ status: "pago" });
    expect(atualizarStatusPedidoPorPagamento).toHaveBeenCalled();
  });
  it("não regride pedido já enviado ao consultar pagamento", async () => {
    pedido.status = "enviado";
    vi.mocked(mapearStatusAsaasParaPedido).mockReturnValue("pago");
    expect(await buscarResumoPedido(id)).toMatchObject({ status: "enviado" });
    expect(atualizarStatusPedidoPorPagamento).not.toHaveBeenCalled();
  });
  it("falha de rede conserva status pendente e informa a indisponibilidade", async () => {
    vi.mocked(consultarCobrancaAsaas).mockResolvedValue({
      sucesso: false,
      mensagem: "offline",
    });
    expect(await buscarResumoPedido(id)).toMatchObject({
      status: "pendente",
      aviso: expect.stringContaining("Não foi possível"),
    });
  });
});

// APPSEC-018 — resumo, QR Pix, boleto, status e total só para o dono.
describe("dono do pedido (APPSEC-018)", () => {
  const CLIENTE_A = "cliente-a";
  const CLIENTE_B = "cliente-b";

  function logadoComo(clienteId: string) {
    vi.mocked(obterClienteLogado).mockResolvedValue({
      userId: "usuario-" + clienteId,
      email: "teste@example.com",
      cliente: { id: clienteId },
    } as never);
  }

  /** Banco que só devolve o pedido se a consulta filtrar pelo id E pelo dono certo. */
  function bancoComDono(dono: string) {
    const tabelas: string[] = [];
    const filtrosPedido: [string, unknown][] = [];
    vi.mocked(criarClienteSupabaseAdmin).mockReturnValue({
      from: (tabela: string) => {
        tabelas.push(tabela);
        const q = {
          select: () => q,
          eq: (coluna: string, valor: unknown) => {
            if (tabela !== "pedidos")
              return Promise.resolve({ data: [], error: null });
            filtrosPedido.push([coluna, valor]);
            return q;
          },
          maybeSingle: async () => {
            const doDono =
              filtrosPedido.some(([c, v]) => c === "id" && v === id) &&
              filtrosPedido.some(([c, v]) => c === "cliente_id" && v === dono);
            return {
              data: doDono ? { ...pedido, cliente_id: dono } : null,
              error: null,
            };
          },
        };
        return q;
      },
    } as never);
    return { tabelas, filtrosPedido };
  }

  it("cliente A com o pedido de B: 'não encontrado', sem QR, boleto, status nem consulta ao Asaas", async () => {
    logadoComo(CLIENTE_A);
    const { tabelas } = bancoComDono(CLIENTE_B);

    expect(await buscarResumoPedido(id)).toEqual({
      sucesso: false,
      mensagem: "Pedido não encontrado.",
    });
    expect(tabelas).toEqual(["pedidos"]);
    expect(consultarCobrancaAsaas).not.toHaveBeenCalled();
    expect(buscarQrCodePixAsaas).not.toHaveBeenCalled();
    expect(buscarLinhaDigitavelBoletoAsaas).not.toHaveBeenCalled();
    expect(atualizarStatusPedidoPorPagamento).not.toHaveBeenCalled();
  });

  it("o filtro de dono é o cliente da SESSÃO", async () => {
    logadoComo(CLIENTE_A);
    const { filtrosPedido } = bancoComDono(CLIENTE_A);

    expect(await buscarResumoPedido(id)).toMatchObject({
      sucesso: true,
      pix: { copiaECola: "pix" },
    });
    expect(filtrosPedido).toContainEqual(["cliente_id", CLIENTE_A]);
  });

  it("conta sem cadastro de cliente não consulta pedido nenhum", async () => {
    vi.mocked(obterClienteLogado).mockResolvedValue({
      userId: "usuario",
      email: "teste@example.com",
      cliente: null,
    });
    expect(await buscarResumoPedido(id)).toMatchObject({ sucesso: false });
    expect(criarClienteSupabaseAdmin).not.toHaveBeenCalled();
  });

  it.each(["pay_1", "44444444", "", "' or 1=1 --"])(
    "identificador que não é o UUID do pedido (%j) é recusado antes do banco",
    async (valor) => {
      expect(await buscarResumoPedido(valor)).toEqual({
        sucesso: false,
        mensagem: "Pedido inválido.",
      });
      expect(obterClienteLogado).not.toHaveBeenCalled();
      expect(criarClienteSupabaseAdmin).not.toHaveBeenCalled();
    },
  );
});
