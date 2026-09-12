import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));

import { descontarEstoqueItens, reverterEstoqueItens } from "./estoque";

const PRODUTO_A = "11111111-1111-4111-8111-111111111111";
const PRODUTO_B = "22222222-2222-4222-8222-222222222222";

const rpc = vi.fn();
const supabase = { rpc } as unknown as SupabaseClient;

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: true, error: null });
});

describe("descontarEstoqueItens (APPSEC-002, defesa em profundidade)", () => {
  it.each([-5, 0, 1.5, Number.NaN])("não chama o banco com quantidade %s", async (quantidade) => {
    const resultado = await descontarEstoqueItens(supabase, [{ produtoId: PRODUTO_A, quantidade }]);
    expect(resultado).toEqual({ sucesso: false, produtoIdSemEstoque: PRODUTO_A });
    expect(rpc).not.toHaveBeenCalledWith("descontar_estoque", expect.anything());
  });

  it("desfaz o que já descontou quando um item seguinte é inválido", async () => {
    const resultado = await descontarEstoqueItens(supabase, [
      { produtoId: PRODUTO_A, quantidade: 2 },
      { produtoId: PRODUTO_B, quantidade: -1 },
    ]);
    expect(resultado.sucesso).toBe(false);
    expect(rpc).toHaveBeenCalledWith("descontar_estoque", { produto_id: PRODUTO_A, quantidade: 2 });
    expect(rpc).toHaveBeenCalledWith("reverter_estoque", { produto_id: PRODUTO_A, quantidade: 2 });
    expect(rpc).not.toHaveBeenCalledWith("descontar_estoque", { produto_id: PRODUTO_B, quantidade: -1 });
  });

  it("desconta normalmente quantidades válidas", async () => {
    const resultado = await descontarEstoqueItens(supabase, [{ produtoId: PRODUTO_A, quantidade: 3 }]);
    expect(resultado).toEqual({ sucesso: true });
    expect(rpc).toHaveBeenCalledWith("descontar_estoque", { produto_id: PRODUTO_A, quantidade: 3 });
  });
});

describe("reverterEstoqueItens", () => {
  it("ignora quantidade inválida (reverter negativo DIMINUIRIA o estoque)", async () => {
    await reverterEstoqueItens(supabase, [
      { produtoId: PRODUTO_A, quantidade: -4 },
      { produtoId: PRODUTO_B, quantidade: 2 },
    ]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("reverter_estoque", { produto_id: PRODUTO_B, quantidade: 2 });
  });
});
