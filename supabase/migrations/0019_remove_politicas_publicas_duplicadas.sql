-- Limpeza: a migration 0018 criou "Cliente ve os proprios dados" (clientes)
-- e "Cliente ve os proprios pedidos" (pedidos), ambas "to authenticated" —
-- mas não sabia (nem tinha como saber, sem acesso ao banco real) que já
-- existiam duas políticas antigas com a MESMA condição, criadas antes de
-- haver controle de migration (Bloco 1), só que com role "public" em vez
-- de "authenticated": "cliente ve proprio cadastro" (clientes) e
-- "cliente ve proprios pedidos" (pedidos). O discovery dinâmico da 0018
-- só procurava políticas com role "authenticated" (`roles @> array
-- ['authenticated']`), por isso não pegou essas — role "public" não bate
-- nesse filtro.
--
-- Por que é seguro remover sem mudar comportamento nenhum:
-- "to public" cobre TODO mundo, inclusive "anon" — mas a condição de
-- ambas é `... = auth.uid()`, e para uma requisição anônima auth.uid() é
-- NULL. Qualquer comparação "coluna = NULL" nunca é verdadeira em SQL
-- (nem "NULL = NULL"), então essas políticas nunca liberavam nada pra
-- "anon" na prática — só pareciam mais abertas do que eram. Para
-- "authenticated", a condição é idêntica à política nova da 0018:
-- políticas permissivas do Postgres se combinam com OR, então ter as
-- duas com a mesma condição não muda quem enxerga o quê, só duplica a
-- checagem. Removê-las não abre nem fecha acesso nenhum.
--
-- Os nomes exatos abaixo são os que você leu em pg_policies. Como
-- segurança extra (caso a grafia/capitalização real seja um pouco
-- diferente do que foi transcrito), o bloco dinâmico depois também
-- descobre e remove qualquer política remanescente com role "public" em
-- "clientes"/"pedidos" — sem tocar em nenhuma política "anon" ou
-- "authenticated" existente.

drop policy if exists "cliente ve proprio cadastro" on clientes;
drop policy if exists "cliente ve proprios pedidos" on pedidos;

do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('clientes', 'pedidos')
      and roles = array['public']::name[]
  loop
    raise notice 'Removendo política pública remanescente: % em %', pol.policyname, pol.tablename;
    execute format('drop policy %I on %I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Verificação (rode ANTES e DEPOIS de aplicar esta migração e compare):
-- ---------------------------------------------------------------------------
-- select tablename, policyname, roles, qual from pg_policies
--   where schemaname = 'public' and tablename in ('produtos','clientes','pedidos','pedido_itens')
--   order by tablename, policyname;
--
-- Esperado DEPOIS: nenhuma linha com roles = '{public}' em "clientes" ou
-- "pedidos" — só "anon"/"authenticated" restantes, e as políticas
-- "authenticated" (admin + "Cliente ve os proprios ...") continuam
-- exatamente como estavam.
