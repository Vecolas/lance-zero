# ADR-0021 — O treino de final termina, e o conteúdo é conferido contra a tablebase

- **Estado:** aceito
- **Data:** 2026-09-17
- **Relacionado:** ADR-0020 (a etapa só cobra o que a tela oferece)
- **Altera:** o modelo de conteúdo de finais e a regra de cobertura do treino

## Contexto

O ADR-0020 destravou as etapas 1 a 9 da jornada de finais e declarou, como ponto
cego, que a **etapa 10 continuava sem saída**. Este ADR fecha essa etapa — e, ao
fechá-la, encontrou um problema maior embaixo.

### O treino nunca terminava

`src/app/[lang]/finais/[slug]/page.tsx` montava a jornada **sem passar `julgar`**.
No modo sem juiz, `VereditoDeLanceDeFinal.objetivo` é sempre `null`, então
`jogarNaRodadaDeFinal` nunca devolve `sucesso`, `registrarRodadaDeFinal` nunca é
chamado e a cobertura nunca fecha. Como o treino esconde o rodapé
(`rodapeOculto`), não havia nem "Continuar" para clicar. O computador tampouco
respondia: `fenDepois` era a posição logo após o lance do aluno, e ele conduzia
os dois lados.

Faltava também a **ponte entre os dois vocabulários de objetivo**:
`EndgamePosition['objective']` tem seis valores pedagógicos; `ObjetivoFinal`, que
`avaliarObjetivo` sabe julgar, tem três formas verificáveis. Sem tradução, não
havia como decidir o desfecho de nenhuma rodada.

### E o conteúdo mentia

Ligar o juiz num conteúdo falso apenas trocaria um beco imediato por um lento —
o aluno jogaria até a regra dos 50 lances para ouvir "não cumprido". Então o
conteúdo foi medido antes, contra a tablebase real. **Dezessete das quarenta e
uma posições de treino reprovaram:**

- quinze declaravam `win` em posições que a tablebase chama de **empate**
  (`king-activity`, `key-squares`, `king-pawn`, `distant-passer`, …);
- `philidor` — uma técnica **defensiva** — declarava vitória numa posição
  **perdida** para o lado treinado;
- `two-bishops` tinha os dois bispos em casas da **mesma cor**: o mate que a
  lição promete é impossível ali;
- duas FENs eram **ilegais** (rei em xeque com o outro lado na vez);
- até uma das duas posições escritas à mão (`oposicao-biblioteca-b`) estava
  errada.

A causa é estrutural: as posições de treino eram **geradas a partir de
`previewFen`** — o diagrama de ilustração do card — com `sideToTrain: 'white'`,
`objective: 'win'` e `validationSource: 'curated'` cravados para todos.
Trinta e oito afirmações que ninguém nunca conferiu.

## Decisão

### 1. Ilustrar e treinar são campos diferentes

`EndgameDefinition` ganha `training: { fen, sideToTrain, objective, expectedResult }`.
`previewFen` volta a ser só o diagrama do card. `ENDGAME_POSITION_SETS` passa a
sair de `training`.

O **espelho continua gerado**, e continua legítimo: refletir as colunas preserva
o resultado teórico exatamente (não há roque nem _en passant_ nestes finais) e é
o que dá a segunda posição distinta que o treino exige. O que mudou é que agora
ele espelha uma posição verdadeira.

### 2. As dezessete posições foram substituídas

Cada uma por uma posição do repertório clássico de finais, **verificada contra a
tablebase real** pelo portão de contrato antes de entrar. Sete finais de peão
passaram de `win` para `promote`: nos finais de peão a promoção **é** a conversão,
e exigir o mate depois dela alongaria a rodada sem ensinar nada a mais.

### 3. Um final pode ser puramente defensivo

`problemasDoConteudoDeFinal` exigia pelo menos uma posição de **ataque**, e
`alvosDoTreinoFinal` só sabia contar posições de ataque. Isso amarrava o produto
a finais ofensivos — e foi uma das pressões que levaram o catálogo a declarar
vitória onde não há.

Agora existe o conceito de **papel dominante** (`posicoesPrincipais`): quando há
posições de ataque, elas mandam; quando não há, a defesa é o treino. Philidor e
bispos de cores opostas passam a treinar o que realmente ensinam — segurar o
empate.

### 4. O objetivo da posição vira objetivo avaliável

`objetivoDaPosicao` (`src/domain/endgames/objetivo-da-posicao.ts`), `Record`
exaustivo:

| `objective`      | vira                                               |
| ---------------- | -------------------------------------------------- |
| `win`, `mate`    | `mate-em` **sem limite de lances**                 |
| `promote`        | `promocao`, com o alvo derivado da posição inicial |
| `draw`, `defend` | `empate-defendido`                                 |
| `reach-target`   | **sem avaliador** — ponto cego declarado           |

**Sem limite de lances** é a decisão que mais importa. Um limite finito seria um
número inventado, e inventar aqui **reprova quem jogou certo e devagar** — o pior
erro que um treino pode cometer. A partida não corre risco de durar para sempre:
a regra dos 50 lances e a tríplice repetição a fecham, e `avaliarMate` já trata
empate como falha para quem precisava ganhar, que é a resposta correta do xadrez
para quem deixou a vitória escapar.

O alvo da promoção é **uma dama a mais do que o aluno já tem**, derivado da FEN
inicial. Cravar `1` daria a promoção por cumprida no lance zero num final de
damas — o objetivo nasceria satisfeito e o treino aprovaria quem não jogou.

### 5. O juiz mora na tela, e o adversário finalmente joga

`src/components/endgames/juiz-de-final.ts` compõe o que já existia:
`julgarLanceDeFinal` (grau do lance), `avaliarObjetivo` + `objetivoDaPosicao`
(desfecho), `percorrerTentativa` (contexto de repetição e 50 lances) e
**`escolherLancePratico`** — a política de resposta do computador que estava
escrita e testada no domínio desde a entrega da jornada e **nunca tinha sido
ligada**. É ela que evita as duas formas de adversário que não ensinam: o que se
deixa dar mate e o que anda de um lado para o outro até o empate.

Ele fica em `components/` e não em `domain/`: é o lugar do IO. O domínio continua
recebendo o veredito pronto, por parâmetro.

**Sem rede ele não inventa.** Tablebase muda: o julgamento vira `null` (a tela diz
que não deu para comparar) e a resposta cai para um lance legal. O **desfecho**
continua sendo avaliado, porque `avaliarObjetivo` é local — é o que garante que a
rodada termina mesmo offline, e há portão e2e que derruba a tablebase de propósito
para afirmar isso.

## O que NÃO muda

- **A rodada continua sem terminar no primeiro bom lance.** Um lance que preserva
  devolve `ativa`: conversão se joga até o fim.
- **Só o treino final reprova.** As etapas de itens seguem concluindo por
  responder.
- **`registrarRodadaDeFinal` continua sendo a única porta** entre rodada e
  cobertura, e continua recusando rodada falha.
- O espelho horizontal continua sendo a segunda posição da família.

## Portões

- `tests/contrato/biblioteca-vs-tablebase.test.ts` — **o portão que encontrou
  tudo isto**. Pergunta à tablebase real o resultado de cada posição de treino e
  compara com o `objective` declarado; também afirma, sem rede, que o lado
  treinado é quem tem a vez. Fora do CI (rede + serviço de terceiro):
  `pnpm test:contrato`.
- `tests/unit/endgames-objetivo-da-posicao.test.ts` — a tradução cobre todos os
  objetivos, e nenhum objetivo do catálogo nasce cumprido ou falhado.
- `tests/unit/endgames-juiz-de-final.test.ts` — a rodada conclui (inclusive
  offline), o sucesso vira cobertura, o computador responde e não escolhe o lance
  que entrega o resultado.
- `tests/e2e/jornada-sem-beco.spec.ts` — percorre a jornada até o treino e o
  **conclui com a tablebase derrubada**.

## Custos e pontos cegos declarados

- **As posições novas são minhas, não de um revisor de produto.** Elas são
  _verdadeiras_ — a tablebase confirma o resultado de cada uma —, mas "verdadeira"
  não é "boa para ensinar este conceito". A pedagogia de cada escolha precisa de
  revisão humana.
- **Duas posições continuam sem conferência.** O rompimento de três peões contra
  três (`passed-pawn`) tem oito peças e a tablebase vai até sete. Elas estão
  nomeadas numa lista que morde dos dois lados, em vez de passarem caladas.
- **`reach-target` segue sem avaliador.** Nenhuma posição o usa, e um portão
  afirma isso: no dia em que uma usar, ele reprova em vez de produzir uma rodada
  que não acaba.
- **Atividade, simplicidade e valor pedagógico entram como zero** na pontuação do
  lance do computador — a tablebase não os mede. Como valem o mesmo para todos os
  candidatos, não distorcem a ordem; mas a política está rodando com três dos seis
  critérios desligados.
- **O texto continua em PT mesmo em EN**, como no ADR-0020.
- **`CompletionRule` do planner segue com totais cravados à mão.**
