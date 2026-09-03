import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { EditorMenu } from "./editor-menu";
import { HistoricoConteudo } from "@/components/admin/historico-conteudo";
import { restaurarMenu } from "./actions";
import { MENU_PADRAO } from "@/lib/conteudo/padroes";
import type { DadosMenu } from "@/lib/conteudo/tipos";
import type { Categoria, ConteudoSite } from "@/types/database";

export default async function AdminMenuPage() {
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: publicado }, { data: versoes }, { data: categorias }] = await Promise.all([
    supabase.from("conteudo_site").select("*").eq("tipo", "menu").eq("publicado", true).maybeSingle<ConteudoSite>(),
    supabase
      .from("conteudo_site")
      .select("versao, publicado, created_at")
      .eq("tipo", "menu")
      .order("versao", { ascending: false })
      .returns<Pick<ConteudoSite, "versao" | "publicado" | "created_at">[]>(),
    supabase.from("categorias").select("id, nome").eq("ativo", true).order("nome").returns<Pick<Categoria, "id" | "nome">[]>(),
  ]);

  const itens = (publicado?.dados as DadosMenu | undefined)?.itens ?? MENU_PADRAO.itens;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Menu</h1>
      <p className="mt-1 text-sm text-muted">
        Estrutura do menu de categorias exibido no topo do site. Itens do tipo &quot;Categoria&quot; geram o
        link automaticamente a partir da categoria vinculada — nunca digite a URL à mão para esses.
      </p>

      <div className="mt-6 rounded-md border border-zinc-200 bg-white p-6">
        <EditorMenu itensIniciais={itens} categorias={categorias ?? []} />
      </div>

      {versoes && versoes.length > 0 && <HistoricoConteudo versoes={versoes} onRestaurar={restaurarMenu} />}
    </div>
  );
}
