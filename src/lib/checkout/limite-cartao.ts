import "server-only";
import { createHash } from "node:crypto";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";

// Reservas atômicas na tabela já protegida por RLS. Somente hashes e prazo;
// nenhum documento, IP em claro ou dado do cartão é persistido.
// São registros distintos das chaves de idempotência dos pedidos.
export async function permitirTentativaCartao(
  conta: string,
  ip: string,
  agora = Date.now(),
): Promise<boolean> {
  const janela = Math.floor(agora / (15 * 60_000));
  const banco = criarClienteSupabaseAdmin();
  for (const [escopo, valor, limite] of [
    ["conta", conta, 5],
    ["ip", ip, 20],
  ] as const) {
    let reservado = false;
    for (let slot = 0; slot < limite; slot++) {
      const hash = createHash("sha256")
        .update(
          JSON.stringify(["limite-cartao-v1", escopo, valor, janela, slot]),
        )
        .digest("hex");
      const id = [
        hash.slice(0, 8),
        hash.slice(8, 12),
        hash.slice(12, 16),
        hash.slice(16, 20),
        hash.slice(20, 32),
      ].join("-");
      const { error } = await banco.from("checkout_tentativas").insert({
        id,
        estado: "concluido",
        resultado: {
          tipo: "limite-cartao",
          expiraEm: new Date((janela + 1) * 15 * 60_000).toISOString(),
        },
      });
      if (!error) {
        reservado = true;
        break;
      }
      if (error.code !== "23505") return false;
    }
    if (!reservado) return false;
  }
  return true;
}
