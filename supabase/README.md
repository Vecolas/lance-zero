# Supabase — schema, RLS e grants do LanceZero

Este diretório contém as migrations do banco de perfil e da sincronização entre
aparelhos. Elas implementam o
`LanceZero_Plano_Seguranca_Cadastro_Perfil_Vercel.md` e o
[ADR-0008](../docs/adr/0008-contas-clerk-supabase-rls.md).

O núcleo do LanceZero continua funcionando **sem conta**: treino, puzzles,
revisão espaçada, importação de PGN e análise seguem em IndexedDB. Nada aqui é
requisito para treinar.

---

## Autenticação: Supabase Auth, login pelo Google

O plano de segurança recomendava Clerk como opção principal (seção 4, opção A).
O produto adotou a **opção B: Supabase Auth + Supabase Database**, que o próprio
plano descreve como boa alternativa quando custo e simplicidade pesam mais. O
motivo é direto: o produto não tem capital, e tudo precisa caber em plano
gratuito.

O que isso muda no banco:

- `user_id` é `uuid` e referencia `auth.users(id)`, não mais um texto opaco de
  provedor externo;
- toda policy compara com `auth.uid()`, que já devolve `uuid` — a comparação
  fica sem cast, sem `->>` e sem ponte de JWT de terceiro;
- apagar a linha de `auth.users` leva perfil, preferências, contas vinculadas e
  estado sincronizado junto, por `on delete cascade`.

O que **não** muda: RLS continua obrigatória, `DELETE` continua fora do alcance
do cliente, grants continuam explícitos e restritos, e privacidade continua
sendo o padrão.

### Provedor de login

O único provedor previsto no início é **Google (OAuth)**. Sem senha própria, sem
sessão caseira — a regra 3 do ADR-0008 continua valendo, só mudou quem a
implementa.

Consequências práticas:

- não existe coluna de credencial em lugar nenhum destas migrations, e o teste
  `tests/unit/security-rls.test.ts` falha se alguém adicionar uma;
- a maior parte do trabalho de força bruta, senha vazada e verificação de e-mail
  (seções 45 e 47 do plano) fica do lado do Google;
- em compensação, quem perder a conta Google perde o acesso. Por isso a
  exportação de backup local continua sendo um recurso de primeira classe, não
  uma conveniência.

O provedor é habilitado no painel do projeto (Authentication → Providers), não
por migration. As URLs de redirecionamento de cada ambiente entram lá, e Preview
nunca compartilha projeto com produção (seção 38).

---

## ⚠️ Desabilitar RLS é release blocker

Não existe motivo aceitável para desligar Row Level Security neste projeto.
Nem para depurar. Nem "por cinco minutos". Nem em preview.

Se uma consulta não retorna o que você esperava, a policy está errada ou a
sessão não chegou ao Postgres — e é isso que precisa ser corrigido. Desligar a
RLS não resolve o problema, apenas troca um erro visível por um vazamento
silencioso, e quem desligou raramente é quem religa.

Regra prática, sem exceção:

- tabela nova com coluna `user_id` nasce com `enable row level security` e com
  policies de `select`, `insert` e `update` na **mesma** migration;
- `disable row level security` não entra em nenhum arquivo `.sql` do repo;
- `using (true)` e `with check (true)` não entram em nenhuma policy;
- `auth.jwt()` não aparece em policy nenhuma — é resquício da arquitetura
  anterior e o teste trata como erro.

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
| `migrations/0004_sync.sql`           | `user_state`: sincronização entre aparelhos          |

A ordem importa e as duas primeiras são inseparáveis. Aplicar a `0001` sem a
`0002` deixa tabelas com `user_id` sem RLS — exatamente a condição que o
ADR-0008 chama de release blocker. A `0004` já traz a própria RLS junto, que é a
regra para toda tabela nova daqui em diante.

Todas são idempotentes (`if not exists`, `drop policy if exists`,
`on conflict do nothing`), então reaplicar é seguro.

---

## Sincronização: uma linha por usuário

`user_state` guarda **um documento jsonb por usuário**: o mesmo arquivo que
`src/lib/storage/backup.ts` já exporta e importa, com teste de ida e volta.

Duas coisas que costumam surpreender quem lê a tabela pela primeira vez:

**O servidor é cópia, não fonte da verdade.** O princípio 9 do `CLAUDE.md`
continua valendo: o app funciona inteiro sem conta e sem rede. Sincronizar é
"subir o backup e baixar o backup".

**Última escrita vence, sem merge.** Dois aparelhos offline geram dois
documentos; o que subir por último sobrescreve o outro. É decisão de produto,
não pendência técnica: dois `SchedulerState` do mesmo cartão não têm união
óbvia, e um merge errado corrompe o espaçamento em silêncio. `updated_at` e
`device_label` existem para a UI avisar antes de sobrescrever e deixar a escolha
com o usuário.

O `payload` tem teto de tamanho por constraint. Ver "Limites do plano gratuito".

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
4. `migrations/0004_sync.sql`

A `0003` escreve em `storage.buckets` e cria policies em `storage.objects`. Se o
papel usado não tiver permissão sobre o schema `storage`, o bucket pode ser
criado pelo painel (Storage → New bucket, privado) e só as policies aplicadas
por SQL. O bucket precisa ficar **privado**.

### Ambientes

Preview nunca aponta para o banco de produção (seção 38 do plano). Cada
ambiente tem seu próprio projeto Supabase, e as migrations são aplicadas em
todos.

Isso esbarra no limite de **2 projetos ativos** do plano gratuito. Ver abaixo.

---

## Limites do plano gratuito

A camada de conta inteira precisa caber aqui. Os números do plano gratuito do
Supabase, na data em que isto foi escrito:

| Recurso          | Limite |
| ---------------- | ------ |
| Usuários mensais | 50 mil |
| Banco            | 500 MB |
| Storage          | 1 GB   |
| Projetos ativos  | 2      |

Confira os valores atuais na página de preços antes de decidir qualquer coisa em
cima deles: eles mudam, e este arquivo não é atualizado sozinho.

O que isso já impôs ao schema:

- **teto de payload em `user_state`.** 500 MB dividido por poucos usuários ainda
  é finito, e um cliente com bug não pode encher o banco de todo mundo. A
  constraint recusa o documento em vez de aceitar e crescer;
- **avatar limitado a 2 MB, bucket privado.** 1 GB de storage acaba rápido com
  imagem sem reencode;
- **2 projetos ativos.** Produção e Preview ocupam os dois. Um terceiro ambiente
  significa pagar ou compartilhar projeto — e compartilhar com produção viola a
  seção 38. Na prática: Preview e desenvolvimento local dividem o mesmo projeto
  de não-produção, e produção fica sozinha.

### Duas armadilhas operacionais

**Pausa por inatividade.** Projeto gratuito sem tráfego por cerca de uma semana é
pausado, e volta só por ação manual no painel. Para um app em beta, com pouco
uso, isso é o modo de falha mais provável de todos: o usuário abre o app, a
sincronização falha, e nada no banco está errado — o banco simplesmente não está
de pé. O cliente precisa tratar isso como falha de rede temporária, mantendo o
progresso local intacto, e nunca como "o servidor disse que não existe dado".

**Não há backup automático.** O plano gratuito não faz backup diário gerenciado.
Perder o projeto é perder a cópia da nuvem. Duas consequências:

- a exportação de backup local (JSON, no próprio app) continua sendo a rede de
  segurança de verdade do usuário, e precisa continuar visível na interface;
- o backup do servidor é responsabilidade nossa, agendada.

A operação dessas duas coisas — o ping que evita a pausa e o dump periódico —
vive em `.github/workflows`, não aqui. Este diretório descreve o schema; o que
mantém o projeto vivo e copiado é automação de CI, e é lá que ela deve ser lida
e revisada.

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

Nenhuma policy pode ter sobrado com a ponte antiga de JWT (o resultado esperado
é vazio):

```sql
select tablename, policyname
from pg_policies
where schemaname in ('public', 'storage')
  and (coalesce(qual, '') || coalesce(with_check, '')) like '%auth.jwt%';
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
Postgres e Storage, e tem falha parcial a tratar (seções 18, 74 e 75). Remoção
de avatar antigo é faxina de servidor pelo mesmo motivo.

**`on delete cascade` não contradiz o parágrafo acima.** O cascade só dispara
quando o servidor apaga a linha de `auth.users`, que é o fluxo auditado. O
cliente continua sem conseguir apagar linha nenhuma; o cascade só evita perfil
órfão apontando para um usuário que não existe mais.

**Toda policy compara com `auth.uid()`.** Nunca com um identificador vindo do
corpo da requisição. O servidor já verificou a sessão; o Postgres verifica de
novo. É essa repetição que faz uma rota implementada errado não ser suficiente
para vazar dado de outro usuário. Sessão ausente faz `auth.uid()` devolver
`null`, e `user_id = null` não é verdadeiro para linha nenhuma — o modo de falha
é negar.

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
