import Link from "next/link";
import { Button } from "@/components/ui/button";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { BotaoAlternarAtivoBanner } from "./botao-alternar-ativo";
import type { Banner } from "@/types/database";
import type { DadosBanner } from "@/lib/conteudo/tipos";

export default async function AdminBannersPage() {
  const supabase = await criarClienteSupabaseServidor();
  const { data: banners, error } = await supabase
    .from("banners")
    .select("*")
    .eq("publicado", true)
    .returns<Banner[]>();

  const ordenados = (banners ?? [])
    .slice()
    .sort((a, b) => (a.dados as unknown as DadosBanner).ordem - (b.dados as unknown as DadosBanner).ordem);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Banners</h1>
        <Link href="/admin/conteudo/banners/novo">
          <Button variant="primary">+ Novo banner</Button>
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">Erro ao carregar banners: {error.message}</p>}
      {!error && ordenados.length === 0 && (
        <p className="mt-6 text-sm text-muted">Nenhum banner cadastrado ainda.</p>
      )}

      {ordenados.length > 0 && (
        <div className="mt-6 space-y-3">
          {ordenados.map((banner) => {
            const dados = banner.dados as unknown as DadosBanner;
            return (
              <div key={banner.banner_id} className="flex flex-wrap items-center gap-4 rounded-md border border-zinc-200 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária cadastrada pelo admin */}
                <img src={dados.imagem_url} alt={dados.titulo ?? ""} className="h-16 w-28 rounded object-cover" />
                <div className="min-w-[10rem] flex-1">
                  <p className="font-medium text-ink">{dados.titulo || "(sem título)"}</p>
                  <p className="text-xs text-muted">Ordem {dados.ordem} · versão {banner.versao}</p>
                  {(dados.data_inicio || dados.data_fim) && (
                    <p className="text-xs text-muted">
                      Vigência: {dados.data_inicio ?? "sempre"} até {dados.data_fim ?? "sempre"}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    dados.ativo ? "bg-brand-green/10 text-brand-green-dark" : "bg-zinc-200 text-muted"
                  }`}
                >
                  {dados.ativo ? "Ativo" : "Inativo"}
                </span>
                <Link
                  href={`/admin/conteudo/banners/${banner.banner_id}/editar`}
                  className="text-sm font-medium text-brand-green hover:underline"
                >
                  Editar
                </Link>
                <Link
                  href={`/admin/conteudo/banners/${banner.banner_id}/historico`}
                  className="text-sm font-medium text-ink hover:underline"
                >
                  Histórico
                </Link>
                <BotaoAlternarAtivoBanner bannerId={banner.banner_id} ativo={dados.ativo} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
