import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarDetalheProdutoBling } from "./bling-api";
import { extrairDadosImportadosBling } from "./bling-produto-detalhe";
import { rehospedarImagensBling } from "./bling-imagens";
import { registrarEventoIntegracao } from "./eventos";
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
    // select real (não head:true) — um select com head:true não devolve
    // corpo nenhum na resposta (HTTP 204), então um erro real (ex.: tabela
    // fora do cache de schema do PostgREST) passava batido como "0
    // imagens, count: null", em vez de aparecer como erro. Foi exatamente
    // isso que mascarou a falha de imagem por um tempo.
    const { data: imagensExistentes, error: erroConsulta } = await supabase
      .from("produto_imagens")
      .select("id")
      .eq("produto_id", produtoId);

    if (erroConsulta) {
      await registrarEventoIntegracao(supabase, {
        provedor: "bling",
        evento: "importar_detalhe_produto",
        sucesso: false,
        mensagemErro: `Produto Bling ${blingProdutoId}: erro ao consultar galeria de imagens existente: ${erroConsulta.message}`,
      });
      return {
        sucesso: false,
        mensagem: `Erro ao consultar galeria de imagens: ${erroConsulta.message}`,
        camposPreenchidos,
      };
    }

    if (!imagensExistentes || imagensExistentes.length === 0) {
      // As URLs do Bling (sobretudo as "internas") são links assinados que
      // expiram em ~7 dias — baixa e re-hospeda no nosso Storage antes de
      // gravar, em vez de guardar a URL crua (ver rehospedarImagensBling).
      const { urls: imagensRehospedadas, falhas: falhasDownload } = await rehospedarImagensBling(
        supabase,
        dados.imagens,
      );

      if (imagensRehospedadas.length === 0) {
        await registrarEventoIntegracao(supabase, {
          provedor: "bling",
          evento: "importar_detalhe_produto",
          sucesso: false,
          mensagemErro: `Produto Bling ${blingProdutoId}: falha ao baixar/re-hospedar todas as ${dados.imagens.length} imagem(ns) encontradas.`,
        });
        return {
          sucesso: false,
          mensagem: "O Bling tem imagens para este produto, mas nenhuma pôde ser baixada/re-hospedada agora.",
          camposPreenchidos,
        };
      }

      const linhas = imagensRehospedadas.map((url, indice) => ({
        produto_id: produtoId,
        url,
        posicao: indice,
        capa: indice === 0,
      }));
      const { error: erroImagens } = await supabase.from("produto_imagens").insert(linhas);

      if (erroImagens) {
        await registrarEventoIntegracao(supabase, {
          provedor: "bling",
          evento: "importar_detalhe_produto",
          sucesso: false,
          mensagemErro: `Produto Bling ${blingProdutoId}: falha ao salvar ${imagensRehospedadas.length} imagem(ns) na galeria: ${erroImagens.message}`,
        });
        return {
          sucesso: false,
          mensagem: `Erro ao salvar imagens: ${erroImagens.message}`,
          camposPreenchidos,
        };
      }

      camposPreenchidos.push(
        `${imagensRehospedadas.length} ${imagensRehospedadas.length > 1 ? "imagens" : "imagem"}`,
      );
      if (!produtoAtual.imagem_url) {
        await supabase.from("produtos").update({ imagem_url: imagensRehospedadas[0] }).eq("id", produtoId);
      }

      // Sucesso parcial (baixou/salvou algumas, mas não todas) — não é
      // motivo pra marcar a função inteira como falha (o que deu certo
      // foi salvo), mas fica registrado pra não desaparecer sem rastro.
      if (falhasDownload > 0) {
        await registrarEventoIntegracao(supabase, {
          provedor: "bling",
          evento: "importar_detalhe_produto",
          sucesso: false,
          mensagemErro: `Produto Bling ${blingProdutoId}: ${falhasDownload} de ${dados.imagens.length} imagem(ns) não puderam ser baixadas/re-hospedadas (as demais foram salvas normalmente).`,
        });
      }
    }
  }

  return { sucesso: true, camposPreenchidos };
}
