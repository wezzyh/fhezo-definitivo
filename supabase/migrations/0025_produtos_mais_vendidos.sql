-- Função pra seção "Produtos mais vendidos" da home (produtos_destaque,
-- modo "mais_vendidos", ver src/app/(site)/secoes-home.tsx) — soma
-- quantidade vendida por produto entre pedidos que representam venda de
-- verdade (exclui "pendente", que ainda não foi pago, e "cancelado").
--
-- SECURITY DEFINER: "pedido_itens"/"pedidos" não têm (nem devem ter)
-- política de RLS para "anon" — contêm dado de cliente. Esta função expõe
-- só o agregado (produto_id + total vendido), sem nenhum dado de
-- cliente/pedido, então é seguro chamá-la publicamente. search_path fixo
-- por segurança (padrão recomendado pra funções SECURITY DEFINER).
create or replace function produtos_mais_vendidos(p_limite integer default 8)
returns table (produto_id uuid, total_vendido bigint)
language sql
security definer
set search_path = public
stable
as $$
  select pi.produto_id, sum(pi.quantidade)::bigint as total_vendido
  from pedido_itens pi
  join pedidos p on p.id = pi.pedido_id
  where p.status not in ('pendente', 'cancelado')
  group by pi.produto_id
  order by total_vendido desc
  limit p_limite;
$$;

comment on function produtos_mais_vendidos is 'Agregado público (sem dado de cliente/pedido) de quantidade vendida por produto, usado pela seção "Produtos mais vendidos" da home. SECURITY DEFINER porque pedido_itens/pedidos não são legíveis por anon — só este agregado é exposto.';

grant execute on function produtos_mais_vendidos(integer) to anon, authenticated;
