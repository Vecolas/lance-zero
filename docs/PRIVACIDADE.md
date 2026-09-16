# Privacidade e LGPD

Este documento é o **data map** do LanceZero: o que é coletado, onde fica, por
quanto tempo, e o que o titular pode fazer a respeito.

Ele existe porque a LGPD exige medidas técnicas e administrativas para proteger
dado pessoal, e porque medida que ninguém escreveu é medida que ninguém aplica.

---

## O princípio: quase nada sai do seu aparelho

O núcleo do LanceZero funciona **sem conta e sem servidor**. Treino, puzzles,
revisão espaçada, importação de PGN e a análise com Stockfish rodam no seu
navegador, e os dados ficam no IndexedDB do seu dispositivo.

Isso não é só privacidade: é o que permite o produto existir sem custo
operacional. Ver ADR-0003 e ADR-0009.

**Sem conta, o LanceZero não sabe quem você é.** Não há cadastro, não há
telemetria, não há analytics.

---

## O que fica no seu navegador

| Coleção                     | Conteúdo                                                                                                                         | Some quando                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `profile`                   | rating estimado, tempo de treino por dia, tema de tabuleiro, e os nomes de usuário do Lichess/Chess.com **se você os informar**  | você limpa os dados do site |
| `games`                     | PGN das partidas que você importou, mais suas anotações do passe humano                                                          | idem                        |
| `puzzleAttempts`            | acertos, erros, dicas usadas e tempo de reflexão                                                                                 | idem                        |
| `positionAnalyses`          | avaliações da engine dos seus lances                                                                                             | idem                        |
| `reviewCards`, `reviewLogs` | o que você tem para revisar e quando revisou                                                                                     | idem                        |
| `openingProgress`           | progresso local dos cursos de abertura, nodes aprendidos/treinados e posições fracas                                             | idem                        |
| `skillMastery`              | seu modelo de habilidades                                                                                                        | idem                        |
| `repertorios`               | o repertório de aberturas que você montou, com as ideias que você escreveu em cada lance                                         | idem                        |
| `skillStates`               | em que ponto do aprendizado você está em cada habilidade: o que já te foi ensinado, o que você já resolveu com apoio e sem apoio | idem                        |
| `planosDoDia`               | os planos de treino já montados, com o que você concluiu em cada dia                                                             | idem                        |
| `openingProgress`           | o que você já aprendeu e treinou em cada abertura do seu repertório                                                              | idem                        |
| `studyJourneys`             | onde você parou em cada jornada de abertura e de final: etapa atual, etapas concluídas e as linhas que você já demonstrou        | idem                        |
| `lessonProgress`            | onde você parou dentro de cada lição da biblioteca: a etapa em que fechou e contra qual versão do conteúdo                       | idem                        |

Nada disso é enviado para lugar nenhum enquanto você não criar conta.

**Exportar e apagar já funcionam hoje**, em `/settings`: o backup JSON contém
tudo acima, e limpar os dados do site remove tudo.

---

## O que sai do seu aparelho, e para onde

| Destino       | O que vai                                               | Quando                                        | Por quê              |
| ------------- | ------------------------------------------------------- | --------------------------------------------- | -------------------- |
| **Lichess**   | seu nome de usuário                                     | só se você pedir para importar partidas de lá | buscar suas partidas |
| **Chess.com** | seu nome de usuário                                     | idem                                          | idem                 |
| **Vercel**    | o que qualquer site vê: IP, user-agent, página acessada | sempre que você abre o site                   | servir a aplicação   |

O Stockfish **não** envia posição nenhuma: ele roda no seu navegador.

Não há Google Analytics, pixel de rastreamento, nem cookie de terceiro.

---

## O que muda quando houver conta

O fluxo público está disponível em `/account`: cadastro, login, recuperação,
logout, exportação e exclusão. O endpoint `/api/sync` usa JWT verificado,
identidade derivada da sessão e confirmação antes de substituir uma cópia.

A camada de conta está sendo construída (ADR-0008 e ADR-0009). Quando existir:

| Onde                             | O que                                                        | Retenção                 |
| -------------------------------- | ------------------------------------------------------------ | ------------------------ |
| **Supabase Auth**                | email e identificador da conta                               | enquanto a conta existir |
| **Supabase (`profiles`)**        | nome de exibição, username, rating estimado, visibilidade    | idem                     |
| **Supabase (`user_state`)**      | uma cópia do seu progresso, para sincronizar entre aparelhos | idem                     |
| **Supabase Storage**             | avatar, se você enviar um                                    | idem                     |
| **Artefato de backup no GitHub** | dump cifrado do banco                                        | **90 dias**              |

### O backup merece atenção

Como o plano gratuito do Supabase não tem backup automático, um workflow semanal
gera um `pg_dump`, **cifra em AES-256** e guarda como artefato do GitHub Actions,
com retenção de 90 dias. Ele nunca é commitado no repositório.

Isso significa que **dado pessoal passa a existir também no GitHub**, cifrado.
Está aqui porque um data map que omite uma cópia dos dados não é um data map.

### Privacidade por padrão

O perfil nasce **privado** (`profile_visibility` default `'private'`), e os
opt-ins de lembrete e de analytics nascem `false`. Isso está no schema, não só
na intenção — ver `supabase/migrations/`.

---

## Seus direitos

| Direito                        | Hoje (sem conta)                               | Com conta                                                                   |
| ------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------- |
| **Acesso e portabilidade**     | `/settings` → Exportar backup, em JSON legível | o mesmo formato, mais os dados do servidor                                  |
| **Correção**                   | editar em `/settings`                          | idem                                                                        |
| **Eliminação**                 | limpar os dados do site apaga tudo             | exclusão de conta como operação de servidor, cobrindo Auth, banco e Storage |
| **Revogação de consentimento** | não há consentimento a revogar: não há coleta  | desligar sincronização                                                      |

A exclusão com conta agora tem uma operação server-only testada (issue #29): ela
exige confirmação explícita, remove os avatars do usuário e só então apaga a
conta Auth, com falha segura se o Storage não responder. O cadastro e a tela
pública de conta ainda não foram abertos; não há coleta de conta ativa enquanto
esse fluxo completo não existir.

A portabilidade dos dados de servidor também tem uma operação server-only
testada: ela exporta o DTO privado do perfil, as preferências e o documento de
sincronização sujeito à RLS. Email, tokens, IDs internos e erros crus não entram
no artefato; uma leitura protegida que falhar reprova a exportação inteira.

---

## O que este documento NÃO promete

Nenhum sistema sério promete que dados jamais vazarão. O que a arquitetura faz é
outra coisa, e é verificável:

- **um erro isolado não basta.** A autorização é checada na aplicação e de novo
  no banco, por Row Level Security. Uma rota implementada errado ainda esbarra no
  Postgres;
- **o dado sensível é minimizado.** O que não precisa existir no servidor não vai
  para o servidor — e é por isso que o núcleo continua local-first;
- **tentativa de acesso cruzado é testada antes de cada release.** Duas contas,
  Alice e Bob, tentando ler e alterar os dados uma da outra. Um único dado
  privado atravessando bloqueia a release (issue #27).

---

## Contato

Enquanto não há canal formal, questões de privacidade vão pelas issues do
repositório. Isso muda antes de qualquer cadastro público.
