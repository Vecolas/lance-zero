# OPERACAO — LanceZero no plano gratuito

Este documento é um **runbook**. Foi escrito para ser lido às 3 da manhã, por
alguém cansado, que talvez não seja quem escreveu o código. Ele diz o que fazer,
na ordem, com os comandos prontos.

Se você está aqui porque **alguma coisa quebrou**, vá direto para o índice:

| Situação                                      | Seção                                                        |
| --------------------------------------------- | ------------------------------------------------------------ |
| Preciso restaurar um backup                   | [4. Restaurar um backup](#4-restaurar-um-backup)             |
| O projeto Supabase pausou / o app não conecta | [5. O projeto pausou](#5-o-projeto-pausou)                   |
| O job de backup ficou vermelho                | [6. Backup falhou](#6-backup-falhou)                         |
| Vazou um secret                               | [7. Vazamento de secret](#7-vazamento-de-secret)             |
| Bati um limite do plano gratuito              | [8. Limites do plano gratuito](#8-limites-do-plano-gratuito) |
| Preciso decidir se migro para o plano pago    | [9. Quando migrar](#9-quando-migrar-para-o-plano-pago)       |

---

## 1. Por que este documento existe

O LanceZero roda no **plano gratuito do Supabase** (Supabase Auth + Supabase
Database). Isso é uma decisão de custo, tomada conscientemente, e ela transfere
para nós duas responsabilidades que o plano pago resolveria sozinho:

1. **Backup.** O plano gratuito não faz backup automático. A seção 116 do plano
   de segurança exige backup. Logo, o backup é nosso:
   `.github/workflows/backup.yml`.
2. **Disponibilidade.** O plano gratuito **pausa** o projeto após cerca de uma
   semana sem atividade. Projeto pausado é login fora do ar. Daí
   `.github/workflows/keep-alive.yml`.

O keep-alive é **contorno de limitação do plano gratuito, não arquitetura**. Ele
some no dia em que houver plano pago.

O que **não** muda por causa do plano gratuito: RLS continua obrigatória, DELETE
continua fora do cliente, grants continuam explícitos, privacy by default
continua. Custo não compra desconto em segurança.

---

## 2. Os secrets

Todos ficam em **GitHub → Settings → Secrets and variables → Actions → New
repository secret**. Nenhum deles vai para `.env`, para o código, ou para o
histórico do Git.

### 2.1 `SUPABASE_DB_URL`

Usado por: `backup.yml`.

**Onde obter:** Supabase → seu projeto → **Project Settings → Database →
Connection string**.

**Qual das strings copiar:** a do **Session pooler** (porta `5432`).

> **Não use a "Direct connection".** Ela só responde em IPv6, e os runners do
> GitHub Actions são IPv4. O job vai falhar com um timeout de conexão que não
> explica nada.
>
> **Não use o "Transaction pooler"** (porta `6543`). Ele não mantém estado de
> sessão, e `pg_dump` precisa de sessão (ele abre uma transação com snapshot).

Formato esperado:

```text
postgresql://postgres.<project-ref>:<senha>@<host>.pooler.supabase.com:5432/postgres
```

A senha do banco é a que você definiu ao criar o projeto. Se perdeu: **Project
Settings → Database → Reset database password**. Resetar invalida a string
antiga — atualize o secret no mesmo momento, ou o próximo backup falha.

> Se a senha tiver caracteres especiais (`@`, `/`, `:`, `#`), ela precisa estar
> **percent-encoded** dentro da URI. O painel do Supabase já entrega assim. O
> workflow decodifica corretamente.

### 2.2 `BACKUP_PASSPHRASE`

Usado por: `backup.yml`.

Você **gera** este valor, não copia de lugar nenhum. Use um gerador de senhas:

```bash
# Numa máquina confiável, não num runner e não num terminal compartilhado.
openssl rand -base64 48
```

**Guarde em dois lugares que não sejam o GitHub** — por exemplo um gerenciador
de senhas e um envelope offline.

> **Sem esta frase, o backup não abre. Ponto final.** Ninguém recupera: nem o
> GitHub, nem o Supabase, nem quem escreveu este documento. AES256 sem a chave é
> ruído. Perder a passphrase é equivalente a nunca ter feito backup.

Se você rotacionar a passphrase, os backups **antigos** continuam abrindo com a
antiga. Guarde as duas até o último artefato antigo expirar.

### 2.3 `SUPABASE_URL`

Usado por: `keep-alive.yml`.

**Onde obter:** Supabase → **Project Settings → Data API → Project URL**.
Formato `https://<project-ref>.supabase.co`.

É o mesmo valor de `NEXT_PUBLIC_SUPABASE_URL`. Não é segredo — está no bundle
que o navegador baixa. Fica como secret só por conveniência de configuração.

### 2.4 `SUPABASE_ANON_KEY`

Usado por: `keep-alive.yml`.

**Onde obter:** Supabase → **Project Settings → API Keys** → chave `anon` /
`publishable`.

É o mesmo valor de `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Também é pública por
desenho: quem protege os dados é a RLS, não o segredo dessa chave.

> **Nunca coloque a `service_role` / secret key aqui.** Ela contorna a RLS
> inteira. Um workflow de ping não tem o que fazer com esse poder, e um secret a
> mais é uma superfície de vazamento a mais.

### 2.5 Conferência rápida

| Secret              | Workflow         | Sensível?                       | Onde obter                                   |
| ------------------- | ---------------- | ------------------------------- | -------------------------------------------- |
| `SUPABASE_DB_URL`   | `backup.yml`     | **sim** — contém senha do banco | Project Settings → Database → Session pooler |
| `BACKUP_PASSPHRASE` | `backup.yml`     | **sim** — você gera             | `openssl rand -base64 48`                    |
| `SUPABASE_URL`      | `keep-alive.yml` | não                             | Project Settings → Data API                  |
| `SUPABASE_ANON_KEY` | `keep-alive.yml` | não                             | Project Settings → API Keys (`anon`)         |

Enquanto os secrets não existirem, os dois workflows **terminam em verde** com
um aviso explicando o que falta. Isso é de propósito: o repositório ainda não
tem banco, e um CI cronicamente vermelho é um CI que ninguém olha.

---

## 3. Como funciona o backup

`.github/workflows/backup.yml` roda **todo domingo às 05:00 UTC** (02:00 em
Brasília) e também sob demanda em **Actions → Backup do banco → Run workflow**.

O que ele faz, em ordem:

1. instala o cliente PostgreSQL 17 (o do runner é velho demais para o servidor);
2. quebra a `SUPABASE_DB_URL` em variáveis `PG*` — a senha nunca entra em linha
   de comando, onde apareceria no log e no `ps`;
3. `pg_dump` em formato texto dos schemas `public`, `auth` e `storage`;
4. **valida**: arquivo não vazio, acima de 20 KB, com o marcador
   `PostgreSQL database dump complete` no fim, e com objetos dos três schemas;
5. cifra com `gpg --symmetric --cipher-algo AES256`, passphrase entrando por
   `--passphrase-fd 0`;
6. **decifra de volta e compara o SHA-256** com o do dump original;
7. destrói o dump em claro e sobe **apenas o `.gpg`** como artefato do Actions,
   com retenção de 90 dias.

Qualquer passo de validação que falhe **reprova o job em vermelho**. Isso é
deliberado: backup que falha em silêncio é pior do que não ter backup, porque
produz confiança falsa.

### O que o backup NÃO cobre

- **Arquivos binários do Supabase Storage** (avatares). O dump traz só os
  metadados no schema `storage`. Se o Storage passar a guardar algo que importa,
  criar um segundo job que use a API de Storage — está registrado como pendência
  na seção 11.
- **Configuração do projeto** feita pelo painel (provedores de OAuth, templates
  de e-mail, allowlist de redirect). Isso vive fora do banco. Mantenha as
  migrations em `supabase/migrations/` como fonte de verdade do schema e anote
  a configuração de painel num lugar versionado.
- **Retenção acima de 90 dias.** É o teto de artefato do GitHub gratuito. Se
  precisar de mais, baixe o `.gpg` periodicamente e guarde fora.

### Baixar um artefato

Pela interface: **Actions → Backup do banco → uma execução → Artifacts →
`backup-<run_id>-<attempt>`**.

Pela linha de comando (precisa do [GitHub CLI](https://cli.github.com)):

```bash
# Listar as execuções recentes do backup
gh run list --workflow "Backup do banco" --limit 10

# Baixar o artefato de uma execução
gh run download <RUN_ID> --dir ./backup-baixado
```

O download vem num `.zip` do GitHub, com o `.gpg` dentro.

---

## 4. Restaurar um backup

> **Leia isto antes de digitar qualquer comando.** Restaurar por cima de um
> banco que ainda tem dados é destrutivo e irreversível. A seção 117 do plano de
> segurança é explícita: **execute o restore em ambiente isolado**. Restaurar
> direto em produção só é aceitável quando produção já está perdida.

### 4.1 O que você precisa em mãos

- o arquivo `lancezero-<carimbo>.sql.gpg`;
- a `BACKUP_PASSPHRASE` correspondente à data daquele arquivo;
- `gnupg` e `postgresql-client` instalados;
- um **projeto Supabase de destino**, vazio.

Instalação das ferramentas, se faltarem:

```bash
# Debian / Ubuntu / WSL
sudo apt-get update && sudo apt-get install -y gnupg postgresql-client

# macOS
brew install gnupg libpq
```

### 4.2 Passo 1 — decifrar

```bash
cd ~/restore
ls -l lancezero-*.sql.gpg

# Decifra. O gpg vai PERGUNTAR a passphrase de forma interativa.
# Digitar a senha no prompt é melhor do que passá-la como argumento:
# argumento fica no histórico do shell e na lista de processos.
gpg --decrypt --output lancezero.sql lancezero-<carimbo>.sql.gpg
```

Se o terminal não tiver como abrir o prompt (servidor, container, CI):

```bash
# Lê a passphrase do stdin, sem eco na tela e sem passar por argv.
read -r -s -p 'Passphrase do backup: ' SENHA; echo
printf '%s' "$SENHA" | gpg --batch --quiet --passphrase-fd 0 \
  --decrypt --output lancezero.sql lancezero-<carimbo>.sql.gpg
unset SENHA
```

**Se o gpg disser `decryption failed: Bad session key`:** a passphrase está
errada. Não é o arquivo. Tente a passphrase anterior, se houve rotação.

### 4.3 Passo 2 — conferir antes de aplicar

Nunca aplique um dump sem olhar para ele.

```bash
ls -lh lancezero.sql
head -n 30 lancezero.sql            # cabeçalho e versão do pg_dump
tail -n 5  lancezero.sql            # precisa terminar com o marcador
grep -c 'CREATE TABLE' lancezero.sql
grep -c 'CREATE POLICY' lancezero.sql   # RLS tem que estar aqui
```

A última linha precisa ser:

```text
-- PostgreSQL database dump complete
```

Se não for, o arquivo está truncado. Use o backup anterior.

> **Confira também que as policies vieram.** Um restore que traga as tabelas mas
> não as policies deixa o banco sem RLS. Pelo ADR-0008, tabela com `user_id` sem
> RLS é _release blocker_ — e restaurar num estado assim é vazar dado de
> usuário. Se `grep -c 'CREATE POLICY'` der `0`, **pare** e reaplique as
> migrations de `supabase/migrations/` antes de qualquer coisa.

### 4.4 Passo 3 — restaurar num projeto ISOLADO

Crie um projeto Supabase novo (o plano gratuito permite 2 projetos ativos; se já
tiver 2, pause um). Pegue a connection string do **Session pooler** dele.

```bash
# Exporte a URI do DESTINO. Confira duas vezes que não é a de produção.
export DESTINO='postgresql://postgres.<ref-do-destino>:<senha>@<host>.pooler.supabase.com:5432/postgres'

# Diga em voz alta qual projeto é este antes de apertar Enter.
psql "$DESTINO" -c "select current_database(), inet_server_addr();"

# Aplica. ON_ERROR_STOP=1 é obrigatório: sem ele o psql segue em frente
# depois de um erro e você termina com um banco pela metade achando que deu certo.
psql "$DESTINO" \
  --set ON_ERROR_STOP=1 \
  --single-transaction \
  --file lancezero.sql \
  2>&1 | tee restore.log
```

**Erros que são normais e podem ser ignorados:**

- `role "supabase_admin" does not exist` e parentes — papéis internos do
  Supabase que já existem no destino com outro dono;
- `extension "pgcrypto" already exists`;
- avisos sobre `schema "auth" already exists`.

**Erros que NÃO são normais e exigem parar:**

- qualquer coisa em `CREATE POLICY` ou `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`;
- qualquer `permission denied` em `auth.*`;
- `COPY` interrompido no meio.

Se `--single-transaction` abortar por causa de um erro benigno, rode sem ele e
leia o `restore.log` linha a linha:

```bash
psql "$DESTINO" --set ON_ERROR_STOP=0 --file lancezero.sql 2>&1 | tee restore.log
grep -i 'error' restore.log
```

### 4.5 Passo 4 — verificar que o restore vale alguma coisa

Um restore não está pronto quando o `psql` termina. Está pronto quando estes
quatro cheques passam:

```sql
-- 1. Os usuários voltaram.
select count(*) as usuarios from auth.users;

-- 2. Os dados do produto voltaram.
select count(*) as perfis from public.profiles;

-- 3. RLS ligada em TODA tabela do schema public.
--    Qualquer linha com rowsecurity = false é bloqueio de release.
select relname, relrowsecurity
from pg_class
join pg_namespace on pg_namespace.oid = pg_class.relnamespace
where nspname = 'public' and relkind = 'r'
order by relname;

-- 4. As policies voltaram, e falam de auth.uid().
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname in ('public', 'storage')
order by tablename, policyname;
```

Depois disso, e **só** depois disso, faça o teste Alice/Bob do plano de
segurança (seção 29) contra o banco restaurado: duas contas, cada uma tenta ler
o dado da outra, e nenhuma consegue. Se um único dado privado atravessar, o
restore não está bom.

### 4.6 Passo 5 — só então apontar a aplicação

Trocar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
`SUPABASE_SECRET_KEY` na Vercel para o projeto restaurado, e atualizar os quatro
secrets do GitHub (seção 2) para que backup e keep-alive passem a apontar para o
projeto novo.

> **Preview nunca aponta para o banco de produção.** Vale igual depois de um
> restore (ADR-0008, regra 6).

### 4.7 Teste de restore periódico

"Backup nunca testado não deve ser considerado recuperação garantida"
(seção 117). O workflow já prova a cada execução que o arquivo **decifra**. Ele
não prova que o dump **aplica**.

**Faça o exercício completo — 4.2 a 4.5, num projeto descartável — uma vez por
trimestre e sempre depois de uma migration grande.** Anote a data e quem fez.
Se a última linha desta tabela estiver com mais de três meses, você não tem
backup testado.

| Data | Quem | Arquivo restaurado | Resultado |
| ---- | ---- | ------------------ | --------- |
|      |      |                    |           |

---

## 5. O projeto pausou

**Sintoma:** o app não conecta, o keep-alive ficou vermelho, ou a API responde
`503`/`540`.

### 5.1 Confirmar

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "apikey: $SUPABASE_ANON_KEY" \
  "https://<project-ref>.supabase.co/rest/v1/"
```

`200` = ativo. `503`/`540`/`000` = provavelmente pausado.

Confirme no painel: o projeto aparece marcado como **Paused** na lista de
projetos.

### 5.2 Despausar

1. entre em [supabase.com/dashboard](https://supabase.com/dashboard);
2. abra o projeto e clique em **Restore project** / **Unpause**;
3. espere. Pode levar de alguns minutos a algumas dezenas de minutos, conforme o
   tamanho do banco;
4. quando voltar, rode o keep-alive à mão: **Actions → Keep-alive do Supabase →
   Run workflow**;
5. rode também o backup à mão. Um projeto que acabou de voltar merece um backup
   fresco antes de qualquer outra coisa.

**Os dados não se perdem na pausa.** O projeto volta com o banco intacto. O que
se perde é disponibilidade — e a confiança de quem tentou entrar enquanto estava
fora.

### 5.3 Por que pausou, se existe keep-alive

Possibilidades, em ordem de probabilidade:

- **o cron do GitHub não rodou.** O GitHub **desativa workflows agendados em
  repositórios sem atividade por 60 dias**. Se ninguém commitou por dois meses,
  o keep-alive parou junto, em silêncio. Verifique em **Actions → Keep-alive do
  Supabase**: se aparecer o aviso de workflow desabilitado, reative no botão;
- **o cron atrasou.** Agendamento do Actions não tem garantia de horário e pode
  atrasar horas em pico. É por isso que o keep-alive roda **duas vezes por
  semana**, não uma;
- **os secrets sumiram ou expiraram**, e o job vinha terminando em verde com o
  aviso de "secrets ausentes" que ninguém leu;
- **a política do Supabase mudou.** Limites de plano gratuito mudam sem aviso.

### 5.4 Se pausar de novo

Pausa repetida em produção é sinal de que o plano gratuito já não serve. Vá para
a [seção 9](#9-quando-migrar-para-o-plano-pago).

---

## 6. Backup falhou

O job vermelho já diz qual verificação reprovou. Tradução:

| Mensagem no log                                | O que aconteceu                                   | O que fazer                                                                                                |
| ---------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Dump vazio`                                   | `pg_dump` não escreveu nada                       | Ver o erro do `pg_dump` logo acima. Quase sempre é conexão.                                                |
| `Dump com N bytes, abaixo do mínimo`           | Dump parcial, banco errado, ou permissão faltando | Conferir se a `SUPABASE_DB_URL` aponta para o projeto certo e se o usuário é `postgres`.                   |
| `Dump sem o marcador de conclusão`             | A conexão caiu no meio do dump                    | Rodar de novo. Se repetir, o banco pode ter crescido além do que o pooler aguenta na janela — ver seção 9. |
| `Nenhum objeto do schema auth`                 | O usuário não tem permissão de ler `auth`         | Usar a connection string do usuário `postgres` do painel, não um usuário criado à mão.                     |
| `O arquivo cifrado não volta ao dump original` | Corrupção na cifragem ou no disco do runner       | **Não confie nesse artefato.** Rodar de novo. Se repetir, é bug do workflow — abrir issue.                 |
| `timeout` / `could not connect`                | IPv6, pooler errado, ou projeto pausado           | Conferir que a string é a do **Session pooler**, porta 5432. Depois, seção 5.                              |
| Job verde com `::warning:: Secrets ausentes`   | Não há secrets configurados                       | Seção 2. **Isto não é backup.**                                                                            |

**Regra:** enquanto o backup estiver falhando, você não tem backup. Trate como
incidente operacional, não como ruído de CI. Se não der para consertar na hora,
faça um dump manual seguindo os passos 1 a 3 da seção 3 na sua própria máquina e
guarde cifrado.

---

## 7. Vazamento de secret

Se qualquer um dos secrets desta página aparecer em log, commit, print, ticket
ou chat, siga a seção 115 do plano de segurança: **apagar o commit não resolve.**

Ordem:

1. **rotacionar** — o valor exposto morre agora, não depois da investigação;
2. **invalidar** — conferir que o valor antigo não funciona mais;
3. **revisar logs** — procurar uso do valor entre o vazamento e a rotação;
4. **remover do histórico**, se for o caso — sabendo que clones existentes não
   são alcançados.

Por secret:

- **`SUPABASE_DB_URL`** — Supabase → Project Settings → Database → **Reset
  database password**. Atualizar o secret no GitHub. Atualizar qualquer outro
  lugar que use a string. Rodar o backup à mão para confirmar.
- **`BACKUP_PASSPHRASE`** — gerar uma nova, atualizar o secret, rodar o backup à
  mão. **Guardar a antiga**: os artefatos já existentes só abrem com ela.
  Considerar apagar os artefatos antigos, já que a passphrase deles é conhecida
  por quem não deveria.
- **`SUPABASE_URL` / `SUPABASE_ANON_KEY`** — são públicas por desenho. Vazamento
  delas não é incidente **desde que a RLS esteja correta**. Se a RLS não estiver,
  o incidente é a RLS, não a chave.
- **`SUPABASE_SECRET_KEY`** (service_role, usada pela aplicação, não por estes
  workflows) — **incidente grave**: ela contorna a RLS inteira. Rotacionar
  imediatamente no painel, atualizar na Vercel, revisar logs de acesso.

---

## 8. Limites do plano gratuito

Números de referência de setembro de 2026. **Limites e preços mudam sem aviso** —
confirme em [supabase.com/pricing](https://supabase.com/pricing) antes de tomar
decisão com base nesta tabela.

| Limite                             | Valor                                                | O que acontece ao bater                                                                        | Como monitorar                |
| ---------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------- |
| **Usuários ativos por mês (MAU)**  | 50.000                                               | Acima disso o Supabase cobra ou restringe. Muito longe do nosso horizonte.                     | Dashboard → Authentication    |
| **Banco de dados**                 | 500 MB                                               | O projeto entra em modo somente-leitura. **Escrita para. Cadastro para. Salvar perfil para.**  | Dashboard → Database → Usage  |
| **Storage**                        | 1 GB                                                 | Upload de avatar passa a falhar.                                                               | Dashboard → Storage           |
| **Projetos ativos**                | 2                                                    | Não dá para criar o terceiro. Isso atrapalha na hora de restaurar (seção 4.4): pause um antes. | Dashboard → lista de projetos |
| **Inatividade**                    | ~1 semana                                            | Projeto **pausado**. Seção 5.                                                                  | `keep-alive.yml`              |
| **Backup automático**              | não existe                                           | Nada acontece — e é justamente esse o problema.                                                | `backup.yml`                  |
| **Retenção de artefato do GitHub** | 90 dias                                              | O backup mais antigo simplesmente some.                                                        | Actions → Artifacts           |
| **Cron do GitHub Actions**         | desativado após 60 dias sem atividade no repositório | Keep-alive e backup **param em silêncio**.                                                     | Aviso no topo da aba Actions  |

### O limite que mais importa: 500 MB

Ele é o mais fácil de bater sem perceber, porque o crescimento é invisível até o
dia em que a escrita para.

Consulta para acompanhar (rode no SQL Editor do Supabase, mensalmente):

```sql
select
  pg_size_pretty(pg_database_size(current_database())) as banco_total;

select
  schemaname,
  relname,
  pg_size_pretty(pg_total_relation_size(relid)) as tamanho
from pg_catalog.pg_statio_user_tables
order by pg_total_relation_size(relid) desc
limit 20;
```

O desenho do produto ajuda aqui: pelo princípio 9 do `CLAUDE.md`, partidas,
puzzles, tentativas e cartões de revisão vivem em **IndexedDB no navegador**. O
Postgres guarda só perfil, configurações e contas de xadrez vinculadas — dados
pequenos. Se o banco começar a crescer rápido, provavelmente alguém moveu para o
servidor algo que era local-first, e **isso é um desvio de arquitetura antes de
ser um problema de custo**.

---

## 9. Quando migrar para o plano pago

Não migre por conforto. Migre quando um destes gatilhos disparar — cada um deles
significa que a operação manual deixou de ser suficiente:

1. **Existe usuário real com dado que ele lamentaria perder.** No momento em que
   a primeira pessoa de fora da equipe cria conta e passa a depender do produto,
   um backup semanal com janela de perda de sete dias fica difícil de defender.
   O Pro dá backup diário e Point-in-Time Recovery.
2. **O projeto pausou uma segunda vez.** Uma vez é aprendizado. Duas é padrão. O
   Pro não pausa, e o `keep-alive.yml` sai do repositório no mesmo PR.
3. **O banco passou de ~350 MB** (70% de 500 MB). Não espere bater no teto: o
   modo somente-leitura chega sem aviso e derruba cadastro e escrita de perfil.
4. **A janela de sete dias entre backups virou risco inaceitável** para o volume
   de dados que entra por dia.
5. **Precisou de um terceiro projeto ativo** de forma recorrente — por exemplo
   produção, staging e um ambiente de teste de restore permanente.
6. **Um teste de restore falhou** e o tempo de recuperação foi longo demais para
   o que o produto promete.

**Custo de referência:** Supabase Pro parte de ~US$ 25/mês e inclui backups
diários com retenção. É a linha que separa "operação nossa" de "operação
gerenciada".

### O que muda no dia da migração

- **apagar `.github/workflows/keep-alive.yml`.** Ele é contorno; no Pro é lixo
  que ninguém vai entender daqui a um ano;
- **manter `.github/workflows/backup.yml`.** Backup gerenciado do fornecedor e
  backup próprio não competem: eles cobrem falhas diferentes. Um backup que só
  existe dentro do mesmo fornecedor que pode falhar não é backup independente.
  Considere reduzir a frequência, não desligar;
- **atualizar esta página**, incluindo a tabela de limites e este gatilho;
- **registrar a decisão num ADR**, com a data e o motivo.

---

## 10. Calendário de operação

| Quando                  | O quê                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| Toda segunda e quinta   | Keep-alive roda sozinho. Olhar se ficou verde.                                                                |
| Todo domingo            | Backup roda sozinho. Olhar se ficou verde.                                                                    |
| Mensal                  | Conferir o tamanho do banco (seção 8). Conferir que o cron não foi desativado por inatividade do repositório. |
| Trimestral              | **Teste de restore completo** (seção 4.7). Anotar na tabela.                                                  |
| Trimestral              | Baixar o backup mais recente e guardar fora do GitHub, se a retenção de 90 dias não bastar.                   |
| A cada migration grande | Rodar o backup à mão antes, e um teste de restore depois.                                                     |
| Anual                   | Rotacionar `BACKUP_PASSPHRASE` e a senha do banco.                                                            |

---

## 11. Pendências conhecidas

Registradas aqui para não serem redescobertas na emergência:

- **Storage não tem backup.** Só os metadados vão no dump. Enquanto o Storage
  guardar apenas avatares — que são recriáveis pelo usuário — o risco é baixo.
  No momento em que guardar qualquer coisa insubstituível, isto vira bloqueio.
- **Nenhum destes workflows foi executado contra um projeto Supabase real.** Não
  há projeto provisionado e não há secrets. A sintaxe está validada; o
  comportamento contra um banco de verdade não está. **A primeira execução com
  secrets configurados deve ser feita à mão, acompanhada, e seguida de um teste
  de restore completo.**
- **A versão do cliente PostgreSQL está fixa em 17** no workflow de backup.
  Quando o Supabase subir de versão maior, `pg_dump` vai recusar o servidor e o
  backup falha. Trocar o número em `backup.yml`.
- **Não há alerta ativo.** Se o backup falhar e ninguém abrir a aba Actions,
  ninguém fica sabendo. Configurar notificação de falha de workflow nas
  preferências do GitHub, ou aceitar conscientemente a conferência manual do
  calendário acima.

---

## Referências

- `LanceZero_Plano_Seguranca_Cadastro_Perfil_Vercel.md` — seções 4 (alternativa
  B, Supabase Auth + Supabase Database), 19 (grants), 29 (teste Alice/Bob), 115
  (secret leak), 116 (backup), 117 (restore), 121 (custo), 122 e 123
  (disponibilidade), 124 (local-first).
- `docs/adr/0008-contas-clerk-supabase-rls.md` — RLS obrigatória, DELETE fora do
  cliente, Preview nunca aponta para produção.
- `CLAUDE.md` — princípios 9 (local-first) e 10 (núcleo gratuito).
- `supabase/migrations/` — fonte de verdade do schema, das policies e dos grants.
