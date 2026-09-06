-- Bucket único para todo upload de imagem feito pelo admin (produtos,
-- banners, e o que mais vier a precisar) — em vez de um bucket por
-- entidade, já que a única diferença entre elas é o prefixo de pasta
-- dentro do bucket (ex.: "produtos/<uuid>.webp", "banners/<uuid>.webp").
-- Bucket "public": leitura via URL pública não passa pelas políticas de
-- RLS abaixo (é assim que a Storage do Supabase trata bucket público) —
-- necessário porque as imagens precisam aparecer pra qualquer visitante
-- do site, sem sessão. Escrita (insert/update/delete) fica restrita a
-- "authenticated", que neste projeto é só o único usuário admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-imagens',
  'admin-imagens',
  true,
  5242880, -- 5 MB, mesmo limite validado no client antes do upload
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Leitura pública explícita (redundante com bucket public=true, mas
-- mantida por consistência com o padrão do projeto de sempre declarar a
-- política em vez de depender só da flag do bucket).
create policy "admin_imagens_leitura_publica"
  on storage.objects for select
  using (bucket_id = 'admin-imagens');

create policy "admin_imagens_insercao_admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'admin-imagens');

create policy "admin_imagens_atualizacao_admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'admin-imagens')
  with check (bucket_id = 'admin-imagens');

create policy "admin_imagens_exclusao_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'admin-imagens');
