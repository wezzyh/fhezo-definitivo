// APPSEC-003 — login não vincula a conta a cadastros antigos pelo e-mail.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ criarClienteSupabaseServidor: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ criarClienteSupabaseAdmin: vi.fn() }));

import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { entrarCliente } from "./actions";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("login sem vínculo por e-mail (APPSEC-003)", () => {
  it("entrar com o e-mail de uma compra antiga sem conta não usa service_role nem toca em clientes", async () => {
    const from = vi.fn();
    vi.mocked(criarClienteSupabaseServidor).mockResolvedValue({
      auth: { signInWithPassword: vi.fn(async () => ({ data: { user: { id: "usuario-novo" } }, error: null })) },
      from,
    } as never);
    const formulario = new FormData();
    formulario.set("email", "comprador-antigo@exemplo.com");
    formulario.set("senha", "qualquer-senha");
    formulario.set("proximo", "/conta");

    await entrarCliente({}, formulario);

    expect(criarClienteSupabaseAdmin).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/conta");
  });

  it("o módulo de sessão não oferece mais vínculo automático", async () => {
    const sessao = await import("@/lib/clientes/sessao");
    expect(Object.keys(sessao)).toEqual(["obterClienteLogado"]);
  });
});
