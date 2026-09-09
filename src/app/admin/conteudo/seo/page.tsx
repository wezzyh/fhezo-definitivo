import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { EditorSeo } from "./editor-seo";
import { HistoricoConteudo } from "@/components/admin/historico-conteudo";
import { restaurarSeo } from "./actions";
import { SEO_PADRAO } from "@/lib/conteudo/padroes";
import type { DadosSeo } from "@/lib/conteudo/tipos";
import type { ConteudoSite } from "@/types/database";

export default async function AdminSeoPage() {
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: publicado }, { data: versoes }] = await Promise.all([
    supabase.from("conteudo_site").select("*").eq("tipo", "seo").eq("publicado", true).maybeSingle<ConteudoSite>(),
    supabase
      .from("conteudo_site")
      .select("versao, publicado, created_at")
      .eq("tipo", "seo")
      .order("versao", { ascending: false })
      .returns<Pick<ConteudoSite, "versao" | "publicado" | "created_at">[]>(),
  ]);

  const dados = (publicado?.dados as DadosSeo | undefined) ?? SEO_PADRAO;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--admin-text)]">SEO</h1>
      <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
        Título e descrição exibidos nos resultados de busca (Google) para a Home e a listagem de produtos.
        Produtos individuais e páginas institucionais têm seu próprio SEO nos respectivos formulários.
      </p>

      <div className="mt-6 max-w-xl rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <EditorSeo dadosIniciais={dados} />
      </div>

      {versoes && versoes.length > 0 && <HistoricoConteudo versoes={versoes} onRestaurar={restaurarSeo} />}
    </div>
  );
}
