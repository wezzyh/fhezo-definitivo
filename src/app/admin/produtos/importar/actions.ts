"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { obterOuCriarMarcaPadrao, obterOuCriarCategoriaPadrao } from "@/lib/produtos/padroes";
import { gerarSlugUnico } from "@/lib/categorias/slug-unico";
import {
  parsearArquivoImportacao,
  validarLinhasImportacao,
  type ContextoValidacaoImportacao,
} from "@/lib/produtos/importacao";
import {
  classificarLinha,
  sanitizarLinhaImportacao,
  LIMITE_LINHAS_IMPORTACAO,
  type LinhaImportacao,
  type LinhaValidada,
  type OpcoesFaltantes,
} from "@/lib/produtos/importacao-tipos";

type SupabaseServidor = Awaited<ReturnType<typeof criarClienteSupabaseServidor>>;

async function buscarContextoValidacao(supabase: SupabaseServidor): Promise<ContextoValidacaoImportacao> {
  const [{ data: produtos }, { data: marcas }, { data: categorias }] = await Promise.all([
    supabase.from("produtos").select("id, sku, ean").returns<{ id: string; sku: string; ean: string | null }[]>(),
    supabase.from("marcas").select("id, nome").returns<{ id: string; nome: string }[]>(),
    supabase.from("categorias").select("id, nome").returns<{ id: string; nome: string }[]>(),
  ]);

  return {
    produtosExistentes: produtos ?? [],
    marcas: marcas ?? [],
    categorias: categorias ?? [],
  };
}

export interface EstadoPreviewImportacao {
  linhas?: LinhaValidada[];
  /** Serializado pra ir num hidden field até a tela de confirmação. */
  linhasOriginaisJson?: string;
  erroGeral?: string;
}

export async function preVisualizarImportacao(
  _estadoAnterior: EstadoPreviewImportacao,
  formData: FormData,
): Promise<EstadoPreviewImportacao> {
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erroGeral: "Selecione um arquivo CSV ou XLSX." };
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const resultadoParse = await parsearArquivoImportacao(buffer, arquivo.name);
  if (resultadoParse.erro) return { erroGeral: resultadoParse.erro };

  const supabase = await criarClienteSupabaseServidor();
  const contexto = await buscarContextoValidacao(supabase);
  const linhas = validarLinhasImportacao(resultadoParse.linhas, contexto);

  return { linhas, linhasOriginaisJson: JSON.stringify(resultadoParse.linhas) };
}

export interface FalhaImportacao {
  linha: number;
  sku: string;
  motivo: string;
}

export interface ResumoImportacao {
  criados: number;
  atualizados: number;
  pulados: number;
  falharam: FalhaImportacao[];
  categoriasCriadas: string[];
  marcasCriadas: string[];
}

export interface EstadoAplicacaoImportacao {
  resumo?: ResumoImportacao;
  erroGeral?: string;
}

export async function aplicarImportacao(
  _estadoAnterior: EstadoAplicacaoImportacao,
  formData: FormData,
): Promise<EstadoAplicacaoImportacao> {
  const dadosBrutos = String(formData.get("dados") ?? "");
  const modoCategoriaFaltante: OpcoesFaltantes["modoCategoriaFaltante"] =
    formData.get("modo_categoria") === "criar" ? "criar" : "pular";
  const modoMarcaFaltante: OpcoesFaltantes["modoMarcaFaltante"] =
    formData.get("modo_marca") === "criar" ? "criar" : "pular";

  let listaBruta: unknown;
  try {
    listaBruta = JSON.parse(dadosBrutos);
  } catch {
    return { erroGeral: "Não foi possível ler os dados da pré-visualização. Refaça o upload." };
  }
  if (!Array.isArray(listaBruta) || listaBruta.length === 0) {
    return { erroGeral: "Nenhuma linha para importar. Refaça o upload." };
  }
  if (listaBruta.length > LIMITE_LINHAS_IMPORTACAO) {
    return { erroGeral: `Muitas linhas (limite de ${LIMITE_LINHAS_IMPORTACAO}). Refaça o upload.` };
  }

  const linhasOriginais: LinhaImportacao[] = listaBruta.map((item, indice) =>
    sanitizarLinhaImportacao(item, indice + 1),
  );

  const supabase = await criarClienteSupabaseServidor();

  // Revalida TUDO de novo contra o estado atual do banco — nunca confia
  // no que foi calculado no preview, que já pode estar desatualizado (ex.:
  // alguém criou/renomeou uma marca, ou outro produto com o mesmo SKU foi
  // cadastrado, entre a pré-visualização e a confirmação).
  const contexto = await buscarContextoValidacao(supabase);
  const linhasValidadas = validarLinhasImportacao(linhasOriginais, contexto);

  const opcoes: OpcoesFaltantes = { modoCategoriaFaltante, modoMarcaFaltante };

  const categoriasCriadas: string[] = [];
  const marcasCriadas: string[] = [];
  const categoriaIdPorTexto = new Map<string, string>();
  const marcaIdPorTexto = new Map<string, string>();

  // 1. Cria (uma única vez cada) as categorias/marcas que faltam e o modo
  // escolhido é "criar automaticamente".
  for (const linha of linhasValidadas) {
    const acao = classificarLinha(linha, opcoes);
    if (acao !== "criar" && acao !== "atualizar") continue;

    if (linha.categoriaFaltante) {
      const chave = linha.categoriaTexto.toLowerCase();
      if (!categoriaIdPorTexto.has(chave)) {
        const slug = await gerarSlugUnico(supabase, linha.categoriaTexto);
        const { data, error } = await supabase
          .from("categorias")
          .insert({ nome: linha.categoriaTexto, slug, ativo: true })
          .select("id")
          .single<{ id: string }>();
        if (!error && data) {
          categoriaIdPorTexto.set(chave, data.id);
          categoriasCriadas.push(linha.categoriaTexto);
        }
      }
    }

    if (linha.marcaFaltante) {
      const chave = linha.marcaTexto.toLowerCase();
      if (!marcaIdPorTexto.has(chave)) {
        const { data, error } = await supabase
          .from("marcas")
          .insert({ nome: linha.marcaTexto, ativo: true })
          .select("id")
          .single<{ id: string }>();
        if (!error && data) {
          marcaIdPorTexto.set(chave, data.id);
          marcasCriadas.push(linha.marcaTexto);
        }
      }
    }
  }

  // Resolve uma única vez os padrões "Sem marca"/"Sem categoria" — usados
  // quando a linha simplesmente não informa marca/categoria (não é o
  // mesmo caso de "informou e não existe").
  const idMarcaPadrao = await obterOuCriarMarcaPadrao(supabase);
  const idCategoriaPadrao = await obterOuCriarCategoriaPadrao(supabase);

  interface ItemCriar {
    numeroLinha: number;
    sku: string;
    dados: Record<string, unknown>;
  }
  interface ItemAtualizar {
    id: string;
    numeroLinha: number;
    sku: string;
    dados: Record<string, unknown>;
  }

  const paraCriar: ItemCriar[] = [];
  const paraAtualizar: ItemAtualizar[] = [];
  const falharam: FalhaImportacao[] = [];
  let pulados = 0;

  for (const linha of linhasValidadas) {
    const acao = classificarLinha(linha, opcoes);

    if (acao === "erro") {
      falharam.push({ linha: linha.numeroLinha, sku: linha.sku || "(vazio)", motivo: linha.erros.join(" ") });
      continue;
    }
    if (acao === "pular_categoria_faltante" || acao === "pular_marca_faltante") {
      pulados++;
      continue;
    }

    const categoriaId =
      linha.categoriaId ??
      (linha.categoriaTexto ? categoriaIdPorTexto.get(linha.categoriaTexto.toLowerCase()) : undefined) ??
      idCategoriaPadrao;
    const marcaId =
      linha.marcaId ??
      (linha.marcaTexto ? marcaIdPorTexto.get(linha.marcaTexto.toLowerCase()) : undefined) ??
      idMarcaPadrao;

    const dadosProduto = {
      sku: linha.sku,
      nome: linha.nome,
      marca_id: marcaId,
      categoria_id: categoriaId,
      descricao: linha.descricao,
      preco: linha.preco as number,
      estoque: linha.estoque as number,
      peso_kg: linha.pesoKg,
      altura_cm: linha.alturaCm,
      largura_cm: linha.larguraCm,
      comprimento_cm: linha.comprimentoCm,
      ean: linha.ean,
      ncm: linha.ncm,
    };

    if (acao === "atualizar" && linha.produtoExistenteId) {
      // Só os campos vindos do arquivo — nunca toca ativo, imagem_url,
      // seo_titulo/seo_descricao ou atributos de um produto já existente
      // (esses não fazem parte do formato de importação; ficam como estão).
      paraAtualizar.push({
        id: linha.produtoExistenteId,
        numeroLinha: linha.numeroLinha,
        sku: linha.sku,
        dados: dadosProduto,
      });
    } else {
      // Produto novo: sempre inativo, igual à sincronização com o Bling —
      // fica aguardando revisão manual em /admin/produtos antes de
      // aparecer na loja, mesmo que todos os campos tenham vindo
      // preenchidos e válidos.
      paraCriar.push({
        numeroLinha: linha.numeroLinha,
        sku: linha.sku,
        dados: { ...dadosProduto, ativo: false, atributos: {} },
      });
    }
  }

  let criados = 0;
  let atualizados = 0;

  if (paraCriar.length > 0) {
    const { data, error } = await supabase
      .from("produtos")
      .insert(paraCriar.map((item) => item.dados))
      .select("id");

    if (error) {
      // Insert em lote falhou (ex.: colisão de SKU criada em paralelo por
      // fora desta importação) — tenta um por um pra não perder as linhas
      // que dariam certo.
      for (const item of paraCriar) {
        const { error: erroItem } = await supabase.from("produtos").insert(item.dados);
        if (erroItem) {
          falharam.push({ linha: item.numeroLinha, sku: item.sku, motivo: erroItem.message });
        } else {
          criados++;
        }
      }
    } else {
      criados = data?.length ?? paraCriar.length;
    }
  }

  const TAMANHO_LOTE = 10;
  for (let i = 0; i < paraAtualizar.length; i += TAMANHO_LOTE) {
    const lote = paraAtualizar.slice(i, i + TAMANHO_LOTE);
    const resultados = await Promise.all(
      lote.map(async (item) => {
        const { error } = await supabase.from("produtos").update(item.dados).eq("id", item.id);
        return { item, error };
      }),
    );
    for (const { item, error } of resultados) {
      if (error) falharam.push({ linha: item.numeroLinha, sku: item.sku, motivo: error.message });
      else atualizados++;
    }
  }

  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");

  return {
    resumo: { criados, atualizados, pulados, falharam, categoriasCriadas, marcasCriadas },
  };
}
