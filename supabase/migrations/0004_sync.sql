-- LanceZero — 0004_sync
-- Sincronizacao entre aparelhos: uma linha por usuario, o estado inteiro em jsonb.
-- Referencias do plano de seguranca: secoes 14 a 19, 69, 128 e 131.
-- Principio 9 do CLAUDE.md: local-first. Isto e COPIA, nunca fonte da verdade.
--
-- Depende da 0001, que cria public.set_updated_at(). Aplicar fora de ordem
-- falha no create trigger, que e o modo de falha desejado: barulhento.
--
-- ---------------------------------------------------------------------------
-- Por que UMA linha em jsonb, e nao tabelas normalizadas
-- ---------------------------------------------------------------------------
--
-- A versao normalizada existiria: partidas, tentativas de puzzle, cartoes de
-- revisao, log de revisao, mastery. Sao cinco ou seis tabelas, cada uma com
-- user_id, RLS, tres policies, grants e indice. Nada disso e dificil — o
-- problema e que cada uma delas e uma superficie nova onde alguem pode esquecer
-- o `user_id = auth.uid()` e criar um IDOR. O numero de lugares onde da para
-- errar cresce junto com o numero de tabelas.
--
-- Aqui a chave primaria E o user_id. Nao existe "id da linha" que o cliente
-- possa trocar por outro na URL, porque nao existe linha de outro usuario
-- alcancavel: a policy e a chave primaria dizem a mesma coisa.
--
-- E o documento nao precisa de serializacao nova. O app ja exporta e importa
-- todo o progresso como JSON em src/lib/storage/backup.ts, com teste de
-- round-trip que garante que IDs e SchedulerState voltam bit a bit. O servidor
-- guarda exatamente esse documento. Sincronizar passa a ser "subir o backup e
-- baixar o backup", um caminho que ja tem teste.
--
-- O custo assumido: o servidor nao consulta o conteudo. Nao da para perguntar
-- "quantos puzzles esse usuario errou" em SQL sem abrir o jsonb. Enquanto o
-- servidor for so um armario de backup, isso nao e perda. No dia em que o
-- produto quiser consulta server-side de verdade, esta tabela vira fonte de
-- migracao para o modelo normalizado — e ai o esforco se justifica.
--
-- ---------------------------------------------------------------------------
-- Estrategia de conflito: ultima escrita vence
-- ---------------------------------------------------------------------------
--
-- Dois aparelhos treinando offline geram dois documentos. O que subir por
-- ultimo sobrescreve o outro. Nao ha merge, e isso e decisao de produto ja
-- tomada, nao uma pendencia tecnica.
--
-- Merge de progresso pedagogico e dificil de verdade: dois SchedulerState do
-- mesmo cartao com revisoes diferentes nao tem uniao obvia, e um merge errado
-- corrompe o espacamento em silencio — o pior modo de falha possivel para um
-- app de revisao espacada. Ultima escrita vence perde dado de forma visivel e
-- previsivel, o que e preferivel.
--
-- updated_at e device_label existem para a UI poder avisar antes de sobrescrever:
-- "este aparelho tem progresso de 12/03; a nuvem tem progresso de 14/03 vindo de
-- 'celular'. Continuar?". Quem decide e o usuario, com a informacao na tela.
-- O backup local (exportar JSON) continua sendo a rede de seguranca de quem
-- escolher errado.

-- ---------------------------------------------------------------------------
-- 1. Tabela
-- ---------------------------------------------------------------------------

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  schema_version integer not null,
  device_label text,
  updated_at timestamptz not null default now(),

  -- Teto de tamanho. 500 MB de banco no plano gratuito dividido por poucos
  -- usuarios ainda e recurso finito, e um cliente com bug — laco que reenvia,
  -- lista que cresce sozinha — nao pode encher o banco de todo mundo.
  --
  -- Honestidade sobre a medida: pg_column_size devolve o tamanho ARMAZENADO,
  -- ja com a compressao do TOAST. JSON comprime muito bem, entao um documento
  -- de 2 MB armazenados pode vir de bem mais que 2 MB de texto. E o numero
  -- certo para proteger o BANCO, que e o recurso escasso aqui.
  constraint user_state_payload_max_bytes check (
    pg_column_size(payload) <= 2097152
  ),

  -- A segunda constraint fecha o outro lado: limita o documento cru, para que
  -- um payload absurdamente compressivel nao passe pela primeira. 8 MB e folga
  -- deliberada — quem chegar perto disso tem um problema de produto, nao de
  -- armazenamento, e o servidor deve recusar antes de virar rotina.
  constraint user_state_payload_max_bytes_cru check (
    octet_length(payload::text) <= 8388608
  ),

  constraint user_state_payload_e_objeto check (
    jsonb_typeof(payload) = 'object'
  ),

  constraint user_state_schema_version_positiva check (
    schema_version >= 1
  ),

  constraint user_state_device_label_tamanho check (
    device_label is null
    or char_length(device_label) between 1 and 40
  )
);

comment on table public.user_state is
  'Copia do backup local, uma linha por usuario. Servidor e armario, nao fonte da verdade (principio 9).';
comment on column public.user_state.payload is
  'Documento identico ao de src/lib/storage/backup.ts. O servidor nao interpreta o conteudo.';
comment on column public.user_state.schema_version is
  'BACKUP_VERSION que gerou o payload. Cliente antigo recusa versao futura em vez de adivinhar.';
comment on column public.user_state.device_label is
  'Rotulo escolhido pelo usuario, so para a UI de conflito. Nunca identificador de aparelho.';
comment on column public.user_state.updated_at is
  'Momento da ultima escrita. Base do aviso de "a nuvem esta mais nova que este aparelho".';

-- device_label e texto livre que vem do usuario e volta para a tela de outro
-- aparelho dele. Vale o mesmo da secao 53: escapar na renderizacao, nunca
-- renderizar como HTML. O limite de 40 caracteres reduz o estrago, nao o
-- substitui.

drop trigger if exists user_state_set_updated_at on public.user_state;
create trigger user_state_set_updated_at
  before update on public.user_state
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------------------------
--
-- Na mesma migration da tabela, de proposito: tabela com user_id sem RLS e
-- release blocker (regra 1 do ADR-0008), e separar as duas coisas em arquivos
-- diferentes cria uma janela em que a tabela existe desprotegida.

alter table public.user_state enable row level security;

drop policy if exists "users_select_own_state" on public.user_state;
create policy "users_select_own_state"
on public.user_state
for select
to authenticated
using (
  user_id = (select auth.uid())
);

drop policy if exists "users_insert_own_state" on public.user_state;
create policy "users_insert_own_state"
on public.user_state
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);

-- O upsert do cliente e `insert ... on conflict (user_id) do update`, entao as
-- duas policies sao exercidas na mesma chamada. O WITH CHECK do update impede
-- reescrever user_id e doar a linha para outra conta.
drop policy if exists "users_update_own_state" on public.user_state;
create policy "users_update_own_state"
on public.user_state
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);

-- ---------------------------------------------------------------------------
-- 3. DELETE — deliberadamente ausente
-- ---------------------------------------------------------------------------
--
-- Mesmo criterio da 0002. "Parar de sincronizar" e desligar a sincronizacao no
-- aparelho, nao apagar a linha pelo navegador. Apagar a copia da nuvem faz
-- parte da exclusao de conta, que roda no servidor com step-up de autenticacao
-- (secao 49) — e que aqui acontece de graca pelo `on delete cascade` quando a
-- linha de auth.users cai.

-- ---------------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------------

revoke all on public.user_state from anon;
revoke all on public.user_state from authenticated;

-- anon nao recebe nada: sincronizacao exige conta por definicao.
grant select, insert, update on public.user_state to authenticated;
