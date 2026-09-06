import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { EditorFooter } from "./editor-footer";
import { HistoricoConteudo } from "@/components/admin/historico-conteudo";
import { restaurarFooter } from "./actions";
import { FOOTER_PADRAO } from "@/lib/conteudo/padroes";
import type { DadosFooter } from "@/lib/conteudo/tipos";
import type { ConteudoSite } from "@/types/database";

export default async function AdminFooterPage() {
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: publicado }, { data: versoes }] = await Promise.all([
    supabase.from("conteudo_site").select("*").eq("tipo", "footer").eq("publicado", true).maybeSingle<ConteudoSite>(),
    supabase
      .from("conteudo_site")
      .select("versao, publicado, created_at")
      .eq("tipo", "footer")
      .order("versao", { ascending: false })
      .returns<Pick<ConteudoSite, "versao" | "publicado" | "created_at">[]>(),
  ]);

  const dados = (publicado?.dados as DadosFooter | undefined) ?? FOOTER_PADRAO;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Footer</h1>
      <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
        Ícones de forma de pagamento e selos de segurança exibidos no rodapé do site. Enquanto uma lista estiver
        vazia, a faixa correspondente simplesmente não aparece.
      </p>

      <div className="mt-6">
        <EditorFooter dadosIniciais={dados} />
      </div>

      {versoes && versoes.length > 0 && <HistoricoConteudo versoes={versoes} onRestaurar={restaurarFooter} />}
    </div>
  );
}
