-- APPSEC-028 — tokens OAuth salvos sem o ambiente (sandbox/produção) que os
-- emitiu. Sem essa informação, um token de sandbox continuaria sendo usado
-- depois que o site passasse a falar com o Melhor Envio de produção.
--
-- ⚠️ RODAR ANTES DO DEPLOY do código que lê/grava esta coluna
-- (src/lib/integracoes/melhorenvio.ts). Se o deploy vier antes, o código não
-- enxerga o ambiente do token, trata como "de outro ambiente" e o frete fica
-- indisponível (falha fechado — o checkout não finaliza) até esta migração
-- rodar.
--
-- Idempotente: pode rodar mais de uma vez.

alter table integracoes add column if not exists ambiente text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'integracoes_ambiente_valido') then
    alter table integracoes
      add constraint integracoes_ambiente_valido check (ambiente is null or ambiente in ('sandbox', 'production'));
  end if;
end $$;

comment on column integracoes.ambiente is 'Ambiente do provedor que emitiu os tokens: ''sandbox'' ou ''production''. O código recusa usar um token de ambiente diferente do configurado (MELHOR_ENVIO_ENV). Null = desconhecido (nunca usado).';

-- Backfill do token do Melhor Envio já salvo. Não é suposição: o histórico
-- do git mostra que o OAuth do Melhor Envio neste projeto só existiu
-- apontando para sandbox.melhorenvio.com.br (commits dcd3c9e e d5a50d5, sem
-- nenhuma URL de produção em nenhum commit). Todo token salvo até aqui veio,
-- portanto, do sandbox. Só preenche onde está nulo — não sobrescreve nada.
update integracoes
set ambiente = 'sandbox'
where provedor = 'melhor_envio' and ambiente is null;

-- Bling não tem ambiente de sandbox (só produção) e o código não confere o
-- ambiente dele — fica nulo, sem efeito.

-- Verificação:
-- select provedor, ambiente, expira_em from integracoes;
-- Esperado: melhor_envio = 'sandbox' (até reconectar em produção, quando o
-- próprio código grava 'production').
