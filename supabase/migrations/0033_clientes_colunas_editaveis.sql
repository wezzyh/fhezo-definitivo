-- APPSEC-010 — o cliente autenticado conseguia alterar QUALQUER coluna da
-- própria linha em "clientes".
--
-- Causa: a política "Cliente edita os proprios dados" (0018) é por LINHA
-- (auth_user_id = auth.uid()), e RLS não restringe colunas. Com a anon key
-- (pública) e o JWT da própria sessão, um PATCH direto no PostgREST trocava
-- documento (o CPF/CNPJ que vai para Asaas, Bling e nota fiscal), e-mail,
-- tipo (PF/PJ), id e created_at. auth_user_id já estava protegido pelo
-- "with check", que exige que continue = auth.uid().
--
-- Colunas de "clientes" e quem pode alterar cada uma depois desta migração:
--   id, created_at              → ninguém pela API (identidade técnica)
--   auth_user_id                → só o servidor (service_role), no cadastro
--   tipo, documento, email      → só o servidor (service_role), no cadastro;
--                                 mudança exige processo com verificação
--   nome, telefone, endereco_*  → o próprio cliente (tela /conta) e o admin
--
-- O admin usa o mesmo papel "authenticated", então pela API também só altera
-- as colunas liberadas. Hoje o painel NÃO edita "clientes" (dados cadastrais
-- são só leitura em /admin/clientes/[id]; o que o admin edita é
-- clientes_crm), então nada quebra. Se um dia o admin precisar corrigir
-- documento/e-mail, o caminho é uma função security definer que confere
-- is_admin() — não devolver o UPDATE amplo para "authenticated".
--
-- service_role (checkout/cadastro no servidor) e o SQL Editor não são
-- afetados. Coluna NOVA em "clientes" nasce sem UPDATE para o cliente.
--
-- Não altera nenhum dado. Idempotente.

begin;

-- anon (visitante) não tem política nenhuma em "clientes"; tira também os
-- privilégios, como defesa em profundidade.
revoke all on table clientes from anon;

-- Revogar o UPDATE da tabela também revoga qualquer UPDATE por coluna que
-- existisse (comportamento do Postgres), então o grant abaixo é a lista
-- completa do que o cliente pode alterar.
revoke insert, update, delete, truncate, references, trigger on table clientes from authenticated;
grant select on table clientes to authenticated;
grant update (
  nome,
  telefone,
  endereco_cep,
  endereco_rua,
  endereco_numero,
  endereco_complemento,
  endereco_bairro,
  endereco_cidade,
  endereco_uf
) on table clientes to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- Verificação (rode depois):
-- ---------------------------------------------------------------------------
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'clientes' and grantee in ('anon', 'authenticated')
--   order by grantee, privilege_type;
-- Esperado: uma única linha, "authenticated | SELECT".
--
-- select column_name from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'clientes'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE'
--   order by column_name;
-- Esperado: exatamente as 9 colunas liberadas acima.
--
-- Teste completo dos perfis: supabase/testes/identidade_appsec_003_004_010.sql
