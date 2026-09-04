import Link from "next/link";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";
import {
  buscarIntegracaoMelhorEnvio,
  montarUrlAutorizacaoMelhorEnvio,
  obterTokenValidoMelhorEnvio,
} from "@/lib/integracoes/melhorenvio";
import { buscarIntegracaoBling, montarUrlAutorizacaoBling, obterTokenValidoBling } from "@/lib/integracoes/bling";
import { BotaoSincronizarEstoqueBling } from "./bling/botao-sincronizar-estoque";
import { Card } from "@/components/ui/card";

// Status e conexão das integrações externas (Melhor Envio, Bling) — antes
// vivia dentro de /admin (Dashboard), extraído pra cá pra o Dashboard
// ficar só com métricas e Central de ações. Os callbacks OAuth
// (integracao/bling/callback, integracao/melhorenvio/callback) redirecionam
// pra esta página (não mais pro Dashboard) ao concluir a conexão.

interface AdminIntegracaoPageProps {
  searchParams: Promise<{
    integracao?: string;
    integracaoBling?: string;
    mensagem?: string;
  }>;
}

export default async function AdminIntegracaoPage({ searchParams }: AdminIntegracaoPageProps) {
  const {
    integracao: statusIntegracao,
    integracaoBling: statusIntegracaoBling,
    mensagem: mensagemIntegracao,
  } = await searchParams;

  const supabase = await criarClienteSupabaseServidor();

  const [integracaoMelhorEnvio, integracaoBling, tokenMelhorEnvioValido, tokenBlingValido] = await Promise.all([
    buscarIntegracaoMelhorEnvio(supabase),
    buscarIntegracaoBling(supabase),
    // Tenta de verdade renovar o token (mesmo mecanismo usado sempre que o
    // app faz uma chamada real ao Melhor Envio/Bling) em vez de só
    // comparar expira_em com agora: o access_token é de curta duração e
    // expira sozinho entre usos, sem que isso signifique problema nenhum —
    // o que importa pra saber se a integração está "com erro" de verdade
    // é se dá pra RENOVAR (refresh_token ainda válido), não se o último
    // access_token já venceu.
    obterTokenValidoMelhorEnvio(supabase),
    obterTokenValidoBling(supabase),
  ]);

  const conectado = Boolean(integracaoMelhorEnvio?.access_token);
  const expiraEm = integracaoMelhorEnvio?.expira_em
    ? new Date(integracaoMelhorEnvio.expira_em).toLocaleString("pt-BR")
    : null;
  const melhorEnvioComErro = conectado && !tokenMelhorEnvioValido;

  let urlAutorizacao: string | null = null;
  let erroConfiguracao: string | null = null;
  try {
    urlAutorizacao = montarUrlAutorizacaoMelhorEnvio();
  } catch (erro) {
    erroConfiguracao =
      erro instanceof Error ? erro.message : "Integração com o Melhor Envio não configurada.";
  }

  const conectadoBling = Boolean(integracaoBling?.access_token);
  const expiraEmBling = integracaoBling?.expira_em
    ? new Date(integracaoBling.expira_em).toLocaleString("pt-BR")
    : null;
  const blingComErro = conectadoBling && !tokenBlingValido;
  const ultimaSincronizacaoBling = integracaoBling?.ultima_sincronizacao
    ? new Date(integracaoBling.ultima_sincronizacao).toLocaleString("pt-BR")
    : null;

  let urlAutorizacaoBling: string | null = null;
  let erroConfiguracaoBling: string | null = null;
  try {
    urlAutorizacaoBling = montarUrlAutorizacaoBling();
  } catch (erro) {
    erroConfiguracaoBling = erro instanceof Error ? erro.message : "Integração com o Bling não configurada.";
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text)]">Integrações</h1>
        <Link href="/admin" className="text-sm font-medium text-[var(--admin-green-text)] hover:underline">
          Voltar ao dashboard
        </Link>
      </div>
      <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
        Status de conexão do Melhor Envio (cálculo de frete) e do Bling (estoque e pedidos de venda).
      </p>

      <Card className="mt-6 p-6">
        {statusIntegracao === "sucesso" && (
          <p className="mb-4 rounded-md bg-[var(--admin-green)]/15 px-3 py-2 text-sm text-[var(--admin-green-text)]">
            {mensagemIntegracao ?? "Integração conectada com sucesso."}
          </p>
        )}
        {statusIntegracao === "erro" && (
          <p className="mb-4 rounded-md bg-[var(--admin-danger)]/15 px-3 py-2 text-sm text-[var(--admin-danger)]">
            {mensagemIntegracao ?? "Não foi possível concluir a integração."}
          </p>
        )}
        {statusIntegracaoBling === "sucesso" && (
          <p className="mb-4 rounded-md bg-[var(--admin-green)]/15 px-3 py-2 text-sm text-[var(--admin-green-text)]">
            {mensagemIntegracao ?? "Integração conectada com sucesso."}
          </p>
        )}
        {statusIntegracaoBling === "erro" && (
          <p className="mb-4 rounded-md bg-[var(--admin-danger)]/15 px-3 py-2 text-sm text-[var(--admin-danger)]">
            {mensagemIntegracao ?? "Não foi possível concluir a integração."}
          </p>
        )}

        <div className="flex flex-col gap-4 rounded-md border border-[var(--admin-border)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--admin-text)]">Melhor Envio</p>
            <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
              {conectado
                ? melhorEnvioComErro
                  ? "Não foi possível renovar o token automaticamente. Reconecte para voltar a calcular frete."
                  : `Conectado. Token válido até ${expiraEm ?? "data desconhecida"}.`
                : "Não conectado. Conecte para habilitar o cálculo de frete no checkout."}
            </p>
          </div>

          {urlAutorizacao ? (
            <a
              href={urlAutorizacao}
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-[var(--admin-green)] px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--admin-green-hover)]"
            >
              {conectado ? "Reconectar com Melhor Envio" : "Conectar com Melhor Envio"}
            </a>
          ) : (
            <p className="text-sm text-[var(--admin-danger)]">{erroConfiguracao}</p>
          )}
        </div>

        <div className="mt-4 rounded-md border border-[var(--admin-border)] p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--admin-text)]">Bling (ERP)</p>
              <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
                {conectadoBling
                  ? blingComErro
                    ? "Não foi possível renovar o token automaticamente. Reconecte para voltar a sincronizar."
                    : `Conectado. Token válido até ${expiraEmBling ?? "data desconhecida"}.`
                  : "Não conectado. Conecte para sincronizar estoque e enviar pedidos pagos."}
              </p>
              {conectadoBling && (
                <p className="mt-1 text-xs text-[var(--admin-text-secondary)]">
                  {ultimaSincronizacaoBling
                    ? `Última sincronização de estoque: ${ultimaSincronizacaoBling}`
                    : "Ainda sem sincronização de estoque."}
                </p>
              )}
            </div>

            {urlAutorizacaoBling ? (
              <a
                href={urlAutorizacaoBling}
                className="inline-flex shrink-0 items-center justify-center rounded-md bg-[var(--admin-green)] px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--admin-green-hover)]"
              >
                {conectadoBling ? "Reconectar com Bling" : "Conectar com Bling"}
              </a>
            ) : (
              <p className="text-sm text-[var(--admin-danger)]">{erroConfiguracaoBling}</p>
            )}
          </div>

          {conectadoBling && (
            <div className="mt-4 border-t border-[var(--admin-border)] pt-4">
              <BotaoSincronizarEstoqueBling />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
