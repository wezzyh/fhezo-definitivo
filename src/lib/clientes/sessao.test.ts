// APPSEC-003/004 — a identidade do cliente vem só de auth.uid() →
// clientes.auth_user_id. Nenhum outro dado (e-mail, CPF/CNPJ) decide quem é
// o cliente da sessão.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ criarClienteSupabaseServidor: vi.fn() }));

import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { obterClienteLogado } from "./sessao";

const CLIENTE = { id: "cliente-a", auth_user_id: "usuario-a", email: "a@exemplo.com" };

/** Dublê do Supabase: guarda as tabelas e os filtros de cada consulta. */
function prepararSessao(usuario: { id: string; email?: string } | null, cliente: object | null = CLIENTE) {
  const tabelas: string[] = [];
  const filtros: [string, unknown][] = [];
  vi.mocked(criarClienteSupabaseServidor).mockResolvedValue({
    auth: { getUser: vi.fn(async () => ({ data: { user: usuario } })) },
    from: (tabela: string) => {
      tabelas.push(tabela);
      const q = {
        select: () => q,
        eq: (coluna: string, valor: unknown) => {
          filtros.push([coluna, valor]);
          return q;
        },
        maybeSingle: async () => ({ data: cliente, error: null }),
      };
      return q;
    },
  } as never);
  return { tabelas, filtros };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("cliente da sessão (APPSEC-003/004)", () => {
  it("sem usuário autenticado: null, sem consultar clientes", async () => {
    const { tabelas } = prepararSessao(null);
    expect(await obterClienteLogado()).toBeNull();
    expect(tabelas).toEqual([]);
  });

  it("usuário sem e-mail: null, sem consultar clientes", async () => {
    const { tabelas } = prepararSessao({ id: "usuario-a" });
    expect(await obterClienteLogado()).toBeNull();
    expect(tabelas).toEqual([]);
  });

  it("busca a linha SÓ por auth_user_id = id do usuário — nunca por e-mail ou documento", async () => {
    const { tabelas, filtros } = prepararSessao({ id: "usuario-a", email: "a@exemplo.com" });
    expect(await obterClienteLogado()).toEqual({ userId: "usuario-a", email: "a@exemplo.com", cliente: CLIENTE });
    expect(tabelas).toEqual(["clientes"]);
    expect(filtros).toEqual([["auth_user_id", "usuario-a"]]);
  });

  it("conta sem linha em clientes: cliente null (nada é criado nem vinculado)", async () => {
    const { tabelas } = prepararSessao({ id: "usuario-novo", email: "comprador-antigo@exemplo.com" }, null);
    expect(await obterClienteLogado()).toEqual({
      userId: "usuario-novo",
      email: "comprador-antigo@exemplo.com",
      cliente: null,
    });
    expect(tabelas).toEqual(["clientes"]);
  });
});
