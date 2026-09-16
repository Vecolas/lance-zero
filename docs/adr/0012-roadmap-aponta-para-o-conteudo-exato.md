# ADR-0012 — O Roadmap aponta para o conteúdo exato

- **Estado:** aceito
- **Data:** 2026-09-16
- **Substitui:** a ponte por nome descrita em `src/lib/training/jornadas-do-roadmap.ts`

## Contexto

O Roadmap lista o currículo e oferece, em cada nó, uma ação: **Aprender**,
**Continuar**, **Revisar** ou **Reaprender**.

O destino dessa ação era decidido dentro do card, em uma linha:

```ts
const destino = conteudo?.rota ?? (node.skillId ? `/lessons/${node.skillId}` : '/lessons')
```

A última alternativa é o defeito. Vinte e nove dos cinquenta e sete nós não têm
`skillId` nem jornada — todos ofereciam "Aprender" e levavam para `/lessons`, a
biblioteca inteira.

O Roadmap **sabe** o que o aluno quer aprender. Responder com o catálogo é dizer
"procure você mesmo". E é um defeito que não parece um: o link abre uma página de
verdade, ninguém vê um erro, e o aluno só percebe que se perdeu quando já está
rolando uma lista atrás do assunto que acabou de pedir.

A ligação entre nó e conteúdo, quando existia, era feita comparando **títulos
normalizados**. Funcionava e o preço estava declarado no próprio arquivo:
renomear um dos lados quebrava o link em silêncio. O risco pior nunca foi a
quebra — foi o acerto errado: busca por nome pode casar com o conteúdo vizinho, e
quem pede Caro-Kann e recebe outra abertura não tem como saber que foi o app.

## Decisão

**1. Todo nó declara um destino pedagógico explícito, por ID.**

`LEARNING_OBJECTS` (em `src/domain/roadmap/learning-objects.ts`) mapeia id do nó
para `LearningTarget`. Uma linha por nó, escrita à mão. É mais verboso de
propósito: um nó novo não ganha destino por acidente, ele ganha por decisão.

**2. `LearningTarget` é uma união discriminada com quatro variantes.**

`lesson`, `lesson-journey`, `opening-journey`, `endgame-journey`.

Ficaram de fora `calculation-journey` e `game-review-lesson`, que o plano listava
como possíveis. Hoje as duas resolveriam igual a `lesson`/`lesson-journey` — o
projeto não tem uma `CalculationStudyJourney`, e uma lição de análise de partida é
uma lição como outra qualquer. Variante que resolve igual a outra é um segundo
nome para a mesma coisa: não impede nenhum erro e cria a pergunta "qual das duas
eu uso?" em cada nó novo. Quando existir uma jornada de cálculo de verdade, ela
entra com resolução própria.

**3. A rota nasce de UMA função.**

`resolveLearningTarget` é pura e recebe a tradução de id para slug por parâmetro;
`rotaDeAprendizado` a liga aos catálogos reais e é a única que as telas importam.
Montar a URL na tela é o que produziu o `/lessons` genérico — cada card resolvia
sozinho, e o que resolvia mal não aparecia em lugar nenhum.

**4. Ausência de conteúdo é declarada, não disfarçada.**

`null` em `LEARNING_OBJECTS` significa "decidido: ainda não há conteúdo". O card
não vira link genérico: ele perde o botão e diz _"Este conteúdo ainda não possui
uma lição disponível."_

Ausente é diferente de `null`. Ausente significa que ninguém decidiu, e isso
**lança** `MissingLearningTargetError`.

**5. Conclusão do nó nasce do alvo.**

`completionRuleFor` deriva a regra: lição única conclui com a lição; jornada de
lições exige todas; abertura e final concluem pela jornada de estudo. Um campo de
conclusão escrito à mão em cada nó seria a segunda fonte da mesma verdade.

**6. O progresso de uma jornada de lições é derivado, nunca guardado.**

A lição conta como vencida quando a habilidade dela tem evidência de ensino — o
mesmo dado que o resto do app lê. Um "passo atual" próprio seria a segunda
verdade sobre a mesma pergunta, e no dia da divergência a jornada mandaria
repetir uma lição que o app já dá por ensinada.

## Consequências

**O que melhora.** "Aprender" abre a lição, a jornada de lições, a
`OpeningStudyJourney` ou a `EndgameStudyJourney` correspondente. "Continuar"
retoma o checkpoint exato — a etapa da jornada, ou a lição em que o aluno parou.
"Reaprender" abre o mesmo conteúdo com o enquadramento dito na tela.

**O que fica visível e era invisível.** Vinte e nove nós sem conteúdo. Eles
sempre estiveram sem conteúdo; o que mudou é que agora dizem isso, em vez de
empurrar o aluno para o catálogo. O número está medido num teste e só pode cair.

**O custo aceito.** Um nó novo exige uma linha no registro, ou o portão reprova.
É deliberado: é o que impede o próximo nó de nascer apontando para lugar nenhum.

**O que não foi feito, e por quê.** Não entrou um `prebuild` chamando o vitest
para validar o registro: ele repetiria o que o CI já faz antes do build e poria a
publicação na dependência de uma ferramenta de teste estar instalada no ambiente
de build. A validação roda na carga do módulo em desenvolvimento, e como teste no
CI.

## Portões

- `tests/unit/roadmap-learning-target.test.ts` — todo nó declarado; nenhuma rota
  genérica; ids válidos; regras de conclusão; e o teste que proíbe a tela de
  voltar a montar rota de aprendizado à mão.
- `tests/unit/jornada-de-licoes-tela.test.tsx` — a sequência anda sozinha e
  retoma no ponto certo.
- `tests/e2e/roadmap-aprender.spec.ts` — o caminho do aluno, clicando no card.
