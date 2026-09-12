-- Corrige a chave estrangeira clientes.auth_user_id → auth.users em
-- produção.
--
-- A migração 0018 criou a coluna com
--   add column if not exists auth_user_id uuid references auth.users(id) on delete set null
-- mas, em produção, excluir um usuário em Authentication > Users falhava com
--   23503: ... violates foreign key constraint "clientes_auth_user_id_fkey"
-- ou seja, a restrição existente é "no action", não "set null". Causa
-- provável: a coluna já existia quando a 0018 rodou (criada antes pelo
-- painel), e "add column if not exists" pula a definição INTEIRA — inclusive
-- o "references ... on delete set null" — sem erro nenhum.
--
-- Comportamento pretendido (o da 0018): excluir o login NÃO apaga o
-- cliente nem o histórico de pedidos — só desfaz o vínculo com a conta,
-- e a linha volta a ser um cliente "convidado" (auth_user_id null).
--
-- Idempotente: pode rodar mais de uma vez.

alter table clientes drop constraint if exists clientes_auth_user_id_fkey;

alter table clientes
  add constraint clientes_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users(id) on delete set null;

-- Verificação: deve devolver 'n' (set null). 'a' seria o "no action" antigo.
-- select confdeltype from pg_constraint where conname = 'clientes_auth_user_id_fkey';
