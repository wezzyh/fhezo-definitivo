"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { removerImagemAdminSeOrfa } from "@/components/admin/upload-imagem-actions";
import type { ProdutoImagem } from "@/types/database";

// Galeria de fotos adicionais de um produto (produto_imagens) — separada
// do campo "Imagem principal" (produtos.imagem_url, continua gerenciado
// direto no formulário grande de sempre). Cada ação aqui grava
// imediatamente (sem esperar o botão "Salvar" do formulário do produto),
// mesmo padrão de mover categoria/marca (ver botao-mover-categoria.tsx) —
// evita ter que serializar a galeria inteira dentro do FormData do
// formulário principal.

export interface ResultadoGaleria {
  sucesso: boolean;
  erro?: string;
}

export async function adicionarImagemGaleria(produtoId: string, url: string): Promise<ResultadoGaleria> {
  const supabase = await criarClienteSupabaseServidor();

  const { count } = await supabase
    .from("produto_imagens")
    .select("id", { count: "exact", head: true })
    .eq("produto_id", produtoId);

  const { error } = await supabase.from("produto_imagens").insert({
    produto_id: produtoId,
    url,
    posicao: count ?? 0,
    capa: false,
  });

  if (error) return { sucesso: false, erro: error.message };

  revalidatePath(`/admin/produtos/${produtoId}/editar`);
  revalidatePath(`/produtos/${produtoId}`);
  return { sucesso: true };
}

export async function removerImagemGaleria(imagemId: string): Promise<ResultadoGaleria> {
  const supabase = await criarClienteSupabaseServidor();

  const { data: imagem } = await supabase
    .from("produto_imagens")
    .select("produto_id, url")
    .eq("id", imagemId)
    .maybeSingle<Pick<ProdutoImagem, "produto_id" | "url">>();

  if (!imagem) return { sucesso: false, erro: "Imagem não encontrada." };

  const { error } = await supabase.from("produto_imagens").delete().eq("id", imagemId);
  if (error) return { sucesso: false, erro: error.message };

  await removerImagemAdminSeOrfa(imagem.url, null);

  revalidatePath(`/admin/produtos/${imagem.produto_id}/editar`);
  revalidatePath(`/produtos/${imagem.produto_id}`);
  return { sucesso: true };
}

export async function moverImagemGaleria(produtoId: string, imagemId: string, direcao: -1 | 1): Promise<ResultadoGaleria> {
  const supabase = await criarClienteSupabaseServidor();

  const { data: imagens } = await supabase
    .from("produto_imagens")
    .select("id, posicao")
    .eq("produto_id", produtoId)
    .order("posicao", { ascending: true })
    .returns<Pick<ProdutoImagem, "id" | "posicao">[]>();

  if (!imagens) return { sucesso: false, erro: "Galeria não encontrada." };

  const indiceAtual = imagens.findIndex((imagem) => imagem.id === imagemId);
  const indiceVizinha = indiceAtual + direcao;
  if (indiceAtual === -1 || indiceVizinha < 0 || indiceVizinha >= imagens.length) {
    return { sucesso: true };
  }

  const atual = imagens[indiceAtual];
  const vizinha = imagens[indiceVizinha];

  await Promise.all([
    supabase.from("produto_imagens").update({ posicao: vizinha.posicao }).eq("id", atual.id),
    supabase.from("produto_imagens").update({ posicao: atual.posicao }).eq("id", vizinha.id),
  ]);

  revalidatePath(`/admin/produtos/${produtoId}/editar`);
  revalidatePath(`/produtos/${produtoId}`);
  return { sucesso: true };
}
