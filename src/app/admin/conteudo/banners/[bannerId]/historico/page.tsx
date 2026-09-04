import { notFound } from "next/navigation";
import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { HistoricoConteudo } from "@/components/admin/historico-conteudo";
import { restaurarBanner } from "../../actions";
import type { Banner } from "@/types/database";

interface HistoricoBannerPageProps {
  params: Promise<{ bannerId: string }>;
}

export default async function HistoricoBannerPage({ params }: HistoricoBannerPageProps) {
  const { bannerId } = await params;
  const supabase = await criarClienteSupabaseServidor();

  const { data: versoes } = await supabase
    .from("banners")
    .select("versao, publicado, created_at")
    .eq("banner_id", bannerId)
    .order("versao", { ascending: false })
    .returns<Pick<Banner, "versao" | "publicado" | "created_at">[]>();

  if (!versoes || versoes.length === 0) notFound();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Histórico do banner</h1>
        <Link href="/admin/conteudo/banners" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar para a lista
        </Link>
      </div>

      <div className="mt-6">
        <HistoricoConteudo versoes={versoes} onRestaurar={restaurarBanner.bind(null, bannerId)} abertoPorPadrao />
      </div>
    </div>
  );
}
