import { notFound } from "next/navigation";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import type { PaginaInstitucional } from "@/types/database";
import type { Metadata } from "next";

interface PaginaInstitucionalProps {
  params: Promise<{ slug: string }>;
}

async function buscarPagina(slug: string): Promise<PaginaInstitucional | null> {
  const supabase = await criarClienteSupabaseServidor();
  const { data } = await supabase
    .from("paginas_institucionais")
    .select("*")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle<PaginaInstitucional>();
  return data;
}

export async function generateMetadata({ params }: PaginaInstitucionalProps): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await buscarPagina(slug);
  if (!pagina) return {};

  return {
    title: pagina.seo_titulo || pagina.titulo,
    description: pagina.seo_descricao || undefined,
  };
}

export default async function PaginaInstitucionalPublica({ params }: PaginaInstitucionalProps) {
  const { slug } = await params;
  const pagina = await buscarPagina(slug);

  if (!pagina) notFound();

  return (
    <div className="fhezo-container max-w-3xl py-12">
      <h1 className="font-display text-3xl font-semibold text-ink-900">{pagina.titulo}</h1>
      <div className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">{pagina.corpo}</div>
    </div>
  );
}
