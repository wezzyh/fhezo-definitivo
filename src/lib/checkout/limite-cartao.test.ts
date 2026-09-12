import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ criarClienteSupabaseAdmin: vi.fn() }));
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { permitirTentativaCartao } from "./limite-cartao";
let registros: Map<string, unknown>;
beforeEach(() => {
  registros = new Map();
  vi.mocked(criarClienteSupabaseAdmin).mockReturnValue({
    from: () => ({
      insert: async (r: { id: string }) => {
        if (registros.has(r.id)) return { error: { code: "23505" } };
        registros.set(r.id, r);
        return { error: null };
      },
    }),
  } as never);
});
it("reservas concorrentes permitem no máximo cinco tentativas por conta", async () => {
  const respostas = await Promise.all(
    Array.from({ length: 12 }, () =>
      permitirTentativaCartao("conta-teste", "203.0.113.10", 0),
    ),
  );
  expect(respostas.filter(Boolean)).toHaveLength(5);
  expect(JSON.stringify([...registros.values()])).not.toContain("203.0.113.10");
  expect(JSON.stringify([...registros.values()])).not.toContain("conta-teste");
  expect(
    await permitirTentativaCartao("conta-teste", "203.0.113.10", 900_000),
  ).toBe(true);
});
it("limita contas diferentes usando o mesmo IP", async () => {
  const respostas = await Promise.all(
    Array.from({ length: 25 }, (_, i) =>
      permitirTentativaCartao("conta-" + i, "203.0.113.10", 0),
    ),
  );
  expect(respostas.filter(Boolean)).toHaveLength(20);
});
it("banco indisponível falha fechado", async () => {
  vi.mocked(criarClienteSupabaseAdmin).mockReturnValue({
    from: () => ({ insert: async () => ({ error: { code: "42P01" } }) }),
  } as never);
  expect(await permitirTentativaCartao("conta", "ip", 0)).toBe(false);
});
