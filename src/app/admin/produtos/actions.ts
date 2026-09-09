"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { existeSkuDuplicado, existeEanDuplicado } from "@/lib/produtos/duplicatas";
import { removerImagemAdminSeOrfa } from "@/components/admin/upload-imagem-actions";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { aplicarDetalheProdutoBling } from "@/lib/integracoes/aplicar-produto-bling";

export interface EstadoFormularioProduto {
  erro?: string;
}

function extrairAtributosTecnicos(formData: FormData): Record<string, string> {
  const chaves = formData.getAll("atributo_chave").map((valor) => String(valor).trim());
  const valores = formData.getAll("atributo_valor").map((valor) => String(valor).trim());

  const atributos: Record<string, string> = {};
  chaves.forEach((chave, indice) => {
    const valor = valores[indice];
    if (chave && valor) {
      atributos[chave] = valor;
    }
  });

  return atributos;
}

interface DadosProdutoValidados {
  sku: string;
  nome: string;
  marca_id: string;
  categoria_id: string;
  descricao: string | null;
  preco: number;
  preco_de: number | null;
  estoque: number;
  ativo: boolean;
  peso_kg: number;
  altura_cm: number;
  largura_cm: number;
  comprimento_cm: number;
  ean: string | null;
  ncm: string | null;
  seo_titulo: string | null;
  seo_descricao: string | null;
  imagem_url: string | null;
  atributos: Record<string, string>;
}

function validarNumeroPositivo(
  formData: FormData,
  campo: string,
  rotulo: string,
): number | { erro: string } {
  const texto = String(formData.get(campo) ?? "").trim();
  const numero = Number(texto.replace(",", "."));

  if (!texto || Number.isNaN(numero) || numero <= 0) {
    return { erro: `O campo ${rotulo} deve ser um número maior que zero.` };
  }

  return numero;
}

function campoOpcional(formData: FormData, campo: string): string | null {
  const valor = String(formData.get(campo) ?? "").trim();
  return valor || null;
}

function validarDadosProduto(formData: FormData): DadosProdutoValidados | { erro: string } {
  const sku = String(formData.get("sku") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const marcaId = String(formData.get("marca_id") ?? "").trim();
  const categoriaId = String(formData.get("categoria_id") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const precoTexto = String(formData.get("preco") ?? "").trim();
  const estoqueTexto = String(formData.get("estoque") ?? "").trim();
  const ativo = formData.get("ativo") === "on";

  if (!sku) return { erro: "O campo SKU é obrigatório." };
  if (!nome) return { erro: "O campo Nome é obrigatório." };
  if (!marcaId) return { erro: "O campo Marca é obrigatório." };
  if (!categoriaId) return { erro: "O campo Categoria é obrigatório." };

  const preco = Number(precoTexto.replace(",", "."));
  if (!precoTexto || Number.isNaN(preco) || preco < 0) {
    return { erro: "O preço deve ser um número maior ou igual a zero." };
  }

  const estoque = Number(estoqueTexto);
  if (!estoqueTexto || !Number.isInteger(estoque) || estoque < 0) {
    return { erro: "O estoque deve ser um número inteiro maior ou igual a zero." };
  }

  const precoDeTexto = String(formData.get("preco_de") ?? "").trim();
  let precoDe: number | null = null;
  if (precoDeTexto) {
    precoDe = Number(precoDeTexto.replace(",", "."));
    if (Number.isNaN(precoDe) || precoDe < 0) {
      return { erro: "O preço \"de\" deve ser um número maior ou igual a zero." };
    }
  }

  const pesoKg = validarNumeroPositivo(formData, "peso_kg", "Peso");
  if (typeof pesoKg !== "number") return pesoKg;

  const alturaCm = validarNumeroPositivo(formData, "altura_cm", "Altura");
  if (typeof alturaCm !== "number") return alturaCm;

  const larguraCm = validarNumeroPositivo(formData, "largura_cm", "Largura");
  if (typeof larguraCm !== "number") return larguraCm;

  const comprimentoCm = validarNumeroPositivo(formData, "comprimento_cm", "Comprimento");
  if (typeof comprimentoCm !== "number") return comprimentoCm;

  return {
    sku,
    nome,
    marca_id: marcaId,
    categoria_id: categoriaId,
    descricao: descricao || null,
    preco,
    preco_de: precoDe,
    estoque,
    ativo,
    peso_kg: pesoKg,
    altura_cm: alturaCm,
    largura_cm: larguraCm,
    comprimento_cm: comprimentoCm,
    ean: campoOpcional(formData, "ean"),
    ncm: campoOpcional(formData, "ncm"),
    seo_titulo: campoOpcional(formData, "seo_titulo"),
    seo_descricao: campoOpcional(formData, "seo_descricao"),
    imagem_url: campoOpcional(formData, "imagem_url"),
    atributos: extrairAtributosTecnicos(formData),
  };
}

export async function criarProduto(
  _estadoAnterior: EstadoFormularioProduto,
  formData: FormData,
): Promise<EstadoFormularioProduto> {
  const dados = validarDadosProduto(formData);
  if ("erro" in dados) return dados;

  const supabase = await criarClienteSupabaseServidor();

  if (await existeSkuDuplicado(supabase, dados.sku)) {
    return { erro: `Já existe um produto com o SKU "${dados.sku}" (ignorando maiúsculas/espaços).` };
  }
  if (dados.ean && (await existeEanDuplicado(supabase, dados.ean))) {
    return { erro: `Já existe um produto com o EAN "${dados.ean}".` };
  }

  const { error } = await supabase.from("produtos").insert({
    sku: dados.sku,
    nome: dados.nome,
    marca_id: dados.marca_id,
    categoria_id: dados.categoria_id,
    descricao: dados.descricao,
    preco: dados.preco,
    preco_de: dados.preco_de,
    estoque: dados.estoque,
    ativo: dados.ativo,
    peso_kg: dados.peso_kg,
    altura_cm: dados.altura_cm,
    largura_cm: dados.largura_cm,
    comprimento_cm: dados.comprimento_cm,
    ean: dados.ean,
    ncm: dados.ncm,
    seo_titulo: dados.seo_titulo,
    seo_descricao: dados.seo_descricao,
    imagem_url: dados.imagem_url,
    atributos: dados.atributos,
  });

  if (error) {
    return { erro: `Erro ao salvar produto: ${error.message}` };
  }

  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  redirect("/admin/produtos");
}

export async function atualizarProduto(
  id: string,
  _estadoAnterior: EstadoFormularioProduto,
  formData: FormData,
): Promise<EstadoFormularioProduto> {
  const dados = validarDadosProduto(formData);
  if ("erro" in dados) return dados;

  const supabase = await criarClienteSupabaseServidor();

  if (await existeSkuDuplicado(supabase, dados.sku, id)) {
    return { erro: `Já existe um produto com o SKU "${dados.sku}" (ignorando maiúsculas/espaços).` };
  }
  if (dados.ean && (await existeEanDuplicado(supabase, dados.ean, id))) {
    return { erro: `Já existe um produto com o EAN "${dados.ean}".` };
  }

  const { error } = await supabase
    .from("produtos")
    .update({
      sku: dados.sku,
      nome: dados.nome,
      marca_id: dados.marca_id,
      categoria_id: dados.categoria_id,
      descricao: dados.descricao,
      preco: dados.preco,
      preco_de: dados.preco_de,
      estoque: dados.estoque,
      ativo: dados.ativo,
      peso_kg: dados.peso_kg,
      altura_cm: dados.altura_cm,
      largura_cm: dados.largura_cm,
      comprimento_cm: dados.comprimento_cm,
      ean: dados.ean,
      ncm: dados.ncm,
      seo_titulo: dados.seo_titulo,
      seo_descricao: dados.seo_descricao,
      imagem_url: dados.imagem_url,
      atributos: dados.atributos,
    })
    .eq("id", id);

  if (error) {
    return { erro: `Erro ao atualizar produto: ${error.message}` };
  }

  // Produto não é versionado (diferente de banner) — a imagem antiga, se
  // trocada, não é mais referenciada por nada, então dá pra limpar do
  // Storage com segurança. Melhor esforço: nunca bloqueia o salvamento.
  const imagemAnterior = String(formData.get("imagem_url_anterior") ?? "").trim() || null;
  await removerImagemAdminSeOrfa(imagemAnterior, dados.imagem_url);

  revalidatePath("/admin/produtos");
  revalidatePath(`/produtos/${id}`);
  revalidatePath("/produtos");
  redirect("/admin/produtos");
}

export interface ResultadoImportarBling {
  sucesso: boolean;
  mensagem?: string;
  camposPreenchidos: string[];
}

/**
 * Busca o detalhe completo do produto no Bling (descrição, galeria de
 * imagens, marca, EAN, NCM, peso) e preenche só o que estiver vazio no
 * produto local — botão manual "Importar do Bling" na edição, pra
 * corrigir produtos que foram criados pela sincronização de estoque antes
 * de ela buscar esses dados (ou produtos onde a busca falhou naquele
 * momento). Nunca sobrescreve o que o admin já editou.
 */
export async function importarDetalheBlingAction(produtoId: string): Promise<ResultadoImportarBling> {
  const supabase = criarClienteSupabaseAdmin();

  const { data: produto } = await supabase
    .from("produtos")
    .select("bling_produto_id")
    .eq("id", produtoId)
    .maybeSingle<{ bling_produto_id: number | null }>();

  if (!produto?.bling_produto_id) {
    return { sucesso: false, mensagem: "Este produto não está vinculado a um produto no Bling.", camposPreenchidos: [] };
  }

  const resultado = await aplicarDetalheProdutoBling(supabase, produtoId, produto.bling_produto_id);

  if (resultado.sucesso) {
    revalidatePath("/admin/produtos");
    revalidatePath(`/admin/produtos/${produtoId}/editar`);
    revalidatePath(`/produtos/${produtoId}`);
  }

  return resultado;
}

export async function excluirProduto(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await criarClienteSupabaseServidor();
  await supabase.from("produtos").delete().eq("id", id);

  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
}
