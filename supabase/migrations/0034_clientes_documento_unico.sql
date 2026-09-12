-- APPSEC-003 (complemento) — um CPF/CNPJ = um cadastro em "clientes".
--
-- O cadastro (src/app/(site)/cadastro/actions.ts) passou a RECUSAR documento
-- que já existe, em vez de assumir a linha. A checagem no código tem uma
-- janela de corrida: dois cadastros simultâneos com o mesmo documento
-- passariam os dois. Este índice fecha a janela no banco — o segundo INSERT
-- falha com 23505, e o cadastro desfaz o login que acabou de criar.
--
-- O schema base de "clientes" foi criado no painel, antes das migrations, e
-- NÃO se sabe se "documento" já tem UNIQUE (REQUIRES VALIDATION — consulta
-- V-4 no fim do arquivo). Esta migração:
--   - não remove nem altera constraint ou índice existente;
--   - compara o documento NORMALIZADO (só dígitos), então "529.982.247-25"
--     e "52998224725" contam como o mesmo;
--   - ignora documento nulo ou vazio;
--   - se houver QUALQUER duplicado, NÃO cria o índice e só avisa (NOTICE).
--     Unificar cadastros é decisão humana, nunca automática.
--
-- Não altera dados. Idempotente.

do $$
declare
  duplicados integer;
begin
  select count(*) into duplicados
  from (
    select regexp_replace(documento, '\D', '', 'g')
    from clientes
    where documento is not null and regexp_replace(documento, '\D', '', 'g') <> ''
    group by 1
    having count(*) > 1
  ) d;

  if duplicados > 0 then
    raise notice 'PULADO: % CPF/CNPJ aparecem em mais de uma linha de "clientes". Índice NÃO criado e nada alterado. Rode a consulta V-5 do fim deste arquivo e resolva caso a caso.', duplicados;
    return;
  end if;

  create unique index if not exists uq_clientes_documento_normalizado
    on clientes ((regexp_replace(documento, '\D', '', 'g')))
    where documento is not null and regexp_replace(documento, '\D', '', 'g') <> '';

  raise notice 'OK: índice único uq_clientes_documento_normalizado ativo.';
end $$;

-- ---------------------------------------------------------------------------
-- Consultas de validação (só leitura)
-- ---------------------------------------------------------------------------
-- V-4 — o que já existe de único em "clientes" (constraint do schema base?):
-- select indexname, indexdef from pg_indexes where schemaname = 'public' and tablename = 'clientes';
-- select conname, contype, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.clientes'::regclass;
--
-- V-5 — documentos duplicados (se a migração avisou PULADO):
-- select regexp_replace(documento, '\D', '', 'g') as documento_normalizado,
--        count(*) as linhas,
--        array_agg(id order by created_at) as ids,
--        array_agg(auth_user_id order by created_at) as contas
-- from clientes
-- where documento is not null and regexp_replace(documento, '\D', '', 'g') <> ''
-- group by 1
-- having count(*) > 1;
--
-- V-6 — contas que assumiram histórico ANTERIOR à própria criação. É o sinal
-- de que o cadastro por CPF/CNPJ ou o login por e-mail (os dois removidos
-- agora) ligou uma conta a compras antigas. Revise à mão; NÃO desvincule
-- automaticamente:
-- select c.id, c.nome, c.email as email_cadastro, u.email as email_conta,
--        u.created_at as conta_criada_em, count(p.id) as pedidos_antes_da_conta
-- from clientes c
-- join auth.users u on u.id = c.auth_user_id
-- join pedidos p on p.cliente_id = c.id and p.created_at < u.created_at
-- group by c.id, c.nome, c.email, u.email, u.created_at
-- order by u.created_at desc;
