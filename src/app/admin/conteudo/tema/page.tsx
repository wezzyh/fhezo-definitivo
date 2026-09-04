import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { EditorTema } from "./editor-tema";
import { HistoricoConteudo } from "@/components/admin/historico-conteudo";
import { restaurarTema } from "./actions";
import { TEMA_PADRAO } from "@/lib/conteudo/padroes";
import type { DadosTema } from "@/lib/conteudo/tipos";
import type { ConteudoSite } from "@/types/database";

export default async function AdminTemaPage() {
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: publicado }, { data: versoes }] = await Promise.all([
    supabase.from("conteudo_site").select("*").eq("tipo", "tema").eq("publicado", true).maybeSingle<ConteudoSite>(),
    supabase
      .from("conteudo_site")
      .select("versao, publicado, created_at")
      .eq("tipo", "tema")
      .order("versao", { ascending: false })
      .returns<Pick<ConteudoSite, "versao" | "publicado" | "created_at">[]>(),
  ]);

  const cores = (publicado?.dados as DadosTema | undefined)?.cores ?? TEMA_PADRAO.cores;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Tema</h1>
      <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
        Cores da marca usadas em todo o site. Alterar aqui não exige mudar código nem pedir ajuda ao Claude Code.
      </p>

      <div className="mt-6 max-w-xl rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <EditorTema coresIniciais={cores} />
      </div>

      {versoes && versoes.length > 0 && <HistoricoConteudo versoes={versoes} onRestaurar={restaurarTema} />}
    </div>
  );
}
