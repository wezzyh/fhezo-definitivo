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
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Banners</h1>
        <Link href="/admin/conteudo/banners/novo">
          <Button variant="primary">+ Novo banner</Button>
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-[var(--admin-danger)]">Erro ao carregar banners: {error.message}</p>}
      {!error && ordenados.length === 0 && (
        <p className="mt-6 text-sm text-[var(--admin-text-secondary)]">Nenhum banner cadastrado ainda.</p>
      )}

      {ordenados.length > 0 && (
        <div className="mt-6 space-y-3">
          {ordenados.map((banner) => {
            const dados = banner.dados as unknown as DadosBanner;
            return (
              <div
                key={banner.banner_id}
                className="flex flex-wrap items-center gap-4 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- URL externa arbitrária cadastrada pelo admin */}
                <img src={dados.imagem_url} alt={dados.titulo ?? ""} className="h-16 w-28 rounded object-cover" />
                <div className="min-w-[10rem] flex-1">
                  <p className="font-medium text-[var(--admin-text)]">{dados.titulo || "(sem título)"}</p>
                  <p className="text-xs text-[var(--admin-text-secondary)]">
                    Ordem {dados.ordem} · versão {banner.versao}
                  </p>
                  {(dados.data_inicio || dados.data_fim) && (
                    <p className="text-xs text-[var(--admin-text-secondary)]">
                      Vigência: {dados.data_inicio ?? "sempre"} até {dados.data_fim ?? "sempre"}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-[var(--admin-surface-hover)] px-2 py-0.5 text-xs font-medium text-[var(--admin-text-secondary)]">
                  {dados.posicao === "faixa_institucional" ? "Faixa institucional" : "Banner principal"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    dados.ativo
                      ? "bg-[var(--admin-green)]/15 text-[var(--admin-green-text)]"
                      : "bg-[var(--admin-surface-hover)] text-[var(--admin-text-secondary)]"
                  }`}
                >
                  {dados.ativo ? "Ativo" : "Inativo"}
                </span>
                <Link
                  href={`/admin/conteudo/banners/${banner.banner_id}/editar`}
                  className="text-sm font-medium text-[var(--admin-green-text)] hover:underline"
                >
                  Editar
                </Link>
                <Link
                  href={`/admin/conteudo/banners/${banner.banner_id}/historico`}
                  className="text-sm font-medium text-[var(--admin-text)] hover:underline"
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
