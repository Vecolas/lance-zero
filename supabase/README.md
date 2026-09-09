# Supabase — schema, RLS e grants do LanceZero

Este diretório contém as migrations do banco de perfil. Elas implementam o
`LanceZero_Plano_Seguranca_Cadastro_Perfil_Vercel.md` e o
[ADR-0008](../docs/adr/0008-contas-clerk-supabase-rls.md).

O núcleo do LanceZero continua funcionando **sem conta**: treino, puzzles,
revisão espaçada, importação de PGN e análise seguem em IndexedDB. Nada aqui é
requisito para treinar.

---

## ⚠️ Desabilitar RLS é release blocker

Não existe motivo aceitável para desligar Row Level Security neste projeto.
Nem para depurar. Nem "por cinco minutos". Nem em preview.

Se uma consulta não retorna o que você esperava, a policy está errada ou a
sessão não carrega o JWT do Clerk — e é isso que precisa ser corrigido.
Desligar a RLS não resolve o problema, apenas troca um erro visível por um
vazamento silencioso, e quem desligou raramente é quem religa.

Regra prática, sem exceção:

- tabela nova com coluna `user_id` nasce com `enable row level security` e com
  policies de `select`, `insert` e `update` na **mesma** migration;
- `disable row level security` não entra em nenhum arquivo `.sql` do repo;
- `using (true)` e `with check (true)` não entram em nenhuma policy.

`tests/unit/security-rls.test.ts` lê estes arquivos como texto e falha se
qualquer uma dessas regras for quebrada. O teste roda em `pnpm test`, sem banco
e sem credencial: ele existe justamente para pegar o afrouxamento no PR, antes
de existir dado real para vazar.

---

## Ordem das migrations

| Arquivo                              | O que faz                                            |
| ------------------------------------ | ---------------------------------------------------- |
| `migrations/0001_perfil.sql`         | Tabelas, constraints, usernames reservados, triggers |
| `migrations/0002_rls.sql`            | RLS, policies e grants por papel                     |
| `migrations/0003_storage_avatar.sql` | Bucket de avatar e RLS por dono                      |

A ordem importa e as duas primeiras são inseparáveis. Aplicar a `0001` sem a
`0002` deixa tabelas com `user_id` sem RLS — exatamente a condição que o
ADR-0008 chama de release blocker.

Todas são idempotentes (`if not exists`, `drop policy if exists`,
`on conflict do nothing`), então reaplicar é seguro.

---

## Como aplicar

Não há projeto Supabase provisionado no momento em que estas migrations foram
escritas. Elas **não foram executadas contra um banco real**. Ao provisionar o
projeto, aplique e revise o resultado antes de considerar a camada pronta.

### Opção A — Supabase CLI (preferida)

```bash
supabase link --project-ref <ref-do-projeto>
supabase db push
```

O CLI aplica os arquivos de `supabase/migrations` em ordem lexicográfica.

### Opção B — SQL Editor do painel

Cole e execute, **nesta ordem**:

1. `migrations/0001_perfil.sql`
2. `migrations/0002_rls.sql`
3. `migrations/0003_storage_avatar.sql`

A `0003` escreve em `storage.buckets` e cria policies em `storage.objects`. Se o
papel usado não tiver permissão sobre o schema `storage`, o bucket pode ser
criado pelo painel (Storage → New bucket, privado) e só as policies aplicadas
por SQL. O bucket precisa ficar **privado**.

### Ambientes

Preview nunca aponta para o banco de produção (seção 38 do plano). Cada
ambiente tem seu próprio projeto Supabase, e as migrations são aplicadas em
todos.

---

## Verificação depois de aplicar

Nenhuma destas consultas prova que a RLS funciona — elas provam que ela está
ligada. A prova é o teste Alice/Bob com duas sessões reais (seção 29 do plano),
que é release blocker e ainda não pode rodar sem credencial.

Tabelas sem RLS no schema público (o resultado esperado é vazio):

```sql
select relname
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
  and not relrowsecurity;
```

Policies existentes:

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by tablename, cmd;
```

Grants do papel anônimo (o resultado esperado é vazio):

```sql
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon'
  and table_schema = 'public';
```

---

## Decisões que costumam gerar dúvida

**`anon` não recebe nenhum grant.** Nem para perfil público. A página `/u/<username>`
é montada no servidor pelo Data Access Layer, que aplica o DTO de `PublicProfile`
(seções 25, 126 e 127) e devolve apenas username, display name, avatar e rating.
`user_id` e metadados internos não saem. O custo é uma consulta a mais no
servidor; o ganho é que não existe caminho em que o papel anônimo fale com estas
tabelas.

**Não há policy nem grant de `DELETE` para o cliente.** Exclusão de conta é
operação sensível de servidor: precisa de step-up de autenticação, atravessa
Clerk, Postgres e Storage, e tem falha parcial a tratar (seções 18, 74 e 75).
Remoção de avatar antigo é faxina de servidor pelo mesmo motivo.

**Toda policy compara com `auth.jwt()->>'sub'`.** Nunca com um identificador
vindo do corpo da requisição. O servidor já verificou a sessão do Clerk; o
Postgres verifica de novo. É essa repetição que faz uma rota implementada errado
não ser suficiente para vazar dado de outro usuário.

**A secret key contorna a RLS.** Ela é server-side apenas, marcada como
Sensitive Environment Variable na Vercel, e nunca com prefixo `NEXT_PUBLIC_`.
Todo código que a usa está fora do alcance da RLS por definição, então cada uso
é uma decisão que precisa ser justificada e revisada.

**`profile_visibility` nasce `'private'`.** Perfil público exige escolha
explícita (seção 78). O mesmo vale para `training_reminders` e
`analytics_opt_in`, que nascem `false`.

---

## O que isto não promete

Esta camada não garante que dados nunca vazam. Ela garante que **um erro
isolado não basta**: seria preciso errar a rota, o DAL e a policy ao mesmo
tempo. E garante que a tentativa de acesso cruzado é testada antes da release,
em vez de descoberta depois.
