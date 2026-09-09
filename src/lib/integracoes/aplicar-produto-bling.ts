import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarDetalheProdutoBling } from "./bling-api";
import { extrairDadosImportadosBling } from "./bling-produto-detalhe";
import { obterOuCriarMarcaPorNome, obterOuCriarMarcaPadrao } from "@/lib/produtos/padroes";
import type { Produto } from "@/types/database";

const PESO_KG_PADRAO_FABRICA = 1;

export interface ResultadoAplicarBling {
  sucesso: boolean;
  mensagem?: string;
  /** O que efetivamente mudou — usado pra mostrar feedback no admin (ex.: "3 imagens, descrição, marca importadas"). */
  camposPreenchidos: string[];
}

/**
 * Busca o detalhe de um produto no Bling e preenche, no produto LOCAL, só
 * os campos que ainda estiverem vazios/no valor padrão de fábrica — nunca
 * sobrescreve o que o admin já editou manualmente. Usada tanto ao criar um
 * produto novo durante a sincronização de estoque (src/app/admin/integracao/bling/actions.ts)
 * quanto pelo botão manual "Importar do Bling" na edição de um produto já
 * existente (pra corrigir produtos importados antes desta função existir).
 */
export async function aplicarDetalheProdutoBling(
  supabase: SupabaseClient,
  produtoId: string,
  blingProdutoId: number,
): Promise<ResultadoAplicarBling> {
  const resultadoDetalhe = await buscarDetalheProdutoBling(supabase, blingProdutoId);
  if (!resultadoDetalhe.sucesso) {
    return { sucesso: false, mensagem: resultadoDetalhe.mensagem, camposPreenchidos: [] };
  }

  const dados = extrairDadosImportadosBling(resultadoDetalhe.dados);

  const { data: produtoAtual } = await supabase
    .from("produtos")
    .select("descricao, marca_id, ean, ncm, peso_kg, imagem_url")
    .eq("id", produtoId)
    .maybeSingle<Pick<Produto, "descricao" | "marca_id" | "ean" | "ncm" | "peso_kg" | "imagem_url">>();

  if (!produtoAtual) {
    return { sucesso: false, mensagem: "Produto não encontrado.", camposPreenchidos: [] };
  }

  const camposPreenchidos: string[] = [];
  const atualizacoes: Record<string, unknown> = {};

  if (!produtoAtual.descricao && dados.descricao) {
    atualizacoes.descricao = dados.descricao;
    camposPreenchidos.push("descrição");
  }

  if (dados.ean && !produtoAtual.ean) {
    atualizacoes.ean = dados.ean;
    camposPreenchidos.push("EAN");
  }

  if (dados.ncm && !produtoAtual.ncm) {
    atualizacoes.ncm = dados.ncm;
    camposPreenchidos.push("NCM");
  }

  if (dados.pesoKg && produtoAtual.peso_kg === PESO_KG_PADRAO_FABRICA) {
    atualizacoes.peso_kg = dados.pesoKg;
    camposPreenchidos.push("peso");
  }

  if (dados.marcaNome) {
    const marcaPadraoId = await obterOuCriarMarcaPadrao(supabase);
    if (produtoAtual.marca_id === marcaPadraoId) {
      const marcaId = await obterOuCriarMarcaPorNome(supabase, dados.marcaNome);
      if (marcaId) {
        atualizacoes.marca_id = marcaId;
        camposPreenchidos.push("marca");
      }
    }
  }

  if (Object.keys(atualizacoes).length > 0) {
    const { error } = await supabase.from("produtos").update(atualizacoes).eq("id", produtoId);
    if (error) {
      return { sucesso: false, mensagem: `Erro ao salvar dados importados: ${error.message}`, camposPreenchidos: [] };
    }
  }

  if (dados.imagens.length > 0) {
    const { count } = await supabase
      .from("produto_imagens")
      .select("id", { count: "exact", head: true })
      .eq("produto_id", produtoId);

    if (!count) {
      const linhas = dados.imagens.map((url, indice) => ({
        produto_id: produtoId,
        url,
        posicao: indice,
        capa: indice === 0,
      }));
      const { error: erroImagens } = await supabase.from("produto_imagens").insert(linhas);
      if (!erroImagens) {
        camposPreenchidos.push(`${dados.imagens.length} imagem${dados.imagens.length > 1 ? "s" : ""}`);
        if (!produtoAtual.imagem_url) {
          await supabase.from("produtos").update({ imagem_url: dados.imagens[0] }).eq("id", produtoId);
        }
      }
    }
  }

  return { sucesso: true, camposPreenchidos };
}
