// APPSEC-004 — a identificação do checkout vem só da sessão. Nada que o
// navegador mande escolhe o cliente, e nada aqui grava em "clientes".

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/clientes/sessao", () => ({ obterClienteLogado: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ criarClienteSupabaseAdmin: vi.fn() }));

import { obterClienteLogado } from "@/lib/clientes/sessao";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { carregarIdentificacaoCheckout, salvarClienteCheckout } from "./actions";

const CLIENTE_A = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  tipo: "PF",
  nome: "Maria Silva",
  documento: "52998224725",
  email: "maria@exemplo.com",
  telefone: "11912345678",
  auth_user_id: "usuario-a",
  endereco_cep: "01310100",
  endereco_rua: "Av. Paulista",
  endereco_numero: "1000",
  endereco_complemento: null,
  endereco_bairro: "Bela Vista",
  endereco_cidade: "São Paulo",
  endereco_uf: "SP",
  created_at: "2026-01-01T00:00:00Z",
};
const CLIENTE_B_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(obterClienteLogado).mockResolvedValue({
    userId: "usuario-a",
    email: CLIENTE_A.email,
    cliente: CLIENTE_A,
  } as never);
});

describe("identificação do checkout (APPSEC-004)", () => {
  it("sem sessão: não identifica ninguém", async () => {
    vi.mocked(obterClienteLogado).mockResolvedValue(null);
    expect(await salvarClienteCheckout()).toMatchObject({ sucesso: false });
  });

  it("conta sem cadastro de cliente: encaminha ao suporte, sem criar linha", async () => {
    vi.mocked(obterClienteLogado).mockResolvedValue({ userId: "usuario-a", email: "a@a.com", cliente: null });
    expect(await salvarClienteCheckout()).toMatchObject({
      sucesso: false,
      mensagem: expect.stringContaining("suporte"),
    });
    expect(criarClienteSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("CPF inválido num cadastro antigo: encaminha ao suporte, não a Minha conta (documento não é editável — 0033)", async () => {
    vi.mocked(obterClienteLogado).mockResolvedValue({
      userId: "usuario-a",
      email: CLIENTE_A.email,
      cliente: { ...CLIENTE_A, documento: "111.111.111-11" },
    } as never);
    const resultado = await salvarClienteCheckout();
    expect(resultado).toMatchObject({ sucesso: false, mensagem: expect.stringContaining("suporte") });
    expect(resultado).not.toMatchObject({ mensagem: expect.stringContaining("Minha conta") });
  });

  it("telefone faltando: orienta a corrigir em Minha conta (campo editável pelo cliente)", async () => {
    vi.mocked(obterClienteLogado).mockResolvedValue({
      userId: "usuario-a",
      email: CLIENTE_A.email,
      cliente: { ...CLIENTE_A, telefone: null },
    } as never);
    expect(await salvarClienteCheckout()).toMatchObject({
      sucesso: false,
      mensagem: expect.stringContaining("Minha conta"),
    });
  });

  it("cliente A mandando clienteId e CNPJ de B: ignorado — devolve A e não grava nada", async () => {
    const salvarComoONavegadorQuiser = salvarClienteCheckout as unknown as (
      entrada: unknown,
    ) => ReturnType<typeof salvarClienteCheckout>;

    const resultado = await salvarComoONavegadorQuiser({
      clienteId: CLIENTE_B_ID,
      tipoCliente: "PJ",
      dadosPJ: {
        razaoSocial: "Empresa B",
        cnpj: "11222333000181",
        email: "b@empresa-b.com",
        telefone: "1133334444",
        inscricaoEstadual: "",
      },
    });

    expect(resultado).toEqual({ sucesso: true, clienteId: CLIENTE_A.id });
    expect(criarClienteSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("dados carregados para a tela são os da sessão, sem auth_user_id nem created_at", async () => {
    const resultado = await carregarIdentificacaoCheckout();
    expect(resultado).toMatchObject({ sucesso: true, cliente: { id: CLIENTE_A.id, documento: CLIENTE_A.documento } });
    if (!resultado.sucesso) throw new Error("esperava sucesso");
    expect(resultado.cliente).not.toHaveProperty("auth_user_id");
    expect(resultado.cliente).not.toHaveProperty("created_at");
  });
});
