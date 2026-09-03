"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { buscarIdMarcaPadrao, buscarIdCategoriaPadrao } from "@/lib/produtos/padroes";
import { encontrarDuplicatas, type IdentificadoresProduto } from "@/lib/produtos/duplicatas";
import { normalizarProblemasAtivos, construirTermosOr } from "@/lib/produtos/filtros";

// Ações em massa da listagem /admin/produtos (ver tabela-produtos.tsx).
// Regra de segurança em toda função aqui: os IDs e valores que chegam do
// client (seleção de checkboxes, formulário da barra de ações) NUNCA são
// aplicados direto — sempre revalidados contra o banco primeiro (produto
// realmente existe? marca/categoria realmente existem? qual o estoque
// ATUAL de cada produto, pra calcular soma/subtração?).

export interface ResultadoAcaoEmMassa {
  sucesso: boolean;
  mensagem?: string;
  afetados: number;
}

// Trava de sanidade — nunca confiar num array de tamanho arbitrário vindo
// do client, mesmo que "selecionar todos os resultados do filtro" também
// respeite esse limite ao montar a seleção.
const LIMITE_IDS_POR_ACAO = 500;

function validarIds(idsBrutos: unknown): string[] | { erro: string } {
  if (!Array.isArray(idsBrutos) || idsBrutos.length === 0) {
    return { erro: "Nenhum produto selecionado." };
  }
  if (idsBrutos.length > LIMITE_IDS_POR_ACAO) {
    return { erro: `Selecione no máximo ${LIMITE_IDS_POR_ACAO} produtos por ação em massa.` };
  }
  const ids = idsBrutos.filter((id): id is string => typeof id === "string" && id.length > 0);
  if (ids.length === 0) return { erro: "Nenhum produto selecionado." };
  return ids;
}

/** Confirma no banco quais dos ids recebidos do client realmente existem hoje. */
async function idsExistentes(
  supabase: Awaited<ReturnType<typeof criarClienteSupabaseServidor>>,
  ids: string[],
): Promise<string[]> {
  const { data } = await supabase.from("produtos").select("id").in("id", ids).returns<{ id: string }[]>();
  return (data ?? []).map((p) => p.id);
}

function revalidarListagens(): void {
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
}

export async function alternarAtivoEmMassa(ids: string[], ativo: boolean): Promise<ResultadoAcaoEmMassa> {
  const idsValidados = validarIds(ids);
  if ("erro" in idsValidados) return { sucesso: false, mensagem: idsValidados.erro, afetados: 0 };

  const supabase = await criarClienteSupabaseServidor();
  const idsReais = await idsExistentes(supabase, idsValidados);
  if (idsReais.length === 0) {
    return { sucesso: false, mensagem: "Nenhum dos produtos selecionados foi encontrado.", afetados: 0 };
  }

  const { error } = await supabase.from("produtos").update({ ativo }).in("id", idsReais);
  if (error) return { sucesso: false, mensagem: `Erro ao atualizar: ${error.message}`, afetados: 0 };

  revalidarListagens();
  return { sucesso: true, afetados: idsReais.length };
}

export async function atribuirMarcaEmMassa(ids: string[], marcaId: string): Promise<ResultadoAcaoEmMassa> {
  const idsValidados = validarIds(ids);
  if ("erro" in idsValidados) return { sucesso: false, mensagem: idsValidados.erro, afetados: 0 };
  if (!marcaId) return { sucesso: false, mensagem: "Selecione uma marca.", afetados: 0 };

  const supabase = await criarClienteSupabaseServidor();

  const { data: marca } = await supabase.from("marcas").select("id").eq("id", marcaId).maybeSingle<{ id: string }>();
  if (!marca) return { sucesso: false, mensagem: "A marca selecionada não existe (mais).", afetados: 0 };

  const idsReais = await idsExistentes(supabase, idsValidados);
  if (idsReais.length === 0) {
    return { sucesso: false, mensagem: "Nenhum dos produtos selecionados foi encontrado.", afetados: 0 };
  }

  const { error } = await supabase.from("produtos").update({ marca_id: marcaId }).in("id", idsReais);
  if (error) return { sucesso: false, mensagem: `Erro ao atualizar: ${error.message}`, afetados: 0 };

  revalidarListagens();
  return { sucesso: true, afetados: idsReais.length };
}

export async function atribuirCategoriaEmMassa(
  ids: string[],
  categoriaId: string,
): Promise<ResultadoAcaoEmMassa> {
  const idsValidados = validarIds(ids);
  if ("erro" in idsValidados) return { sucesso: false, mensagem: idsValidados.erro, afetados: 0 };
  if (!categoriaId) return { sucesso: false, mensagem: "Selecione uma categoria.", afetados: 0 };

  const supabase = await criarClienteSupabaseServidor();

  const { data: categoria } = await supabase
    .from("categorias")
    .select("id")
    .eq("id", categoriaId)
    .maybeSingle<{ id: string }>();
  if (!categoria) return { sucesso: false, mensagem: "A categoria selecionada não existe (mais).", afetados: 0 };

  const idsReais = await idsExistentes(supabase, idsValidados);
  if (idsReais.length === 0) {
    return { sucesso: false, mensagem: "Nenhum dos produtos selecionados foi encontrado.", afetados: 0 };
  }

  const { error } = await supabase.from("produtos").update({ categoria_id: categoriaId }).in("id", idsReais);
  if (error) return { sucesso: false, mensagem: `Erro ao atualizar: ${error.message}`, afetados: 0 };

  revalidarListagens();
  return { sucesso: true, afetados: idsReais.length };
}

export interface ResultadoAjusteEstoque extends ResultadoAcaoEmMassa {
  ignoradosPorEstoqueNegativo: number;
}

/**
 * "definir": todo produto selecionado passa a ter exatamente `valor` de
 * estoque. "somar": soma (ou subtrai, se `valor` negativo) `valor` ao
 * estoque ATUAL de cada produto — lido agora, no servidor, nunca um valor
 * calculado no client. Produtos que ficariam com estoque negativo são
 * pulados (não aplicados, não truncados em 0 silenciosamente) e contados
 * à parte no resultado.
 */
export async function ajustarEstoqueEmMassa(
  ids: string[],
  modo: "definir" | "somar",
  valor: number,
): Promise<ResultadoAjusteEstoque> {
  const idsValidados = validarIds(ids);
  if ("erro" in idsValidados) {
    return { sucesso: false, mensagem: idsValidados.erro, afetados: 0, ignoradosPorEstoqueNegativo: 0 };
  }

  if (!Number.isInteger(valor)) {
    return {
      sucesso: false,
      mensagem: "A quantidade deve ser um número inteiro.",
      afetados: 0,
      ignoradosPorEstoqueNegativo: 0,
    };
  }
  if (modo === "definir" && valor < 0) {
    return {
      sucesso: false,
      mensagem: "Para definir o estoque, o valor deve ser maior ou igual a zero.",
      afetados: 0,
      ignoradosPorEstoqueNegativo: 0,
    };
  }
  if (modo === "somar" && valor === 0) {
    return {
      sucesso: false,
      mensagem: "Informe uma quantidade diferente de zero para somar/subtrair.",
      afetados: 0,
      ignoradosPorEstoqueNegativo: 0,
    };
  }

  const supabase = await criarClienteSupabaseServidor();

  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, estoque")
    .in("id", idsValidados)
    .returns<{ id: string; estoque: number }[]>();

  if (!produtos || produtos.length === 0) {
    return {
      sucesso: false,
      mensagem: "Nenhum dos produtos selecionados foi encontrado.",
      afetados: 0,
      ignoradosPorEstoqueNegativo: 0,
    };
  }

  let afetados = 0;
  let ignoradosPorEstoqueNegativo = 0;

  const TAMANHO_LOTE = 10;
  for (let i = 0; i < produtos.length; i += TAMANHO_LOTE) {
    const lote = produtos.slice(i, i + TAMANHO_LOTE);
    const resultados = await Promise.all(
      lote.map(async (produto) => {
        const novoEstoque = modo === "definir" ? valor : produto.estoque + valor;
        if (novoEstoque < 0) return "negativo" as const;

        const { error } = await supabase.from("produtos").update({ estoque: novoEstoque }).eq("id", produto.id);
        return error ? ("erro" as const) : ("ok" as const);
      }),
    );

    for (const resultado of resultados) {
      if (resultado === "ok") afetados++;
      if (resultado === "negativo") ignoradosPorEstoqueNegativo++;
    }
  }

  revalidarListagens();
  return { sucesso: true, afetados, ignoradosPorEstoqueNegativo };
}

/**
 * IDs de TODOS os produtos que casam com os filtros atuais da listagem
 * (não só a página visível) — usado por "selecionar todos os resultados
 * do filtro atual". Reaproveita exatamente a mesma lógica de filtro da
 * página (src/lib/produtos/filtros.ts) pra nunca selecionar algo
 * diferente do que está sendo mostrado.
 */
export async function buscarIdsDoFiltroAtual(
  somenteRevisao: boolean,
  problemaBruto: string[],
): Promise<{ ids: string[]; truncado: boolean }> {
  const supabase = await criarClienteSupabaseServidor();
  const problemasAtivos = normalizarProblemasAtivos(problemaBruto);

  const [idMarcaPadrao, idCategoriaPadrao, { data: identificadores }] = await Promise.all([
    buscarIdMarcaPadrao(supabase),
    buscarIdCategoriaPadrao(supabase),
    supabase.from("produtos").select("id, sku, ean").returns<IdentificadoresProduto[]>(),
  ]);

  const duplicatas = encontrarDuplicatas(identificadores ?? []);

  let query = supabase.from("produtos").select("id");

  if (somenteRevisao) {
    query = query.not("bling_produto_id", "is", null).eq("ativo", false);
  }

  const termosOr = construirTermosOr(problemasAtivos, { idMarcaPadrao, idCategoriaPadrao, duplicatas });
  if (termosOr.length > 0) {
    query = query.or(termosOr.join(","));
  }

  const { data } = await query.limit(LIMITE_IDS_POR_ACAO + 1).returns<{ id: string }[]>();
  const ids = (data ?? []).map((p) => p.id);

  return { ids: ids.slice(0, LIMITE_IDS_POR_ACAO), truncado: ids.length > LIMITE_IDS_POR_ACAO };
}
