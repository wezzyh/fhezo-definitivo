import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { EditorHome } from "./editor-home";
import { HistoricoConteudo } from "@/components/admin/historico-conteudo";
import { restaurarHome } from "./actions";
import { HOME_PADRAO } from "@/lib/conteudo/padroes";
import type { DadosHome } from "@/lib/conteudo/tipos";
import type { Categoria, ConteudoSite, Produto } from "@/types/database";

export default async function AdminHomePage() {
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: publicado }, { data: versoes }, { data: categorias }, { data: produtos }] = await Promise.all([
    supabase.from("conteudo_site").select("*").eq("tipo", "home").eq("publicado", true).maybeSingle<ConteudoSite>(),
    supabase
      .from("conteudo_site")
      .select("versao, publicado, created_at")
      .eq("tipo", "home")
      .order("versao", { ascending: false })
      .returns<Pick<ConteudoSite, "versao" | "publicado" | "created_at">[]>(),
    supabase.from("categorias").select("id, nome").eq("ativo", true).order("nome").returns<Pick<Categoria, "id" | "nome">[]>(),
    supabase
      .from("produtos")
      .select("id, nome, sku")
      .eq("ativo", true)
      .order("nome")
      .returns<Pick<Produto, "id" | "nome" | "sku">[]>(),
  ]);

  const secoes = (publicado?.dados as DadosHome | undefined)?.secoes ?? HOME_PADRAO.secoes;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Home</h1>
      <p className="mt-1 text-sm text-muted">
        Seções exibidas na página inicial do site, na ordem em que aparecem aqui.
      </p>

      <div className="mt-6">
        <EditorHome secoesIniciais={secoes} categorias={categorias ?? []} produtos={produtos ?? []} />
      </div>

      {versoes && versoes.length > 0 && <HistoricoConteudo versoes={versoes} onRestaurar={restaurarHome} />}
    </div>
  );
}
