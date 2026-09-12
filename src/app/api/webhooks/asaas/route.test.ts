// Webhook do Asaas × ambiente (APPSEC-028): o status vem da consulta ao
// Asaas do ambiente configurado — um evento de cobrança que não existe
// nesse ambiente (ex.: sandbox chegando em produção) nunca altera pedido.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ criarClienteSupabaseAdmin: vi.fn(() => ({})) }));
vi.mock("@/lib/pagamento/asaas", () => ({ consultarCobrancaAsaas: vi.fn() }));
vi.mock("@/lib/pagamento/pedidos", () => ({ atualizarStatusPedidoPorPagamento: vi.fn() }));
vi.mock("@/lib/integracoes/eventos", () => ({ registrarEventoIntegracao: vi.fn() }));

import { NextRequest } from "next/server";
import { consultarCobrancaAsaas } from "@/lib/pagamento/asaas";
import { atualizarStatusPedidoPorPagamento } from "@/lib/pagamento/pedidos";
import { registrarEventoIntegracao } from "@/lib/integracoes/eventos";
import { POST } from "./route";

function requisicao(corpo: unknown, token = "token-certo") {
  return new NextRequest("http://localhost/api/webhooks/asaas", {
    method: "POST",
    headers: { "asaas-access-token": token, "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

const EVENTO = { event: "PAYMENT_RECEIVED", payment: { id: "pay_1", status: "RECEIVED" } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "token-certo");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("webhook do Asaas", () => {
  it("token errado → 401, sem consultar nem alterar nada", async () => {
    const resposta = await POST(requisicao(EVENTO, "token-errado"));
    expect(resposta.status).toBe(401);
    expect(consultarCobrancaAsaas).not.toHaveBeenCalled();
    expect(atualizarStatusPedidoPorPagamento).not.toHaveBeenCalled();
  });

  it("cobrança confirmada no ambiente configurado: usa o status da CONSULTA, não o do corpo", async () => {
    vi.mocked(consultarCobrancaAsaas).mockResolvedValue({ sucesso: true, dados: { id: "pay_1", status: "PENDING" } });

    const resposta = await POST(requisicao(EVENTO));

    expect(resposta.status).toBe(200);
    expect(atualizarStatusPedidoPorPagamento).toHaveBeenCalledWith(expect.anything(), "pay_1", "PENDING");
  });

  it.each([404, 400])(
    "cobrança inexistente no ambiente configurado (HTTP %i, ex.: evento do sandbox em produção) → 200 ignorado, nenhum pedido alterado",
    async (statusHttp) => {
      vi.mocked(consultarCobrancaAsaas).mockResolvedValue({ sucesso: false, mensagem: "não encontrada", statusHttp });

      const resposta = await POST(requisicao(EVENTO));

      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toEqual({ recebido: true, ignorado: true });
      expect(atualizarStatusPedidoPorPagamento).not.toHaveBeenCalled();
      expect(registrarEventoIntegracao).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ sucesso: false }));
    },
  );

  it.each([
    ["chave errada (401)", { sucesso: false as const, mensagem: "x", statusHttp: 401 }],
    ["Asaas fora do ar (503)", { sucesso: false as const, mensagem: "x", statusHttp: 503 }],
    ["rede ou configuração inválida (sem status)", { sucesso: false as const, mensagem: "x" }],
  ])("%s → 500 para o Asaas tentar de novo, nenhum pedido alterado", async (_nome, falha) => {
    vi.mocked(consultarCobrancaAsaas).mockResolvedValue(falha);

    const resposta = await POST(requisicao(EVENTO));

    expect(resposta.status).toBe(500);
    expect(atualizarStatusPedidoPorPagamento).not.toHaveBeenCalled();
  });

  it("consulta devolvendo outra cobrança → ignorado", async () => {
    vi.mocked(consultarCobrancaAsaas).mockResolvedValue({ sucesso: true, dados: { id: "pay_OUTRO", status: "RECEIVED" } });

    const resposta = await POST(requisicao(EVENTO));

    expect(resposta.status).toBe(200);
    expect(atualizarStatusPedidoPorPagamento).not.toHaveBeenCalled();
  });

  it.each([{}, { payment: {} }, { payment: { id: 123 } }])("corpo sem payment.id válido → 400", async (corpo) => {
    const resposta = await POST(requisicao(corpo));
    expect(resposta.status).toBe(400);
    expect(consultarCobrancaAsaas).not.toHaveBeenCalled();
  });
});
