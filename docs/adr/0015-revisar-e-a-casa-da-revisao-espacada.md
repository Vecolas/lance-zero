# ADR-0015 — A aba "Revisar" é a casa da revisão espaçada

- **Estado:** aceito
- **Data:** 2026-09-16
- **Substitui:** a aba "Treinar" como hub (não há ADR anterior sobre ela)
- **Relacionado:** ADR-0011 (estágio antes da cobrança), ADR-0013 (i18n)

## Contexto

A aba **Treinar** (`/train`) tinha seis blocos. Cinco só apontavam para um lugar
que já existia:

| Bloco                | Destino                    | Já alcançável em             |
| -------------------- | -------------------------- | ---------------------------- |
| Continuar aprendendo | `/lessons/{skillId}`       | Biblioteca, card "Continuar" |
| Praticar             | `/train/pratica/{skillId}` | **nenhum outro lugar**       |
| Revisar              | `/train/revisao`           | —                            |
| Diagnóstico          | `/onboarding`              | CTA da landing               |
| Currículo por área   | `/lessons?area=`           | filtro da Biblioteca         |
| Minhas partidas      | `/games`                   | aba Partidas                 |

A redundância foi criada de propósito, em partes: a Biblioteca ganhou estado por
lição, o Roadmap virou a casa do progresso, o filtro por área entrou na
Biblioteca. O hub não acompanhou.

Ao mesmo tempo, a **revisão espaçada é um princípio inegociável do `CLAUDE.md`**
e é o mecanismo que sustenta tudo que o app ensina — e não tinha casa. Era uma
linha dentro do hub levando a uma fila sem contexto: o aluno via uma posição e um
botão.

Duas descobertas da auditoria sustentam sozinhas a decisão:

1. **O app gravava `ReviewLog` a cada revisão — com o desfecho — e nunca lia.** O
   único leitor em produção era `src/lib/storage/backup.ts`. Todo desfecho que
   cada aluno produziu está gravado desde sempre; o app é que não perguntava.
2. **O resumo do fim da sessão era calculado e jogado fora.** `ReviewSession`
   montava `N lembrados · N com dica · N esquecidos · N reaprendidos`, guardava em
   `useState` + `localStorage`, e apagava quando a fila terminava.

## Decisão

### 1. A aba passa a se chamar Revisar, em `/revisao`

`Treinar` numa tela que só revisa faria o aluno procurar prática ali e não achar.
O glossário de i18n (`docs/i18n-glossary.md`) já separava os três termos:
`Treinar` = modo, `Praticar` = ação, `Revisar` = revisão espaçada.

Três endereços antigos viram **redirecionamento**, não 404:

| Antigo                     | Novo                 | Por que o desvio existe                                 |
| -------------------------- | -------------------- | ------------------------------------------------------- |
| `/train`                   | `/revisao`           | esteve na navegação desde a fase 5; está no SHELL do SW |
| `/train/revisao`           | `/revisao/sessao`    | é o href que os **planos já gravados** guardam          |
| `/train/pratica/{skillId}` | `/pratica/{skillId}` | idem, no card de prática do plano                       |

Um 404 no segundo faria o card "Revisões vencidas" de ontem quebrar hoje.

### 2. A fronteira entre as três telas vizinhas

- **Roadmap** — _"o que eu sei?"_: estágio, maestria, retenção em partida real.
- **Hoje** — _"o que eu faço agora?"_: o plano do dia.
- **Revisar** — _"como está o meu agendamento?"_: vencidas, previsão, origem,
  reincidência e histórico.

Nenhuma responde a pergunta da outra. Em particular, Revisar **não** mostra
maestria por habilidade e **não** monta plano.

### 3. Toda contagem passa pela elegibilidade

`TreinoHub` contava `getDueCards().length` **cru**; a fila aplicava
`cardPodeSerRevisado`. O hub podia dizer "3 itens vencidos" e a sessão abrir com
1, e o aluno não tinha como saber qual dos dois mentia.

`src/domain/review/agenda.ts` tem uma porta só: nada sai de lá sem o mesmo filtro
que a sessão usa.

**Uma segunda cópia foi colapsada junto.** O conjunto `habilidadesEnsinadas`
existia em duas versões: `isSkillStateReviewEligible` na sessão, e um predicado
inline em `planner-v2.ts` que **esquecia o `stage !== 'unseen'`**. As duas
concordavam quase sempre — e discordavam exatamente no caso que a regra existe
para pegar. Agora é uma chamada só.

### 4. `listReviewLogs` sobe para o contrato do dia a dia, com teto

Ele morava em `BackupRepository`, com o comentário de que o contrato do dia a dia
não precisa varrer coleções inteiras. O comentário continua valendo, e a condição
da subida é o `limit`: a tela pede um número pequeno e fixo; o backup omite o
argumento e leva tudo.

A ordem é **cronológica nos dois casos**, e com `limit` o recorte são os N mais
recentes. Inverter mudaria a ordem que o backup grava na restauração.

### 5. O que não foi feito, e por quê

- **Nenhuma probabilidade de recordação.** `retrievability()` existe em
  `src/lib/fsrs/scheduler.ts` e continua sem chamador. É número de modelo, e o
  princípio 8 do `CLAUDE.md` proíbe apresentá-lo como medida da cabeça do aluno.
- **Nenhuma estatística de tempo.** `ReviewSession` grava `elapsedMs: 0` fixo;
  qualquer média seria zero apresentado como fato.
- **Nenhum id de sessão.** O histórico agrupa os logs por **dia do aluno**.
  Inventar um id exigiria mudar o formato do que já está gravado no aparelho de
  quem usa o app, e o ganho seria distinguir duas sessões no mesmo dia.

### 6. Praticar foi para o card do Roadmap

`/pratica/{skillId}` perderia a única porta navegável que tinha. Ela virou uma
segunda ação no card, **visível só quando `podeCobrarSemApoio` é verdadeiro** — a
mesma condição que o hub usava, e que atravessa a marca de reensino.

É a regra acima de todas as outras do `PEDAGOGY.md`: não existe caminho que
ofereça prática independente de habilidade em `unseen`.

## Consequências

- `SHELL_CACHE` do service worker subiu para `v2`. Sem o bump, o worker
  instalado continuaria servindo a casca antiga: o app pareceria inteiro e a aba
  que o cabeçalho anuncia não existiria — offline e sem nenhum erro.
- A aba **nasceu traduzida** (namespace `review`, PT e EN). O hub que ela
  substitui estava 100% em português cru.
- Links para rotas de treino passaram a usar `traduzirRota`. Antes, só um no app
  inteiro fazia isso — os demais jogavam um aluno em `/en/...` para a árvore
  portuguesa.
- `TreinoHub.tsx` e seu CSS foram apagados.
- O que continua em português cru é a **sessão** (`ReviewSession`, 1018 linhas).
  Ela está registrada em `docs/i18n-audit.md` e não foi traduzida aqui para o
  trabalho não misturar dois assuntos.
