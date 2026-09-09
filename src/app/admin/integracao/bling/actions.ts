"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { buscarTodosProdutosBling } from "@/lib/integracoes/bling-api";
import { enviarPedidoParaBling } from "@/lib/integracoes/bling-pedidos";
import { PROVEDOR_BLING } from "@/lib/integracoes/bling";
import { obterOuCriarCategoriaPadrao, obterOuCriarMarcaPadrao } from "@/lib/produtos/padroes";
import { registrarEventoIntegracao } from "@/lib/integracoes/eventos";
import { aplicarDetalheProdutoBling } from "@/lib/integracoes/aplicar-produto-bling";
import type { Produto } from "@/types/database";

// Server Actions da seção "Integrações" do /admin: sincronização manual de
// estoque com o Bling (Parte B) e reenvio manual de um pedido pago que
// falhou ao sincronizar (Parte C). Usam a service_role key porque, apesar
// de rodarem a partir do /admin (autenticado), o restante da leitura/escrita
// de "produtos"/"pedidos" nesse fluxo já segue esse padrão no projeto.

export interface ProdutoCriadoResumo {
  sku: string;
  nome: string;
  precoZerado: boolean;
}

export interface ResultadoSincronizacaoBling {
  sucesso: boolean;
  mensagem?: string;
  atualizados: number;
  criados: ProdutoCriadoResumo[];
}

const RESULTADO_ERRO = (mensagem: string): ResultadoSincronizacaoBling => ({
  sucesso: false,
  mensagem,
  atualizados: 0,
  criados: [],
});

// Espaçamento proativo entre chamadas de detalhe (GET /produtos/{id}) —
// uma por produto NOVO criado nesta sincronização. O limite do Bling é 3
// req/s (ver bling-api.ts); 350ms de intervalo fica com folga sem
// depender só do retry reativo em 429, que existe mas só ajuda depois do
// limite já ter sido estourado.
const INTERVALO_ENTRE_DETALHES_MS = 350;

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Busca todos os produtos do Bling. Para cada um cujo código (SKU) já bate
 * com um produto local, atualiza o estoque — nunca recria. Para um produto
 * que existe no Bling mas ainda não localmente, CRIA um novo produto aqui,
 * sempre INATIVO (não aparece na loja) e com categoria/peso/dimensões em
 * valores padrão — fica marcado para revisão manual no /admin/produtos
 * antes de ativar.
 *
 * DECISÃO TEMPORÁRIA sobre a direção do estoque: "o Bling é a fonte de
 * verdade" só vale de verdade quando o Bling também DESCONTA estoque nas
 * vendas — e hoje ele só desconta na emissão de NF-e / mudança de situação
 * do pedido, nenhuma das duas implementada ainda aqui. Enquanto isso, uma
 * venda no nosso site desconta o estoque local (checkout, RPC
 * descontar_estoque) sem o Bling nunca ficar sabendo.
 *
 * Isso descarta comparar o valor do Bling direto contra o estoque local
 * atual (`estoqueBling > local.estoque`): depois de QUALQUER venda local,
 * o estoque do Bling (que não mudou) quase sempre vai ser maior que o
 * local (que acabou de cair) — a sincronização reverteria a venda de
 * volta pro valor de antes, todas as vezes. Foi exatamente isso que
 * apagou a venda real do ROL-6204-2RS-GBR (corrigido manualmente uma
 * única vez via SQL, não por este código).
 *
 * Por isso comparamos contra `bling_estoque_ultimo_sincronizado` — o que o
 * Bling reportava na ÚLTIMA sincronização, não o estoque local agora — e
 * só aplicamos a PARTE QUE SUBIU desde então (delta positivo = reposição
 * de mercadoria no Bling). Uma queda no Bling (ou nenhuma mudança) nunca
 * mexe no estoque local, que continua refletindo as vendas feitas aqui.
 *
 * TODO: quando o fluxo de NF-e existir e o Bling passar a deduzir estoque
 * de verdade a cada venda (local ou não), reavaliar se volta a valer
 * "Bling sempre vence" (sobrescrever com o valor absoluto do Bling,
 * inclusive quedas) — nesse momento o Bling passa a ser fonte de verdade
 * completa e esse cálculo de delta deixa de ser necessário.
 */
export async function sincronizarEstoqueBling(): Promise<ResultadoSincronizacaoBling> {
  const supabase = criarClienteSupabaseAdmin();

  const produtosBling = await buscarTodosProdutosBling(supabase);
  if (!produtosBling.sucesso) {
    await registrarEventoIntegracao(supabase, {
      provedor: "bling",
      evento: "sincronizar_estoque",
      sucesso: false,
      mensagemErro: produtosBling.mensagem,
    });
    return RESULTADO_ERRO(produtosBling.mensagem);
  }

  const { data: produtosLocais, error } = await supabase
    .from("produtos")
    .select("id, sku, estoque, bling_estoque_ultimo_sincronizado")
    .returns<Pick<Produto, "id" | "sku" | "estoque" | "bling_estoque_ultimo_sincronizado">[]>();

  if (error) {
    return RESULTADO_ERRO(`Erro ao ler produtos locais: ${error.message}`);
  }

  const mapaPorSku = new Map((produtosLocais ?? []).map((produto) => [produto.sku, produto]));

  let atualizados = 0;
  const criados: ProdutoCriadoResumo[] = [];

  // Só busca/cria a categoria e marca padrão ("Sem categoria"/"Sem marca")
  // se algum produto novo realmente precisar delas — a maioria das
  // sincronizações não cria produto nenhum (só atualiza estoque).
  let categoriaPadraoId: string | null = null;
  let marcaPadraoId: string | null = null;

  for (const produtoBling of produtosBling.dados) {
    if (!produtoBling.codigo) continue;

    const estoqueBling = Math.max(0, Math.round(produtoBling.estoque?.saldoVirtualTotal ?? 0));
    const local = mapaPorSku.get(produtoBling.codigo);

    if (local) {
      // Se nunca sincronizamos este produto antes (coluna nula), usa o
      // estoque local atual como base — evita um delta falso na primeira
      // vez que essa lógica roda para um produto já existente.
      const ultimoConhecido = local.bling_estoque_ultimo_sincronizado ?? local.estoque;
      const delta = estoqueBling - ultimoConhecido;

      if (delta > 0) {
        await supabase
          .from("produtos")
          .update({
            estoque: local.estoque + delta,
            bling_produto_id: produtoBling.id,
            bling_estoque_ultimo_sincronizado: estoqueBling,
          })
          .eq("id", local.id);
        atualizados++;
      } else {
        // Sem reposição de verdade no Bling — não mexe no estoque local,
        // só atualiza a referência e o "último valor visto" (pra próxima
        // comparação usar o valor certo, mesmo sem ter aplicado nada agora).
        await supabase
          .from("produtos")
          .update({ bling_produto_id: produtoBling.id, bling_estoque_ultimo_sincronizado: estoqueBling })
          .eq("id", local.id);
      }
      continue;
    }

    const precoZerado = typeof produtoBling.preco !== "number" || produtoBling.preco <= 0;

    categoriaPadraoId ??= await obterOuCriarCategoriaPadrao(supabase);
    marcaPadraoId ??= await obterOuCriarMarcaPadrao(supabase);

    const { data: produtoCriado, error: erroInsert } = await supabase
      .from("produtos")
      .insert({
        sku: produtoBling.codigo,
        nome: produtoBling.nome,
        categoria_id: categoriaPadraoId,
        marca_id: marcaPadraoId,
        descricao: null,
        atributos: {},
        preco: precoZerado ? 0 : produtoBling.preco,
        estoque: estoqueBling,
        // ESSENCIAL: nunca aparece na loja até o admin revisar (categoria,
        // preço se veio zerado, peso/dimensões reais, fotos, descrição).
        ativo: false,
        peso_kg: 1,
        altura_cm: 10,
        largura_cm: 10,
        comprimento_cm: 10,
        bling_produto_id: produtoBling.id,
        bling_estoque_ultimo_sincronizado: estoqueBling,
      })
      .select("id")
      .single<{ id: string }>();

    if (!erroInsert && produtoCriado) {
      criados.push({ sku: produtoBling.codigo, nome: produtoBling.nome, precoZerado });

      // Melhor esforço: busca descrição/imagens/marca/EAN/NCM completos do
      // Bling (o endpoint de lista usado acima não traz isso, só o de
      // detalhe — ver aplicarDetalheProdutoBling). Uma chamada extra por
      // produto NOVO apenas — nunca para os já existentes, que só têm o
      // estoque atualizado acima.
      const resultadoDetalhe = await aplicarDetalheProdutoBling(supabase, produtoCriado.id, produtoBling.id);
      await aguardar(INTERVALO_ENTRE_DETALHES_MS);
      if (!resultadoDetalhe.sucesso) {
        await registrarEventoIntegracao(supabase, {
          provedor: "bling",
          evento: "sincronizar_estoque",
          sucesso: false,
          mensagemErro: `Produto "${produtoBling.codigo}" criado, mas falhou ao buscar detalhe (descrição/imagens) no Bling: ${resultadoDetalhe.mensagem}`,
        });
      }
    } else if (erroInsert) {
      await registrarEventoIntegracao(supabase, {
        provedor: "bling",
        evento: "sincronizar_estoque",
        sucesso: false,
        mensagemErro: `Falha ao criar produto local para o SKU "${produtoBling.codigo}": ${erroInsert.message}`,
      });
    }
  }

  await supabase
    .from("integracoes")
    .update({ ultima_sincronizacao: new Date().toISOString() })
    .eq("provedor", PROVEDOR_BLING);

  await registrarEventoIntegracao(supabase, {
    provedor: "bling",
    evento: "sincronizar_estoque",
    sucesso: true,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");

  return { sucesso: true, atualizados, criados };
}

export interface ResultadoReenvioBling {
  sucesso: boolean;
  mensagem?: string;
}

/** Tenta enviar de novo um pedido pago que falhou ao sincronizar com o Bling. */
export async function reenviarPedidoParaBlingAction(pedidoId: string): Promise<ResultadoReenvioBling> {
  const supabase = criarClienteSupabaseAdmin();

  await enviarPedidoParaBling(supabase, pedidoId);
  revalidatePath("/admin");

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("bling_sincronizado, bling_erro_sincronizacao")
    .eq("id", pedidoId)
    .maybeSingle<{ bling_sincronizado: boolean; bling_erro_sincronizacao: string | null }>();

  if (pedido?.bling_sincronizado) {
    return { sucesso: true };
  }

  return { sucesso: false, mensagem: pedido?.bling_erro_sincronizacao ?? "Falha desconhecida ao sincronizar." };
}
