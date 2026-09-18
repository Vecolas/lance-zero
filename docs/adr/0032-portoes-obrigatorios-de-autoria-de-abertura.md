# ADR-0032 — Os portões de autoria de abertura, e a regra de escopo que eles seguem

- **Estado:** aceito
- **Data:** 2026-09-18
- **Relacionado:** ADR-0030 (vocabulário compartilhado), ADR-0031 (Foundation e
  filhos), ADR-0023 (a linha principal se completa), plano de expansão §6
  (conteúdo obrigatório por branch), §52 (PlanLibrary) e §61 (checklist por core
  branch)

## Contexto

Escrever 29 cursos novos produziu uma taxa de erro de autoria que revisão humana
não pega: notação com xeque onde não há xeque, erro autorado colado na posição
errada, id de conceito que não existe, ramo que não diverge da linha principal.
Nenhum desses aparece lendo o arquivo — todos aparecem aplicando os lances.

O plano de expansão §61 já trazia um checklist por ramo `core`. Ele foi virado em
teste antes do conteúdo, e é por isso que a maioria dos defeitos morreu no
commit em que nasceu.

Dois defeitos escaparam mesmo assim, e os dois pela **mesma razão**: o portão
existia, e media outra coisa.

## Decisão

### 1. Os portões de autoria são obrigatórios e nomeiam o item

Todo curso passa por, no mínimo:

| Portão                 | O que cobra                                           | Onde                                  |
| ---------------------- | ----------------------------------------------------- | ------------------------------------- |
| Notação exata          | o SAN autorado é igual ao que o motor produz          | `openings-notacao.test.ts`            |
| Ply resolvido          | `positionPly` do erro existe na linha principal       | `openings-notacao.test.ts`            |
| Legalidade             | todo lance da principal e dos ramos é jogável         | `openings-notacao.test.ts`            |
| Checklist §61          | nome, ECO, intenção, objetivo, erro, fronteira, PT/EN | `openings-onda0.test.ts`              |
| Ids compartilhados     | conceito, estrutura e motivo existem                  | `openings-onda0.test.ts`              |
| Divergência            | o ramo diverge, e o lance do desvio diz o que prepara | `openings-variacoes.test.ts`          |
| Enunciado sem gabarito | o objetivo da decisão não contém o lance              | `openings-linha-principal.test.ts`    |
| Referências normativas | todo `§N` citado existe em algum plano                | `docs-referencias-normativas.test.ts` |

A mensagem de falha nomeia **curso, ramo e valor encontrado**. Um portão que diz
só "expected false to be true" é um portão que o autor aprende a ignorar.

### 2. O escopo da asserção é igual ao escopo do contrato

É a regra central deste ADR, e ela vem de dois defeitos reais.

**A notação.** O portão antigo cobrava só legalidade, e o `chess.js` aceita
`Bb4` onde o lance é `Bb4+` e aceita `Bb4+` onde não há xeque. O contrato era
"a notação está certa"; a asserção media "o lance é jogável". Quando o portão
passou a comparar com o SAN que o motor produz, ele reprovou quatro conteúdos
anteriores na primeira execução.

**A microdecisão.** O teste se chama _"pelo menos um plano do curso tem
microdecisão"_, o comentário dele diz "obrigatória no conjunto", e a asserção é
`comMicro.length > 0` sobre o catálogo inteiro. Dois planos em 35 cursos bastam
para deixá-lo verde — e é exatamente o que acontece hoje, com 103 dos 105 planos
sem microdecisão.

Portanto: **quando o contrato fala de "cada curso", a asserção agrupa por curso;
quando fala de "cada ramo", agrupa por ramo.** Um piso global só é aceitável
quando o contrato é global, e nesse caso o nome do teste tem de dizer "no
catálogo".

### 3. Um portão que nunca reprovou não é um portão

Todo portão novo é verificado contra um defeito plantado, e a verificação é
registrada no commit. Foi assim que se descobriu que a queda silenciosa de
`positionPly` não ia para o início da partida, e sim para o último lance da
principal — pior do que a hipótese.

### 4. Exceção declarada, nunca exceção silenciosa

Quando um portão precisa tolerar algo, a tolerância é uma lista nomeada no
próprio teste, com o porquê, e o portão reprova quando a lista **cresce** e
também quando um item dela **deixa de ser necessário**. Uma exceção que sobrevive
ao problema que a justificava é pior que a ausência do portão, porque parece
cobertura.

## Consequências

**Boas.** O custo de escrever um curso caiu: o autor erra, o portão nomeia, o
erro morre no mesmo commit. Os portões pegaram defeitos em conteúdo escrito
meses antes.

**Ruins, e aceitas.** Portão estreito demais produz alarme falso — a primeira
versão do portão de referências normativas acusou 80 órfãs porque conhecia um
plano só, e quase todas eram citações legítimas ao plano errado. Alarme falso é
como um portão morre, então a calibragem é parte do trabalho, não um detalhe.

**Em aberto.** A regra de escopo do item 2 foi aplicada aos portões de notação e
de referências, e **ainda não** aos demais. Auditar todos os portões de Aberturas
com a pergunta "o escopo da asserção é o escopo do contrato?" é trabalho
pendente, e o primeiro item dele é o de microdecisão (dívida D-01).
