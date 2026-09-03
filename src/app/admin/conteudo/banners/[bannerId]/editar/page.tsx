import { notFound } from "next/navigation";
import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { FormularioBanner } from "../../formulario-banner";
import { atualizarBanner } from "../../actions";
import type { Banner } from "@/types/database";

interface EditarBannerPageProps {
  params: Promise<{ bannerId: string }>;
}

export default async function EditarBannerPage({ params }: EditarBannerPageProps) {
  const { bannerId } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const { data: banner } = await supabase
    .from("banners")
    .select("*")
    .eq("banner_id", bannerId)
    .eq("publicado", true)
    .maybeSingle<Banner>();

  if (!banner) notFound();

  const atualizarComId = atualizarBanner.bind(null, bannerId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Editar banner</h1>
        <Link href="/admin/conteudo/banners" className="text-sm font-medium text-brand-green hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6 max-w-xl rounded-md border border-zinc-200 bg-white p-6">
        <FormularioBanner banner={banner} action={atualizarComId} textoBotao="Publicar nova versão" />
      </div>
    </div>
  );
}
