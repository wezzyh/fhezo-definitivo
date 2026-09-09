"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { gerarSlugUnicoPagina } from "@/lib/conteudo/slug-unico-pagina";

export interface EstadoFormularioPagina {
  erro?: string;
}

interface DadosPaginaValidados {
  titulo: string;
  corpo: string;
  seoTitulo: string | null;
  seoDescricao: string | null;
  ativo: boolean;
}

function validarDadosPagina(formData: FormData): DadosPaginaValidados | { erro: string } {
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return { erro: "O campo Título é obrigatório." };

  const corpo = String(formData.get("corpo") ?? "").trim();
  if (!corpo) return { erro: "O campo Corpo é obrigatório." };

  const seoTitulo = String(formData.get("seo_titulo") ?? "").trim() || null;
  const seoDescricao = String(formData.get("seo_descricao") ?? "").trim() || null;
  const ativo = formData.get("ativo") === "on";

  return { titulo, corpo, seoTitulo, seoDescricao, ativo };
}

export async function criarPagina(
  _estadoAnterior: EstadoFormularioPagina,
  formData: FormData,
): Promise<EstadoFormularioPagina> {
  const dados = validarDadosPagina(formData);
  if ("erro" in dados) return dados;

  const supabase = await criarClienteSupabaseServidor();
  const slug = await gerarSlugUnicoPagina(supabase, dados.titulo);

  const { error } = await supabase.from("paginas_institucionais").insert({
    slug,
    titulo: dados.titulo,
    corpo: dados.corpo,
    seo_titulo: dados.seoTitulo,
    seo_descricao: dados.seoDescricao,
    ativo: dados.ativo,
  });

  if (error) {
    return { erro: `Erro ao salvar página: ${error.message}` };
  }

  updateTag("conteudo-paginas");
  revalidatePath("/admin/conteudo/paginas");
  redirect("/admin/conteudo/paginas");
}

export async function atualizarPagina(
  id: string,
  _estadoAnterior: EstadoFormularioPagina,
  formData: FormData,
): Promise<EstadoFormularioPagina> {
  const dados = validarDadosPagina(formData);
  if ("erro" in dados) return dados;

  const supabase = await criarClienteSupabaseServidor();
  const slug = await gerarSlugUnicoPagina(supabase, dados.titulo, id);

  const { data: paginaAnterior } = await supabase
    .from("paginas_institucionais")
    .select("slug")
    .eq("id", id)
    .maybeSingle<{ slug: string }>();

  const { error } = await supabase
    .from("paginas_institucionais")
    .update({
      slug,
      titulo: dados.titulo,
      corpo: dados.corpo,
      seo_titulo: dados.seoTitulo,
      seo_descricao: dados.seoDescricao,
      ativo: dados.ativo,
    })
    .eq("id", id);

  if (error) {
    return { erro: `Erro ao atualizar página: ${error.message}` };
  }

  updateTag("conteudo-paginas");
  revalidatePath("/admin/conteudo/paginas");
  revalidatePath(`/institucional/${slug}`);
  if (paginaAnterior && paginaAnterior.slug !== slug) {
    revalidatePath(`/institucional/${paginaAnterior.slug}`);
  }
  redirect("/admin/conteudo/paginas");
}

export async function alternarAtivoPagina(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return;

  const supabase = await criarClienteSupabaseServidor();
  await supabase.from("paginas_institucionais").update({ ativo: !ativo }).eq("id", id);

  updateTag("conteudo-paginas");
  revalidatePath("/admin/conteudo/paginas");
}
