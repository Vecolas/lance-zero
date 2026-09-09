-- LanceZero — 0002_rls
-- Row Level Security e grants das tabelas de perfil.
-- Referencias do plano de seguranca: secoes 14, 15, 16, 17, 18, 19, 94, 95 e 131.
--
-- Regra 1 do ADR-0008: nunca desabilitar RLS, nem "temporariamente". Tabela com
-- user_id sem RLS e release blocker. O teste tests/unit/security-rls.test.ts le
-- estes arquivos como texto e falha se alguem afrouxar o que esta escrito aqui.
--
-- O que esta camada garante: um erro isolado na aplicacao nao basta para vazar
-- dado de outro usuario. Ela nao promete que "dados nunca vazam".

-- ---------------------------------------------------------------------------
-- 1. Ligar RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.linked_chess_accounts enable row level security;
alter table public.reserved_usernames enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Policies — profiles
-- ---------------------------------------------------------------------------
--
-- A identidade nunca vem do corpo da requisicao. Com Supabase Auth ela vem de
-- auth.uid(), que le o `sub` do JWT que o proprio Supabase emitiu e verificou,
-- e devolve uuid — o mesmo tipo da coluna user_id, sem cast no meio.
--
-- O `select` em volta faz o Postgres avaliar a expressao uma vez por consulta
-- em vez de uma vez por linha.
--
-- Sessao ausente ou token invalido faz auth.uid() devolver null, e `user_id =
-- null` nao e verdadeiro para linha nenhuma: o modo de falha e negar.

drop policy if exists "users_select_own_profile" on public.profiles;
create policy "users_select_own_profile"
on public.profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
);

drop policy if exists "users_insert_own_profile" on public.profiles;
create policy "users_insert_own_profile"
on public.profiles
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);

-- O USING decide quais linhas o UPDATE alcanca; o WITH CHECK decide o que pode
-- resultar dele. Sem o WITH CHECK, um usuario poderia reescrever user_id e doar
-- a propria linha para outra conta. Os dois sao obrigatorios.
drop policy if exists "users_update_own_profile" on public.profiles;
create policy "users_update_own_profile"
on public.profiles
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);

-- ---------------------------------------------------------------------------
-- 3. Policies — user_settings
-- ---------------------------------------------------------------------------

drop policy if exists "users_select_own_settings" on public.user_settings;
create policy "users_select_own_settings"
on public.user_settings
for select
to authenticated
using (
  user_id = (select auth.uid())
);

drop policy if exists "users_insert_own_settings" on public.user_settings;
create policy "users_insert_own_settings"
on public.user_settings
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);

drop policy if exists "users_update_own_settings" on public.user_settings;
create policy "users_update_own_settings"
on public.user_settings
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);

-- ---------------------------------------------------------------------------
-- 4. Policies — linked_chess_accounts
-- ---------------------------------------------------------------------------

drop policy if exists "users_select_own_linked_accounts" on public.linked_chess_accounts;
create policy "users_select_own_linked_accounts"
on public.linked_chess_accounts
for select
to authenticated
using (
  user_id = (select auth.uid())
);

drop policy if exists "users_insert_own_linked_accounts" on public.linked_chess_accounts;
create policy "users_insert_own_linked_accounts"
on public.linked_chess_accounts
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);

drop policy if exists "users_update_own_linked_accounts" on public.linked_chess_accounts;
create policy "users_update_own_linked_accounts"
on public.linked_chess_accounts
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);

-- ---------------------------------------------------------------------------
-- 5. Policies — reserved_usernames
-- ---------------------------------------------------------------------------
--
-- Nao contem dado de usuario: e a lista fechada de nomes proibidos. Precisa ser
-- legivel por quem escreve em profiles, senao o trigger de validacao levanta
-- erro de permissao e nenhum perfil e criado.
--
-- Nao usa `using (true)` de proposito. A leitura exige sessao autenticada, o
-- que mantem a lista fora do alcance de visitante anonimo e mantem a regra
-- "toda policy compara com auth.uid()" valida sem excecao.

drop policy if exists "authenticated_select_reserved_usernames" on public.reserved_usernames;
create policy "authenticated_select_reserved_usernames"
on public.reserved_usernames
for select
to authenticated
using (
  (select auth.uid()) is not null
);

-- Escrever na lista de reservados e operacao administrativa: sem policy de
-- INSERT, UPDATE ou DELETE, so a secret key (que contorna RLS) altera a lista.

-- ---------------------------------------------------------------------------
-- 6. DELETE — deliberadamente ausente
-- ---------------------------------------------------------------------------
--
-- Secao 18 do plano: nao existe policy de DELETE para o cliente em nenhuma
-- destas tabelas, e isso e intencional.
--
-- Sem policy, a RLS nega por padrao: mesmo com grant, um DELETE vindo do
-- navegador nao apaga linha nenhuma.
--
-- Por que a exclusao e operacao de servidor:
--   1. apagar conta e irreversivel e precisa de step-up de autenticacao
--      (secao 49), nao apenas de uma sessao valida;
--   2. a exclusao atravessa Postgres e Storage e precisa ser orquestrada, com
--      falha parcial registrada e retomavel (secao 75);
--   3. exclusao acidental por bug de UI ou por CSRF vira perda de dado do
--      usuario, nao apenas um incidente tecnico.
--
-- A rotina de exclusao roda no servidor, com a secret key, apagando a linha de
-- auth.users; o `on delete cascade` das tabelas leva o resto junto. Quem
-- precisar de "remover minha conta" implementa esse fluxo. Ninguem resolve isso
-- adicionando uma policy de DELETE aqui.

-- ---------------------------------------------------------------------------
-- 7. Grants
-- ---------------------------------------------------------------------------
--
-- RLS NAO SUBSTITUI GRANT. Sao duas camadas independentes:
--   - o grant decide se o papel pode tocar na tabela;
--   - a RLS decide quais linhas ele enxerga.
-- Tabela com RLS bem escrita e grant largo continua errada, porque um dia
-- alguem cria uma policy permissiva e o grant ja estava aberto esperando.
--
-- Comecamos revogando tudo e devolvendo so o necessario (secao 19).

revoke all on public.profiles from anon;
revoke all on public.user_settings from anon;
revoke all on public.linked_chess_accounts from anon;
revoke all on public.reserved_usernames from anon;

revoke all on public.profiles from authenticated;
revoke all on public.user_settings from authenticated;
revoke all on public.linked_chess_accounts from authenticated;
revoke all on public.reserved_usernames from authenticated;

-- anon: nenhum grant nestas tabelas.
--
-- Perfil publico (/u/<username>) nao e lido direto pelo navegador anonimo. Ele
-- e montado no servidor pelo Data Access Layer, que aplica o DTO de
-- PublicProfile (secoes 25, 126 e 127) e devolve apenas username, display name,
-- avatar e rating. user_id, visibilidade e metadado interno nunca saem.
--
-- O custo desta escolha e uma consulta a mais no servidor. O ganho e que
-- "publicar o perfil" nunca vira "expor a tabela": nao existe caminho em que o
-- papel anonimo fale com estas tabelas.

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.user_settings to authenticated;
grant select, insert, update on public.linked_chess_accounts to authenticated;
grant select on public.reserved_usernames to authenticated;

-- DELETE nao aparece em nenhum grant acima, de proposito: o cliente e barrado
-- duas vezes, pelo grant e pela ausencia de policy.

-- Tabela nova criada por este papel nao herda permissao por acidente. Quem
-- adicionar tabela precisa escrever o grant, e ao escrever passa pela revisao
-- de seguranca que a secao 131 exige.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on tables from authenticated;
