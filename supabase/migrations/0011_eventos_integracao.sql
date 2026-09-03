-- Log de eventos de integrações externas (Asaas, Bling) — hoje essas
-- falhas são inteiramente efêmeras: o webhook do Asaas só devolve 500 sem
-- registrar nada (nem em log), e uma falha ao criar produto durante a
-- sincronização de estoque do Bling só aparece uma vez na resposta pra
-- quem clicou o botão, sem ficar em lugar nenhum consultável depois.
--
-- Não duplica o que já existe: falha ao enviar PEDIDO pro Bling já fica
-- em pedidos.bling_erro_sincronizacao (com botão de reenvio no /admin) —
-- esta tabela é só para as duas lacunas reais: webhook do Asaas e
-- sincronização de estoque do Bling. Consultada pelo card "Webhooks/
-- retries pendentes" do dashboard e pela tela /admin/eventos.
create table if not exists eventos_integracao (
  id uuid primary key default gen_random_uuid(),
  provedor text not null,
  evento text not null,
  sucesso boolean not null,
  mensagem_erro text,
  created_at timestamptz not null default now()
);

comment on table eventos_integracao is 'Log de eventos de integrações externas (Asaas, Bling) — sobretudo falhas de webhook/sincronização, hoje só visíveis efemeramente.';
comment on column eventos_integracao.provedor is 'Ex.: ''asaas'', ''bling''.';
comment on column eventos_integracao.evento is 'Ex.: ''webhook_pagamento'', ''sincronizar_estoque''.';

-- Acelera a consulta mais comum: falhas recentes, mais novas primeiro.
create index if not exists idx_eventos_integracao_falhas
  on eventos_integracao (created_at desc)
  where sucesso = false;

alter table eventos_integracao enable row level security;

drop policy if exists "Admin autenticado ve eventos de integracao" on eventos_integracao;
create policy "Admin autenticado ve eventos de integracao"
  on eventos_integracao for select
  to authenticated
  using (true);

-- Sem política de insert/update/delete: só o webhook do Asaas e a
-- sincronização do Bling gravam aqui, ambos via service_role (que ignora
-- RLS) — nunca o navegador do admin nem o site público.
