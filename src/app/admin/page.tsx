// TODO: quando houver mais de um administrador, adicionar aqui (ou no
// proxy, em src/proxy.ts) uma checagem de "role"/permissão, além da
// simples autenticação — hoje existe um único usuário admin.

import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import { buscarIntegracaoMelhorEnvio, montarUrlAutorizacaoMelhorEnvio } from "@/lib/integracoes/melhorenvio";

const cartoesResumo = [
  { titulo: "Produtos cadastrados", valor: "—" },
  { titulo: "Pedidos em aberto", valor: "—" },
  { titulo: "Clientes ativos", valor: "—" },
];

interface PaginaAdminProps {
  searchParams: Promise<{ integracao?: string; mensagem?: string }>;
}

export default async function PaginaAdmin({ searchParams }: PaginaAdminProps) {
  const { integracao: statusIntegracao, mensagem: mensagemIntegracao } = await searchParams;

  const supabase = await criarClienteSupabaseServidor();
  const integracaoMelhorEnvio = await buscarIntegracaoMelhorEnvio(supabase);

  const conectado = Boolean(integracaoMelhorEnvio?.access_token);
  const expiraEm = integracaoMelhorEnvio?.expira_em
    ? new Date(integracaoMelhorEnvio.expira_em).toLocaleString("pt-BR")
    : null;

  let urlAutorizacao: string | null = null;
  let erroConfiguracao: string | null = null;
  try {
    urlAutorizacao = montarUrlAutorizacaoMelhorEnvio();
  } catch (erro) {
    erroConfiguracao =
      erro instanceof Error ? erro.message : "Integração com o Melhor Envio não configurada.";
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cartoesResumo.map((cartao) => (
          <div key={cartao.titulo} className="rounded-md border border-zinc-200 bg-white p-5">
            <p className="text-sm font-medium text-muted">{cartao.titulo}</p>
            <p className="mt-2 text-2xl font-medium text-ink">{cartao.valor}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-md border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-ink">Integrações</h2>

        {statusIntegracao === "sucesso" && (
          <p className="mt-3 rounded-md bg-brand-green/10 px-3 py-2 text-sm text-brand-green-dark">
            {mensagemIntegracao ?? "Integração conectada com sucesso."}
          </p>
        )}
        {statusIntegracao === "erro" && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {mensagemIntegracao ?? "Não foi possível concluir a integração."}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between rounded-md border border-zinc-200 p-4">
          <div>
            <p className="text-sm font-medium text-ink">Melhor Envio</p>
            <p className="mt-1 text-sm text-muted">
              {conectado
                ? `Conectado. Token válido até ${expiraEm ?? "data desconhecida"}.`
                : "Não conectado. Conecte para habilitar o cálculo de frete no checkout."}
            </p>
          </div>

          {urlAutorizacao ? (
            <a
              href={urlAutorizacao}
              className="inline-flex items-center justify-center rounded-md bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-dark"
            >
              {conectado ? "Reconectar com Melhor Envio" : "Conectar com Melhor Envio"}
            </a>
          ) : (
            <p className="text-sm text-red-600">{erroConfiguracao}</p>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-md border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-muted">
        Área de gestão de produtos, pedidos e clientes será implementada aqui.
      </div>
    </div>
  );
}
