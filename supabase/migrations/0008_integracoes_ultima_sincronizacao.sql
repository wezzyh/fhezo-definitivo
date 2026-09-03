-- Dashboard do /admin: card "Bling" mostra a data da última sincronização
-- de estoque bem-sucedida. Guardamos isso na própria tabela "integracoes"
-- (linha provedor = 'bling'), atualizada em sincronizarEstoqueBling (ver
-- src/app/admin/integracao/bling/actions.ts) toda vez que ela roda com
-- sucesso.

alter table integracoes
  add column if not exists ultima_sincronizacao timestamptz;

comment on column integracoes.ultima_sincronizacao is 'Data/hora da última sincronização de estoque bem-sucedida (hoje só usado pelo provedor ''bling'').';
