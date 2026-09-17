# MAPA DO SISTEMA — o que o LanceZero é hoje

Varredura do repositório em **2026-09-17**, na `main` integrada
(`d9006f2` + a integração da branch de finais). Este documento descreve o que
**existe e funciona agora**, não o que está planejado. Onde algo é promessa e
não fato, está dito.

O que ele NÃO é: não substitui `PRODUCT.md` (comportamento pretendido),
`PEDAGOGY.md` (regras de aprendizado), `CONVENCOES.md` (processo) nem os ADRs
(decisões). Ele responde outra pergunta — _"o que já está de pé, e como as
peças se encaixam?"_ — e aponta para os quatro quando a resposta mora lá.

---

## 1. Retrato em números

|                                  |                                                          |
| -------------------------------- | -------------------------------------------------------- |
| Rotas de página                  | 30, todas sob `[lang]`                                   |
| Rotas de API                     | 3 (`sync`, `account/export`, `account/delete`)           |
| Domínio                          | 17 pastas, ~20 mil linhas de TypeScript puro             |
| Bibliotecas de apoio (`src/lib`) | 14 pastas, ~10 mil linhas                                |
| Conteúdo autorado                | ~4,3 mil linhas                                          |
| Testes unitários                 | 133 arquivos, ~32 mil linhas, **1998 casos**             |
| Testes e2e                       | 31 arquivos, ~5,4 mil linhas, **378 casos** (Playwright) |
| Testes de contrato               | 4 arquivos, contra a tablebase real                      |
| ADRs                             | 21                                                       |

Dependências de runtime — a lista inteira, e ela é curta de propósito:
`next@16.3.4`, `react@19.2.8`, `chess.js@1.4.0`, `react-chessboard@5.12.1`,
`ts-fsrs@5.4.2`, `zod@4.5.4`, `@supabase/supabase-js@2.116.0`, `server-only`.

Não há biblioteca de estado, de UI, de i18n nem ORM. O i18n é próprio
(ADR-0013), o CSS é Modules, o estado é `useState` mais o repositório.

---

## 2. A espinha: quatro camadas que não se atravessam

```
   src/app/[lang]/**        rotas — servidor, montam a tela e pouco mais
   src/components/**        React — nunca fala com IndexedDB nem com a rede
   src/domain/**            TypeScript PURO — sem React, sem relógio, sem I/O
   src/lib/**               o mundo de fora: armazenamento, engine, rede, i18n
```

A regra que sustenta o resto: **o domínio é puro**. Nada em `src/domain` importa
React, chama `Date.now()`, `Math.random()` ou `fetch`. Relógio e sorteio entram
por parâmetro — é o que faz "o plano de hoje é o mesmo depois de recarregar" ser
testável sem mock de tempo.

O corolário prático é que quase toda regra de produto do app é uma função pura
com teste unitário, e a tela é uma camada fina por cima.

---

## 3. Persistência — local-first de verdade

**IndexedDB, schema versão 6**, banco `lance-zero`, atrás de
`BackupRepository` (`src/lib/storage/repository.ts`). Nenhuma tela toca o banco
direto; todas recebem `repo` do `RepositoryProvider`.

Treze _stores_:

`profile` · `games` · `puzzleAttempts` · `positionAnalyses` · `reviewCards` ·
`reviewLogs` · `skillMastery` · `repertorios` · `skillStates` · `planosDoDia` ·
`openingProgress` · `studyJourneys` · `lessonProgress`

Três implementações do mesmo contrato: IndexedDB (produção), memória (testes) e
o backup serializável (`backup.ts`, `BACKUP_VERSION = 1`) que exporta e importa
tudo como um JSON validado.

**O núcleo funciona sem conta.** A sincronização com Supabase existe
(`api/sync`, ADR-0009) e é opcional: o app inteiro roda com o banco do navegador.

### O defeito que isto já causou, e que vale lembrar

`status: 'carregando'` e `repo: null` **não são a mesma coisa**. Uma tela que
lê só `!repo` conclui "não tem repositório" enquanto o banco ainda abre — e
monta com estado inicial errado. Foi exatamente isso que fazia a lição rebobinar
para a etapa anterior depois de dois cliques em `Continuar`. Quem consome o
provider precisa distinguir os dois.

---

## 4. Xadrez: as primitivas

`src/lib/chess` (642 linhas) embrulha o `chess.js` e é a **única** autoridade
sobre regras:

- `applyMove(fen, lance)` → `{ fenAfter, move }` ou `null`. Aceita SAN e UCI;
- `legalMoves(fen, casa?)`, `positionStatus(fen)` (vez, xeque, mate, fim),
  `posicaoEhJogavel(fen)`;
- `parseUci` / `normalizeUci`, com a regra assimétrica de promoção;
- `identidadeDePosicao(fen)` — a chave de posição que o grafo de aberturas usa
  para reconhecer transposições;
- navegação de PGN e o adaptador de partidas.

Nada mais no app instancia `chess.js`.

### Engine

Stockfish 18 lite single-threaded, **em Web Worker**, atrás de
`EngineProvider` (ADR-0004). Os artefatos GPL vivem isolados em
`public/engine/stockfish/` com `COPYING.txt` e `SOURCE.txt` (ADR-0005). A engine
**não carrega na landing** — só quando uma análise pede.

### Tablebase

`LichessTablebaseProvider` (`src/lib/tablebase`), com cache por instância de
tela. É o que dá defesa perfeita nos finais, e a procedência da resposta é
sempre declarada na interface — ver §7.

---

## 5. Jornada de estudo: a forma compartilhada

`src/domain/jornada` é a máquina que Aberturas e Finais dividem. Ela não sabe o
que é abertura nem final.

**Uma etapa tem uma regra**, e são três:

| Regra       | Como conclui                                                              |
| ----------- | ------------------------------------------------------------------------- |
| `leitura`   | o aluno clica em `Continuar →`                                            |
| `itens`     | responder N itens — e N **nasce da contagem da lista que a tela desenha** |
| `cobertura` | demonstrar cada alvo exigido; é a única que reprova                       |

`abrirEtapa` aceita **qualquer** etapa (ADR-0016): progressão define
_recomendação_, nunca _visibilidade_. Abrir o treino cedo mostra o conteúdo e
não marca nada.

### `exigencia.ts` — o portão estrutural

`src/domain/jornada/exigencia.ts` existe para tornar impossível um defeito que
foi real: `descritores()` declarava `{ tipo: 'itens', total: 1 }` para três
etapas cuja tela desenhava só prosa. `itensRespondidos` nunca era escrito, o
`Continuar` nascia desabilitado, e o aluno ficava preso na etapa 2 de 10 — **sem
nenhum erro em lugar nenhum**.

A regra, numa frase: _o total de uma etapa de itens nasce da CONTAGEM dos itens
que existem, nunca de um número escrito à mão._ O formato `Math.max(conteudo,
PISO)` é a assinatura do defeito, e por isso `regraDeItens` recebe a **lista**, e
não um número — quem chama não tem onde enfiar um piso.

Dois portões cobram isso: um unitário que varre os dois catálogos, e
`tests/e2e/jornada-sem-beco.spec.ts`, que percorre as jornadas no navegador e
reprova onde o botão trava sem exercício que o libere.

---

## 6. Aberturas

**Conteúdo:** seis cursos em `src/content/openings/course.ts` (827 linhas) —
`italiana`, `caro-kann`, `gambito-da-dama-recusado`, `escocesa`,
`sistema-londres`, `defesa-eslava`.

Cada um traz: linha principal comentada lance a lance, variações, planos,
estruturas de peões, erros comuns, e um grafo derivado na carga.

**O grafo** (`buildOpeningGraph`) é posição → arestas, com identidade de posição
como chave — é o que reconhece transposições. Cuidado documentado: o campo
`frequency` das arestas é **quantas linhas autoradas passam ali**, e não
popularidade do mundo. Nunca deve ser apresentado como estatística.

### A jornada, nove etapas

`visão → ideias → linha principal → melhores respostas do adversário →
variações → planos → jogar pelos dois lados → prática guiada → treino final`

- **Linha principal (3/9)** — `LinhaComentada`: tabuleiro fixo, um lance por
  vez, comentário ao lado, navegação ← / →.
- **Respostas (4/9) e Variações (5/9)** — a mesma tela, com listas
  **complementares**, separadas por **quem toma a decisão** (ADR-0018):
  `respostasDoAdversario` são os ramos em que quem recusa a principal é o outro;
  `variacoesDoAluno` é o complemento exato. Um portão afirma que a soma das duas
  é o total e que nenhum id aparece nas duas.
- **Prática guiada (8/9)** — o aluno joga a linha principal no tabuleiro e o
  computador responde pelo outro lado, na mesma transição. Sem botão entre
  lances. Errar faz _snapback_ e abre a explicação do lance estudado.
- **Treino final (9/9)** — regra de `cobertura`: linha principal, cada variação
  e a **perspectiva reversa** (jogar a mesma abertura pelo outro lado). Os alvos
  são derivados do conteúdo, então quem acrescenta uma variação passa a ter de
  demonstrá-la sem editar código.

**Sparring** (`SparringDaAbertura`) fica disponível depois de concluir: partidas
livres contra o bot do repertório, que nomeia a variação quando ela é jogada.

**O explorador da Lichess saiu da jornada** (ADR-0018) e vive em `/openings`. O
motivo é do plano de aberturas: §60 _"não usar como UI principal"_, §61
_"frequência é insumo, não aula"_. Soma-se um fato medido: o serviço responde
**401 a requisição anônima** desde 2026-09.

---

## 7. Finais

**Conteúdo:** `src/content/endgames/curriculo.ts` e `biblioteca.ts` — 18 famílias
de posição, entre elas oposição, casas-chave, regra do quadrado, peão passado,
Lucena, Philidor, torre básica e os mates de dama e torre.

**A jornada tem dez etapas** e termina num treino que **joga a posição até o
fim** — "não finalizar no primeiro bom lance" é a regra que separa um final de um
puzzle.

Três coisas que valem saber:

1. **O computador joga o outro lado.** `escolherLancePratico` conduz a defesa, e
   a **procedência aparece na tela**: tablebase, stockfish, roteiro, linha modelo
   ou lance legal. Um final convertido contra "um lance legal qualquer" não é o
   mesmo que um convertido contra a tablebase, e esconder a diferença diria ao
   aluno que ele venceu a defesa correta quando não venceu.
2. **O conteúdo é conferido contra a tablebase real.** O portão de contrato
   reprovou **17 das 41** posições de treino: 15 empates declarados como vitória,
   um Philidor declarado vitória numa posição perdida, dois bispos na mesma cor e
   duas FENs ilegais. Elas vinham da FEN de _ilustração_ do card — ilustrar e
   treinar viraram campos diferentes.
3. **Empate tem regra própria.** Repetição e a regra dos 50 lances não cabem num
   FEN, e a defesa correta em rei-e-peão termina justamente em tríplice
   repetição. O histórico da tentativa é carregado junto, senão o app puniria
   quem jogou certo.

---

## 8. Lições

**Doze lições** em `src/content/lessons/licoes/`, agrupadas em fundamentos,
processo, tática-e-cálculo e finais-e-aberturas. Cada uma tem **nove etapas**:

`objetivo → conceito → processo → exemplo resolvido → contraste → completion →
guiada → recuperação → resumo`

Três delas cobram resposta (`completion`, `guiada`, `recuperacao`), e a escada de
assistência diminui a cada uma — a guiada tem dicas em quatro degraus (direção,
área, ideia, candidato); a recuperação não tem nenhuma.

**Contraste** é uma etapa em si: a mesma posição com uma peça movida, onde o
lance do exemplo **falha**. É o que ensina que o padrão visual se repete e a
conclusão não.

### Responder é jogar (ADR-0019)

O exercício acontece no tabuleiro, e a linha **continua**: o lance do aluno e a
resposta do computador entram na mesma transição, sem botão entre eles.
`domain/exercicios/sequencia.ts` é o motor — puro, e com uma decisão que vale
registrar: **quem joga cada lance é derivado do FEN, nunca da paridade do
índice**, porque a linha pode começar pelo adversário (o "lance preparatório" do
dump da Lichess).

Linha de **um lance é o caso normal**: quando um lance resolve, o exercício
acaba nele e o computador não responde nada. O campo `continuacao` é opcional e a
linha é derivada de `lancesAceitos` quando ele falta — foi assim que os 36
exercícios migraram sem uma palavra de conteúdo novo.

Errar faz **snapback**: a posição não anda. Lance ilegal **não é erro
conceitual** — a ordem das duas perguntas ("isto é um lance?" antes de "é ESTE
lance?") está no domínio e tem teste.

---

## 9. Puzzles

Formato do dump CC0 da Lichess, com a semântica que importa: **o primeiro lance
de `Moves` já vem aplicado**, e o aluno resolve a partir do segundo.
`toSolvable` faz isso e tem teste de regressão.

`attempt.ts` é a máquina de tentativa: dicas em quatro níveis, limite de erros,
mate alternativo aceito (o dump guarda uma linha só), e julgamento de lance
alternativo com veredito `equivalente` / `pior` / `indeterminado`.

**A limitação que manda hoje:** o banco em runtime é
`src/content/puzzles/starter.ts` — **11 puzzles**, três temas, todos com solução
de um lance. O pipeline de ingestão dos 100k–300k não existe ainda. Nove das
doze lições não têm nenhum puzzle do seu tema, e é por isso que trocar os
exercícios autorados por puzzles do banco **não é possível hoje**.

---

## 10. Habilidades, plano do dia e revisão

**22 habilidades** (`domain/skills/catalog.ts`), em quatro famílias: `tactics.*`,
`calculation.*`, `endgame.*`, `opening.*`.

**Estágio antes da cobrança (ADR-0011).** Uma habilidade tem estágio de
aprendizado, e o tipo de atividade que ela pode receber depende dele
(`ESTAGIO_MINIMO_DO_TIPO`). Um aluno novo **nunca** recebe prática do que não foi
ensinado — há e2e afirmando isso.

**O plano do dia** (`buildDailyPlanV2`) é determinístico para o mesmo contexto e
semente: recarregar não resorteia. Ele lê erros recentes de partidas reais,
desvios de repertório e o estado das habilidades.

**Revisão espaçada** com `ts-fsrs`, em `/revisao` (ADR-0015). Cartões de posição,
erro, final e nó de repertório. A sessão joga no tabuleiro e o adversário
responde sozinho dentro da linha do cartão.

---

## 11. Partidas

Importação por PGN colado, arquivo `.pgn`, Lichess e Chess.com — cada fonte
atrás de um adaptador, com deduplicação por id de origem.

A revisão tem **dois passes, nesta ordem**:

1. **Humano.** A engine fica escondida. O app pergunta onde o aluno acha que a
   partida mudou e aceita marcações e notas.
2. **Engine.** Varredura barata primeiro, análise profunda só nas posições
   candidatas. O passe 2 **só aparece depois** de a leitura humana ser salva.

O WDL do Stockfish é usado internamente para comparar severidade e **nunca** é
rotulado como chance humana de vitória.

---

## 12. Interface

- **`MesaDeEstudo`** é a mesa única: tabuleiro à esquerda, instrução na coluna de
  24 rem a partir de 60 rem; abaixo disso empilha com o tabuleiro primeiro. O
  ADR-0019 consolidou quatro grades duplicadas nela — uma delas já tinha
  divergido, pondo o **tabuleiro** na coluna estreita.
- **`ChessBoardView`** carrega dois contratos de teste: `data-interactive`
  ("este tabuleiro aceita lance?") e `data-fen` ("que posição está na tela?").
  Sem eles, os portões teriam de adivinhar pela estrutura interna da biblioteca.
- **Entrada de lance** por arraste **e** por clique em duas casas
  (`useLanceNoTabuleiro`) — sem o clique, quem não arrasta não responde.
- **Sem notação como mecanismo de resposta.** A lista `Lances possíveis` foi
  removida e dois portões impedem que volte. Com três strings na tela o aluno lê
  e escolhe; a evidência de aprendizado vira "clicou no botão certo".
- **Tema** com dois botões e três estados no armazenamento (ADR-0010).
  **Idioma** PT-BR/EN por segmento de rota (ADR-0013).

---

## 13. Como se prova que funciona

- `pnpm check` — formato, lint, tipos e 1998 unitários;
- `pnpm test:e2e` — 378 casos em três perfis (desktop, mobile, acessibilidade a
  360 px);
- `pnpm test:contrato` — contra a **tablebase real**, fora do CI normal;
- `pnpm security:check` — segredo com prefixo público e RLS.

O estilo dos testes aqui é específico e vale entender antes de escrever um:
**um portão precisa morder dos dois lados**, e **a mensagem de falha nomeia o
item, nunca só o veredito** — ver `docs/TESTE-QUE-PARECE-INSTAVEL.md`. Vários arquivos existem só para
provar que o verificador reprova de verdade — porque uma função que devolve `[]`
sempre passa em todo portão que varre conteúdo correto.

---

## 14. O que NÃO está pronto

Dito sem eufemismo, porque é isto que decide o que fazer a seguir:

1. **O banco de puzzles não existe** — 11 puzzles de fixture no lugar de 100k.
   É o maior buraco do produto hoje.
2. **A rota do final não passa `julgar`**: o treino aceita o lance e diz que não
   comparou. O adversário existe; o juiz do lance, não.
3. **`pipeline.spec.ts` pode reprovar por contenção de CPU na máquina local.**
   Ele roda o Stockfish de verdade, e com os dois workers padrão o WASM disputa
   núcleo: isolado leva 7 s, na suíte cheia 46 s, e um lance pode estourar o
   orçamento de 30 s. No CI, com um worker, não acontece. Ver
   `docs/TESTE-QUE-PARECE-INSTAVEL.md` antes de tratar isso como defeito.

   (O que estava aqui antes — "`frontend-visual` e `idioma` são instáveis" —
   estava ERRADO, e o erro é instrutivo. O primeiro era um overflow real a
   360 px no cabeçalho da jornada; o segundo dependia de o ambiente não ter
   Supabase. Nenhum dos dois era instabilidade.)

4. **`PraticaDeHabilidade.module.css` tem ~25 regras mortas**, resto de uma tela
   que encolheu.
5. **A proteção de branch não está ativa** (exige GitHub Pro em repositório
   privado): "nunca commitar na `main`" depende de disciplina, não de trava.
6. **Nenhum número de produto foi calibrado com dados de aluno.** Pesos do
   planner, bandas de severidade, pisos de tempo — todos são heurísticas
   declaradas, e estão reunidos em objetos `*_CONFIG` justamente para poderem
   mudar num lugar quando houver telemetria.

---

## 15. Onde ler mais

| Pergunta                       | Arquivo                                                   |
| ------------------------------ | --------------------------------------------------------- |
| O que o produto deve fazer     | `docs/PRODUCT.md`                                         |
| Por que o ensino é assim       | `docs/PEDAGOGY.md`                                        |
| Como se trabalha aqui          | `docs/CONVENCOES.md` + a skill `disciplina-de-engenharia` |
| Por que uma decisão foi tomada | `docs/adr/` (21 ADRs)                                     |
| O plano completo de aberturas  | `docs/LanceZero_Plano_Definitivo_Ensino_Aberturas.txt`    |
| O plano completo de finais     | `docs/LanceZero_Plano_Definitivo_Ensino_Finais.txt`       |
| Licenças e obrigações          | `docs/LICENSES.md`                                        |
