# ADR-0027 — A rodada de treino tem tipo, e a abertura tem fronteira

- **Estado:** aceito
- **Data:** 2026-09-17
- **Relacionado:** ADR-0026 (a prática guiada treina o que o treino cobra),
  ADR-0025 (matriz de cobertura), plano VNext §22, §23, §33

## Contexto

Duas decisões que o plano VNext separa e que o código tratava como uma só.

### 1. Toda rodada de ramo começava exatamente na bifurcação

`raizDoAlvo` levava a rodada direto ao nó em que a variação diverge. Isso
resolveu um problema real — repetir o prefixo compartilhado a cada rodada faz o
aluno parar de treinar variação — e criou o oposto: **treinar uma FEN isolada**.

O aluno reconhece o quadro e não o caminho. Numa partida a posição nunca chega
sozinha, e um repertório decorado por imagem para de servir na primeira vez em
que a ordem dos lances muda.

O plano §33.3 proíbe os dois extremos: nem sempre da posição inicial, nem sempre
de uma FEN isolada.

### 2. O fim da linha era "linha concluída"

O painel dizia _"Você recuperou a linha inteira até o fim da abertura."_

Isso ensina que a abertura é uma lista que acabou, e produz exatamente o efeito
que o plano §23 nomeia: **"sei 8 lances e depois não sei o que fazer"**.

## Decisão

### 1. A rodada tem tipo

```ts
type TipoDeRodadaDeAbertura = 'contexto' | 'ramo'
```

`contexto` parte do início da abertura e **reconstrói o caminho**. `ramo` parte
de poucas decisões antes do desvio e é **prática eficiente**.

### 2. A regra de qual tipo usar é pedagógica, e a ordem importa

| Situação                         | Tipo       |
| -------------------------------- | ---------- |
| linha principal, qualquer papel  | `contexto` |
| ramo ainda **não** coberto       | `contexto` |
| ramo já demonstrado, revisitando | `ramo`     |

Na primeira vez, o aluno precisa ver como se chega até a bifurcação. Depois de
demonstrá-la uma vez, repetir o prefixo inteiro é desperdício.

A linha principal é **sempre** contexto: ela não tem bifurcação de onde recuar —
ela **é** a linha.

### 3. O recuo conta DECISÕES, não plies

`decisoesDeContextoNoRamo: 1`, no config.

Recuar por plies entregaria a vez ao outro lado em metade dos casos, e a tela
pediria um lance a quem não é de jogar — o mesmo defeito que já apareceu na
prática guiada por índice de ply. Recuar por decisões preserva a fase, e é
também o que dá contexto de verdade: **o que explica a resposta é ver o
adversário escolher**.

Com o config em zero, o comportamento é indistinguível do anterior. Isso é
deliberado: permite recalibrar o número sem medo de estar mudando outra coisa, e
tem teste.

### 4. A fronteira entrega o plano

Ao terminar em sucesso, o painel diz **"Você chegou ao tipo de posição que esta
abertura procura"** e mostra:

- `transitionToMiddlegame` — o que a fase de abertura buscava;
- o primeiro plano da abertura, com nome e objetivo.

**Tudo é conteúdo autorado.** Se o conteúdo não declarar plano, a tela mostra
menos — nunca um plano gerado por heurística, que seria o app ensinando uma ideia
que ninguém escreveu nem revisou. Um portão afirma que o plano apontado existe
de fato na definição da abertura.

### 5. A tela diz de onde a rodada partiu

Sem isso, a rodada de ramo parece defeito: o aluno abre o treino e o tabuleiro já
tem lances jogados, sem nada explicando por quê.

## Uma premissa minha que o portão derrubou

Eu escrevi um teste afirmando que a rodada de ramo deveria abrir **na vez do
aluno**. Ele reprovou na hora, apontando `italiana / Defesa dos Dois Cavalos`.

A afirmação era falsa. A rodada abre na vez de **quem faz o lance que bifurca** —
num ramo autorado do adversário, quem joga primeiro é o computador, e é
justamente ver o desvio acontecer que dá sentido à resposta.

O invariante que ficou é o verdadeiro: **o recuo não muda de quem é a vez.**

Registro isso porque o teste errado teria sido fácil de "consertar" mudando o
código para satisfazê-lo — e o resultado seria uma rodada que pula o lance do
adversário, que é a única coisa que o ramo existe para ensinar.

## Ponto cego declarado

1. **A seleção de alvo continua sendo sorteio entre pendentes**, com
   anti-repetição. O score do §34.1 — fraqueza do aluno, relevância de partida
   real, estado de revisão — depende de `OpeningDecisionState`, que ainda não
   existe. Sortear com peso inventado seria falsa adaptação.
2. **A fronteira é sempre o fim da linha autorada.** Os tipos de boundary do §22.1
   (`graph-leaf`, `ply`, `position`, `handoff`) não foram modelados: hoje só
   existe um caso no conteúdo, e um tipo-união com quatro variantes das quais três
   nunca ocorrem é estrutura que parece pronta e não é.
3. **A fronteira não faz pergunta.** O §23 sugere cobrar "qual seu plano? qual
   ruptura?". Isso é microdecisão, e o mecanismo dela já existe no ADR-0024 —
   ligá-lo aqui depende de o conteúdo declarar a microdecisão da posição final,
   que hoje nenhum plano tem.
