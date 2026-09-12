// APPSEC-003 — confirmar o e-mail abre a sessão, mas não vincula a conta a
// cadastros antigos com o mesmo e-mail.

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ criarClienteSupabaseServidor: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ criarClienteSupabaseAdmin: vi.fn() }));

import { NextRequest } from "next/server";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { GET } from "./route";

describe("confirmação de e-mail sem vínculo (APPSEC-003)", () => {
  it("link válido: redireciona com sessão, sem service_role e sem tocar em clientes", async () => {
    const from = vi.fn();
    vi.mocked(criarClienteSupabaseServidor).mockResolvedValue({
      auth: {
        verifyOtp: vi.fn(async () => ({ error: null })),
        getUser: vi.fn(async () => ({ data: { user: { id: "usuario", email: "comprador-antigo@exemplo.com" } } })),
      },
      from,
    } as never);

    const resposta = await GET(new NextRequest("http://localhost/auth/confirm?token_hash=abc&type=email&next=/conta"));

    expect(resposta.headers.get("location")).toBe("http://localhost/conta");
    expect(criarClienteSupabaseAdmin).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});
