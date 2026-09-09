-- LanceZero — 0003_storage_avatar
-- Bucket de avatar e RLS por dono.
-- Referencias do plano de seguranca: secoes 55, 56, 57, 58 e 59.
--
-- Convencao de caminho, inviolavel:
--
--     <user_id>/<randomUUID>.webp
--
-- Com Supabase Auth o <user_id> e o uuid de auth.users, entao o caminho inteiro
-- passa a ser dois uuids: <uuid do dono>/<uuid do arquivo>.webp.
--
-- O caminho e derivado do auth.uid() da sessao e de um UUID gerado no servidor.
-- O nome de arquivo enviado pelo usuario NUNCA e usado (secao 58): ele e
-- entrada hostil, com path traversal, extensao dupla e unicode enganoso.
-- A policy abaixo transforma essa convencao em regra do banco: mesmo que o
-- servidor erre, um objeto fora do prefixo do dono nao entra.

-- ---------------------------------------------------------------------------
-- 1. Bucket
-- ---------------------------------------------------------------------------
--
-- Bucket privado. O avatar chega ao navegador por URL assinada de vida curta
-- ou por rota do servidor, nunca por URL publica adivinhavel.
--
-- Limites do plano: 2 MB e apenas JPEG, PNG e WEBP (secoes 55 e 56). SVG de
-- usuario nao entra: SVG executa script e viraria XSS armazenado.
-- Este limite e a ultima linha, nao a primeira: MIME, magic bytes, dimensoes e
-- reencode com strip de EXIF acontecem no servidor antes do upload (secao 57).
--
-- Ha tambem um motivo de custo: o plano gratuito do Supabase da 1 GB de
-- storage. Um teto por arquivo e o que impede alguns usuarios de consumirem a
-- cota inteira.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. RLS por dono
-- ---------------------------------------------------------------------------
--
-- storage.objects ja vem com RLS habilitada no Supabase. As policies abaixo
-- valem so para o bucket 'avatars' e comparam a primeira pasta do caminho com
-- auth.uid(). O `::text` existe porque storage.foldername devolve text[]: o
-- cast e do lado da identidade, nunca do lado do caminho vindo do usuario.
--
-- array_length(...) = 1 impede subpastas: o caminho tem exatamente
-- <prefixo>/<arquivo>, entao ninguem esconde estrutura dentro do proprio
-- prefixo nem sai dele.
--
-- O regex fecha o resto: prefixo e nome precisam ser UUIDs, e o arquivo termina
-- em .webp. Nome vindo do upload nao passa por essa forma.

drop policy if exists "avatares_select_own" on storage.objects;
create policy "avatares_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "avatares_insert_own" on storage.objects;
create policy "avatares_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.webp$'
);

drop policy if exists "avatares_update_own" on storage.objects;
create policy "avatares_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and array_length(storage.foldername(name), 1) = 1
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.webp$'
);

-- ---------------------------------------------------------------------------
-- 3. DELETE — deliberadamente ausente
-- ---------------------------------------------------------------------------
--
-- Mesmo criterio da 0002: nao existe policy de DELETE para o cliente.
--
-- Trocar de avatar e um INSERT do arquivo novo seguido da atualizacao de
-- profiles.avatar_path. A remocao do arquivo antigo e faxina de servidor, com a
-- secret key, depois que o caminho novo esta gravado. Assim uma requisicao
-- forjada nao consegue apagar o avatar de ninguem, e uma troca interrompida no
-- meio deixa um arquivo orfao — barato — em vez de um perfil sem imagem.
