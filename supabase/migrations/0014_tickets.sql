-- Módulo básico de suporte/tickets — substitui o placeholder "Tickets
-- pendentes" da Central de ações do dashboard (Fase 4) por dado real.
--
-- Escopo deliberadamente enxuto: por enquanto só o admin cria tickets
-- manualmente (ex.: reclamação recebida por telefone/WhatsApp) — não
-- existe (ainda) formulário público pro cliente abrir ticket direto no
-- site. Por isso "cliente_id" é opcional: o ticket pode vir de alguém
-- ainda não cadastrado em "clientes".

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,
  pedido_id uuid references pedidos(id) on delete set null,
  assunto text not null,
  mensagem text not null,
  status text not null default 'aberto',
  prioridade text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table tickets is 'Ticket de suporte/atendimento — criado manualmente pelo admin por enquanto (sem formulário público ainda). "mensagem" é o relato inicial; a conversa continua em ticket_respostas.';
comment on column tickets.cliente_id is 'Opcional: o ticket pode vir de alguém ainda não cadastrado em clientes.';
comment on column tickets.pedido_id is 'Opcional: vincula o ticket a um pedido específico (ex.: reclamação sobre um envio).';
comment on column tickets.status is 'aberto | em_andamento | resolvido | fechado';
comment on column tickets.prioridade is 'baixa | normal | alta';

-- Acelera o filtro por status (listagem e o item "Tickets pendentes" do
-- dashboard, que conta status IN ('aberto', 'em_andamento')).
create index if not exists idx_tickets_status on tickets (status);

-- Mantém "updated_at" sempre atualizado em cada UPDATE (ex.: mudança de
-- status) — mesmo padrão já usado em "integracoes" (migração 0002).
create or replace function tickets_atualizar_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_tickets_updated_at on tickets;
create trigger trigger_tickets_updated_at
  before update on tickets
  for each row
  execute function tickets_atualizar_updated_at();

alter table tickets enable row level security;

-- Só o admin autenticado — igual a clientes_crm, nunca exposto a "anon"
-- (sem formulário público de abertura de ticket ainda).
drop policy if exists "Admin autenticado ve tickets" on tickets;
create policy "Admin autenticado ve tickets"
  on tickets for select
  to authenticated
  using (true);

drop policy if exists "Admin autenticado cria tickets" on tickets;
create policy "Admin autenticado cria tickets"
  on tickets for insert
  to authenticated
  with check (true);

drop policy if exists "Admin autenticado atualiza tickets" on tickets;
create policy "Admin autenticado atualiza tickets"
  on tickets for update
  to authenticated
  using (true)
  with check (true);

-- Sem política de DELETE: um ticket resolvido vira "fechado", nunca é
-- excluído — mesmo raciocínio já usado em marcas/categorias/eventos.

-- ---------------------------------------------------------------------------
-- Histórico de conversa dentro de um ticket
-- ---------------------------------------------------------------------------
create table if not exists ticket_respostas (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  autor text not null,
  mensagem text not null,
  created_at timestamptz not null default now()
);

comment on table ticket_respostas is 'Histórico de conversa de um ticket. "autor" registra de qual lado partiu a mensagem (relevante mesmo sem formulário público ainda: o admin pode registrar tanto uma resposta própria quanto algo que o cliente disse por telefone).';
comment on column ticket_respostas.autor is 'cliente | admin';

create index if not exists idx_ticket_respostas_ticket_id on ticket_respostas (ticket_id, created_at);

alter table ticket_respostas enable row level security;

drop policy if exists "Admin autenticado ve respostas de ticket" on ticket_respostas;
create policy "Admin autenticado ve respostas de ticket"
  on ticket_respostas for select
  to authenticated
  using (true);

drop policy if exists "Admin autenticado cria respostas de ticket" on ticket_respostas;
create policy "Admin autenticado cria respostas de ticket"
  on ticket_respostas for insert
  to authenticated
  with check (true);

-- Sem política de UPDATE/DELETE: a conversa é um log — mensagem enviada
-- não é editada nem apagada depois.
