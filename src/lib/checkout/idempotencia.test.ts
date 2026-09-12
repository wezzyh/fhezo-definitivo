import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ criarClienteSupabaseAdmin: vi.fn() }));
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { executarUmaVez } from "./idempotencia";
let registros: Map<string, { estado: string; resultado?: unknown }>;
beforeEach(() => {
  registros = new Map();
  vi.mocked(criarClienteSupabaseAdmin).mockReturnValue({
    from: () => ({
      insert: async ({ id }: { id: string }) => {
        if (registros.has(id)) return { error: { code: "23505" } };
        registros.set(id, { estado: "processando" });
        return { error: null };
      },
      select: () => ({
        eq: (_c: string, id: string) => ({
          maybeSingle: async () => ({ data: registros.get(id) }),
        }),
      }),
      update: (dados: object) => ({
        eq: async (_c: string, id: string) => {
          registros.set(id, { ...registros.get(id)!, ...dados });
          return { error: null };
        },
      }),
      delete: () => ({
        eq: async (_c: string, id: string) => {
          registros.delete(id);
          return { error: null };
        },
      }),
    }),
  } as never);
});
describe("tentativa persistente de checkout", () => {
  it("dois cliques simultâneos executam a cobrança uma única vez", async () => {
    let concluir!: (v: { sucesso: true; pedidoId: string }) => void;
    const executar = vi.fn(
      () =>
        new Promise<{ sucesso: true; pedidoId: string }>((r) => {
          concluir = r;
        }),
    );
    const primeira = executarUmaVez("chave", executar);
    await Promise.resolve();
    const segunda = await executarUmaVez("chave", executar);
    expect(segunda).toMatchObject({ sucesso: false, bloqueado: true });
    concluir({ sucesso: true, pedidoId: "pedido" });
    expect(await primeira).toEqual({ sucesso: true, pedidoId: "pedido" });
    expect(await executarUmaVez("chave", executar)).toEqual({
      sucesso: true,
      pedidoId: "pedido",
    });
    expect(executar).toHaveBeenCalledTimes(1);
  });
  it("uma falha conhecida antes da cobrança permite tentar novamente", async () => {
    const executar = vi
      .fn()
      .mockResolvedValueOnce({ sucesso: false, mensagem: "Frete indisponível" })
      .mockResolvedValueOnce({ sucesso: true, pedidoId: "pedido" });
    await executarUmaVez("chave", executar);
    await executarUmaVez("chave", executar);
    expect(executar).toHaveBeenCalledTimes(2);
  });
  it("timeout conserva a trava e não executa outra cobrança", async () => {
    const executar = vi.fn().mockRejectedValue(new Error("timeout"));
    expect(await executarUmaVez("chave", executar)).toMatchObject({
      bloqueado: true,
    });
    await executarUmaVez("chave", executar);
    expect(executar).toHaveBeenCalledTimes(1);
  });
  it("cobrança incerta preserva a resposta para conciliação", async () => {
    const executar = vi
      .fn()
      .mockResolvedValue({
        sucesso: false,
        bloqueado: true,
        mensagem: "Conferir cobrança",
      });
    await executarUmaVez("chave", executar);
    expect(await executarUmaVez("chave", executar)).toMatchObject({
      bloqueado: true,
      mensagem: "Conferir cobrança",
    });
    expect(executar).toHaveBeenCalledTimes(1);
  });
  it("tabela indisponível bloqueia a cobrança antes de qualquer efeito", async () => {
    vi.mocked(criarClienteSupabaseAdmin).mockReturnValue({
      from: () => ({ insert: async () => ({ error: { code: "42P01" } }) }),
    } as never);
    const executar = vi.fn();
    expect(await executarUmaVez("chave", executar)).toMatchObject({
      sucesso: false,
      bloqueado: true,
    });
    expect(executar).not.toHaveBeenCalled();
  });
});
