-- LanceZero — 0001_perfil
-- Estrutura de perfil, preferencias e contas de xadrez vinculadas.
-- Referencias do plano de seguranca: secoes 9, 10, 11, 12, 13, 78, 128, 130 e 131.
--
-- Esta migration cria APENAS estrutura. A RLS e os grants estao em 0002_rls.sql.
-- As duas sao inseparaveis: tabela com user_id sem RLS e release blocker
-- (secao 14 do plano, regra 1 do ADR-0008). Nunca aplique a 0001 sozinha em um
-- projeto que ja receba trafego.
--
-- Dados proibidos aqui (secao 13): senha, hash de senha, sessao, refresh token,
-- JWT do Clerk, segredo de MFA, secret do Supabase, secret do Clerk. Nenhuma
-- coluna abaixo guarda credencial, e nenhuma deve passar a guardar.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Funcoes auxiliares
-- ---------------------------------------------------------------------------

-- Mantem updated_at sem depender do cliente.
-- Nao e SECURITY DEFINER (secao 130): roda com o privilegio de quem escreveu a
-- linha, e o search_path e fixo para nao ser sequestrado por um schema temporario.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger de updated_at. Roda com o privilegio do chamador, search_path fixo (secao 130).';

-- ---------------------------------------------------------------------------
-- Usernames reservados
-- ---------------------------------------------------------------------------

-- Lista fechada de nomes que ninguem pode registrar. Guardada sempre em
-- minusculas; a comparacao no trigger normaliza o valor recebido.
create table if not exists public.reserved_usernames (
  username text primary key,
  motivo text not null default 'reservado pela plataforma',
  constraint reserved_usernames_minusculo check (username = lower(username)),
  constraint reserved_usernames_formato check (username ~ '^[a-z0-9_-]{1,24}$')
);

comment on table public.reserved_usernames is
  'Usernames que a plataforma reserva. Nao contem dado de usuario, logo nao tem user_id.';

insert into public.reserved_usernames (username)
values
  ('admin'),
  ('administrator'),
  ('support'),
  ('staff'),
  ('moderator'),
  ('lancezero'),
  ('security'),
  ('api')
on conflict (username) do nothing;

-- Fail closed por construcao: se o papel que executa o INSERT em profiles nao
-- puder ler reserved_usernames, o EXISTS levanta erro de permissao e a escrita
-- falha. O modo de falha e negar, nunca aceitar um username reservado.
create or replace function public.assert_username_permitido()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.username is null then
    return new;
  end if;

  if exists (
    select 1
    from public.reserved_usernames as reservado
    where reservado.username = lower(new.username)
  ) then
    raise exception 'username reservado e nao pode ser usado: %', new.username
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.assert_username_permitido() is
  'Bloqueia usernames reservados. Roda com o privilegio do chamador, search_path fixo (secao 130).';

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- user_id e o "sub" do Clerk (secao 6). Nunca email, nunca username, nunca id
-- sequencial. E texto porque o identificador do Clerk e opaco.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  username text unique,
  display_name text,
  avatar_path text,
  rating_estimate integer,
  rating_source text,
  profile_visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_id_formato check (
    user_id ~ '^[A-Za-z0-9_-]{6,128}$'
  ),
  constraint profile_rating_range check (
    rating_estimate is null
    or rating_estimate between 100 and 4000
  ),
  constraint profiles_username_formato check (
    username is null
    or username ~ '^[A-Za-z0-9_-]{3,24}$'
  ),
  constraint profiles_display_name_tamanho check (
    display_name is null
    or char_length(display_name) between 1 and 48
  ),
  constraint profiles_rating_source_valido check (
    rating_source is null
    or rating_source in ('auto_declarado', 'diagnostico', 'lichess', 'chesscom')
  ),
  constraint profiles_visibility_valido check (
    profile_visibility in ('private', 'public')
  ),
  constraint profiles_avatar_path_do_dono check (
    avatar_path is null
    or (
      avatar_path like user_id || '/%'
      and strpos(avatar_path, '..') = 0
      and strpos(avatar_path, chr(92)) = 0
    )
  )
);

comment on table public.profiles is
  'Perfil publico-opcional do usuario. profile_visibility nasce private (secao 78).';
comment on column public.profiles.user_id is
  'sub do Clerk. Comparado com auth.jwt()->>''sub'' na RLS. Nunca vem do formulario.';
comment on column public.profiles.avatar_path is
  'Caminho no bucket avatars, sempre <user_id>/<uuid>.webp. Derivado do user_id, nunca do nome enviado (secao 58).';
comment on column public.profiles.profile_visibility is
  'private por padrao. Perfil publico exige escolha explicita do usuario (secao 78).';

-- Username e case-preserving para exibicao, mas unico sem diferenciar caixa:
-- "Admin" e "admin" nao podem coexistir.
create unique index if not exists profiles_username_lower_uniq
  on public.profiles (lower(username));

create index if not exists profiles_visibility_idx
  on public.profiles (profile_visibility);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists profiles_username_permitido on public.profiles;
create trigger profiles_username_permitido
  before insert or update of username on public.profiles
  for each row
  execute function public.assert_username_permitido();

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------

-- Tabela sempre privada: nao existe visibilidade publica de preferencia.
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  language text not null default 'pt-BR',
  theme text not null default 'system',
  board_theme text not null default 'paper',
  piece_theme text not null default 'classico',
  timezone text not null default 'America/Sao_Paulo',
  training_reminders boolean not null default false,
  analytics_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_user_id_formato check (
    user_id ~ '^[A-Za-z0-9_-]{6,128}$'
  ),
  constraint user_settings_language_valido check (
    language in ('pt-BR', 'en')
  ),
  constraint user_settings_theme_valido check (
    theme in ('system', 'light', 'dark')
  ),
  constraint user_settings_board_theme_valido check (
    board_theme in ('paper', 'graphite')
  ),
  constraint user_settings_piece_theme_valido check (
    piece_theme in ('classico', 'contorno')
  ),
  constraint user_settings_timezone_tamanho check (
    char_length(timezone) between 1 and 64
  )
);

comment on table public.user_settings is
  'Preferencias privadas. Opt-ins nascem false: consentimento e ato explicito (secao 78).';

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- linked_chess_accounts
-- ---------------------------------------------------------------------------

-- Nunca existe coluna de senha aqui. Vinculo se faz por API publica, OAuth
-- oficial ou username publico (secao 12). Pedir a senha do Chess.com/Lichess e
-- proibido, e a ausencia de coluna torna o erro dificil de cometer sem migration.
create table if not exists public.linked_chess_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null,
  provider_username text not null,
  provider_user_id text,
  verified boolean not null default false,
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint linked_chess_accounts_user_id_formato check (
    user_id ~ '^[A-Za-z0-9_-]{6,128}$'
  ),
  constraint linked_chess_accounts_provider_valido check (
    provider in ('lichess', 'chesscom')
  ),
  constraint linked_chess_accounts_username_tamanho check (
    char_length(provider_username) between 1 and 64
  ),
  constraint linked_chess_accounts_unico unique (user_id, provider)
);

comment on table public.linked_chess_accounts is
  'Vinculo com contas externas. Sem credencial: nunca pedimos senha de terceiro (secao 12).';

create index if not exists linked_chess_accounts_user_idx
  on public.linked_chess_accounts (user_id);

drop trigger if exists linked_chess_accounts_set_updated_at on public.linked_chess_accounts;
create trigger linked_chess_accounts_set_updated_at
  before update on public.linked_chess_accounts
  for each row
  execute function public.set_updated_at();
