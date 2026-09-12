"use server";
import { z } from "zod";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { cotarFreteMelhorEnvio } from "@/lib/frete/cotacao";
import type { ItemCarrinho } from "@/lib/carrinho/reducer";
import type { Produto } from "@/types/database";
const esquema = z
  .array(
    z.object({
      produtoId: z.string().uuid(),
      quantidade: z.number().int().min(1).max(100000),
    }),
  )
  .min(1)
  .max(100);
export async function consultarCarrinho(
  entrada: { produtoId: string; quantidade: number }[],
): Promise<
  | { sucesso: true; itens: ItemCarrinho[] }
  | { sucesso: false; mensagem: string }
> {
  const validacao = esquema.safeParse(entrada);
  if (!validacao.success)
    return {
      sucesso: false,
      mensagem:
        "Carrinho inválido. Remova os itens inválidos ou limpe o carrinho.",
    };
  try {
    const supabase = criarClienteSupabaseAdmin();
    const { data, error } = await supabase
      .from("produtos")
      .select(
        "id,nome,sku,preco,estoque,ativo,peso_kg,altura_cm,largura_cm,comprimento_cm,imagem_url",
      )
      .in(
        "id",
        validacao.data.map((i) => i.produtoId),
      )
      .returns<Produto[]>();
    if (error) throw error;
    const mapa = new Map((data ?? []).map((p) => [p.id, p]));
    const itens: ItemCarrinho[] = validacao.data.map((i) => {
      const p = mapa.get(i.produtoId);
      if (!p)
        return {
          ...i,
          nome: "Produto indisponível",
          sku: "",
          preco: 0,
          estoque: 0,
          pesoKg: 0,
          alturaCm: 0,
          larguraCm: 0,
          comprimentoCm: 0,
        };
      return {
        ...i,
        nome: p.nome,
        sku: p.sku,
        preco: p.preco,
        estoque: p.ativo ? p.estoque : 0,
        pesoKg: p.peso_kg,
        alturaCm: p.altura_cm,
        larguraCm: p.largura_cm,
        comprimentoCm: p.comprimento_cm,
        imagemUrl: p.imagem_url,
      };
    });
    return { sucesso: true, itens };
  } catch {
    return {
      sucesso: false,
      mensagem:
        "Não foi possível atualizar os preços e o estoque. Tente novamente.",
    };
  }
}
export async function cotarFreteCheckout(
  cep: string,
  entrada: { produtoId: string; quantidade: number }[],
) {
  if (
    !/^\d{8}$/.test(cep.replace(/\D/g, "")) ||
    /^0+$/.test(cep.replace(/\D/g, ""))
  )
    return {
      sucesso: false as const,
      mensagem: "Informe um CEP válido com 8 dígitos.",
    };
  const carrinho = await consultarCarrinho(entrada);
  if (!carrinho.sucesso) return carrinho;
  if (carrinho.itens.some((i) => i.quantidade > i.estoque))
    return {
      sucesso: false as const,
      mensagem:
        "Ajuste os produtos sem estoque suficiente antes de calcular o frete.",
    };
  return cotarFreteMelhorEnvio(
    cep,
    carrinho.itens.map((i) => ({
      id: i.produtoId,
      quantidade: i.quantidade,
      valorUnitario: i.preco,
      pesoKg: i.pesoKg,
      alturaCm: i.alturaCm,
      larguraCm: i.larguraCm,
      comprimentoCm: i.comprimentoCm,
    })),
  );
}
