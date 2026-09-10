import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { EditorContato } from "./editor-contato";
import { HistoricoConteudo } from "@/components/admin/historico-conteudo";
import { restaurarContato } from "./actions";
import { CONTATO_PADRAO } from "@/lib/conteudo/padroes";
import type { DadosContato } from "@/lib/conteudo/tipos";
import type { ConteudoSite } from "@/types/database";

export default async function AdminContatoPage() {
  const supabase = await criarClienteSupabaseServidor();

  const [{ data: publicado }, { data: versoes }] = await Promise.all([
    supabase.from("conteudo_site").select("*").eq("tipo", "contato").eq("publicado", true).maybeSingle<ConteudoSite>(),
    supabase
      .from("conteudo_site")
      .select("versao, publicado, created_at")
      .eq("tipo", "contato")
      .order("versao", { ascending: false })
      .returns<Pick<ConteudoSite, "versao" | "publicado" | "created_at">[]>(),
  ]);

  const dados = (publicado?.dados as DadosContato | undefined) ?? CONTATO_PADRAO;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Contato</h1>
      <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
        Telefone, WhatsApp, e-mail, endereço e redes sociais exibidos no cabeçalho e no rodapé do site — editar aqui
        atualiza os dois lugares de uma vez.
      </p>

      <div className="mt-6 max-w-xl rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <EditorContato dadosIniciais={dados} />
      </div>

      {versoes && versoes.length > 0 && <HistoricoConteudo versoes={versoes} onRestaurar={restaurarContato} />}
    </div>
  );
}
