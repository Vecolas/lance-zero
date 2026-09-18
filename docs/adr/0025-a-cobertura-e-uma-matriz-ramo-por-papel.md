# ADR-0025 — A cobertura é uma matriz ramo × papel, e só o core bloqueia

- **Estado:** aceito
- **Data:** 2026-09-17
- **Relacionado:** ADR-0022 (o ramo é a unidade — **fecha um ponto cego dele**),
  ADR-0021 (o treino de final termina), plano VNext §27

## Contexto

O treino final exigia uma lista de alvos assim:

```
mainline · variação-1 · variação-2 · … · perspectiva-reversa
```

Dois problemas, e o segundo estava escrito como ponto cego no ADR-0022.

### 1. `perspectiva-reversa` era um alvo só, e amplo demais

O plano VNext §27.1 diagnostica exatamente isso. O alvo significava "jogou a
abertura pelo outro lado **uma vez**" — e não dizia nada sobre **qual linha** foi
enfrentada. O aluno demonstrava a linha principal pelo lado de lá e o app
registrava que ele sabia defender a abertura inteira, ramos incluídos.

### 2. A cobertura cobrava o que o curso dizia não ser necessário

`alvosDeTreinoFinal` derivava de `opening.variations` **inteiro**. Depois do
ADR-0022, um ramo `secondary` aparecia na biblioteca rotulado "complementar" — e
era cobrado no treino como qualquer outro.

**As duas metades do produto discordavam sobre o que é essencial.** Quem pagava
era quem não conseguia fechar a jornada, sem nenhuma tela explicando por quê.

## Decisão

### 1. A cobertura é uma matriz

| Linha            | Lado do repertório |      Lado de lá |
| ---------------- | -----------------: | --------------: |
| Linha principal  |        obrigatório | **obrigatório** |
| Ramo `core`      |        obrigatório |     recomendado |
| Ramo `secondary` |        recomendado |     recomendado |
| Ramo `optional`  |        recomendado |     recomendado |

`matrizDeCobertura(opening)` é a única fonte: `alvosDeTreinoFinal` e
`alvosRecomendados` derivam dela, e a tela dos dois lados lê a **mesma função**
que o treino usa para escolher a próxima rodada. Duas contagens da mesma coisa
divergem no dia em que só uma for corrigida.

### 2. Só o `core` bloqueia — o ponto cego do ADR-0022, fechado

Um ramo `secondary` deixa de entrar nos alvos exigidos. Ele continua visível,
continua estudável e continua treinável — o que muda é o que **tranca a
conclusão**.

### 3. O curso não dobra (§27.3)

O lado de lá é obrigatório **só na linha principal**. Exigir todo ramo `core` nos
dois papéis transformaria uma jornada de seis rodadas numa de dez sem que o
conteúdo tivesse crescido — e a etapa que ensina viraria a etapa que cansa.

### 4. `perspectiva-reversa` mantém o id antigo

Os alvos reversos de ramo são `reverso:<ramoId>`. O reverso da linha principal
continua sendo `perspectiva-reversa`, e **não** virou `reverso:mainline`.

A assimetria é feia e deliberada: `alvosCobertos` é **persistido**, e renomear
aquele id descartaria em silêncio a cobertura de quem já demonstrou os dois
lados — a jornada dele voltaria a ficar incompleta sem nada ter acontecido.
Compatibilidade ganhou de simetria.

## O defeito silencioso que isto quase criou

`raizDoAlvo` e `profundidadeDoAlvo` procuram a variação por id:

```ts
opening.variations.find((c) => c.id === alvo)
```

Um alvo `reverso:italiana-dois-cavalos` **não casa com nenhuma variação**. Sem
`ramoDoAlvo`, as duas funções cairiam no `return raiz` e o aluno que pediu para
enfrentar a Defesa dos Dois Cavalos receberia a **linha principal** — sem
exceção, sem log, sem nada na tela dizendo que o pedido foi ignorado.

O portão que guarda isso compara a rodada reversa com a do mesmo ramo pelo lado
do repertório: mesma raiz, mesma profundidade, lado invertido. Plantei a
regressão de propósito e ele reprovou nomeando o ramo.

## Na tela

A etapa "Jogar pelos dois lados" era dois parágrafos prometendo que "no treino
final você vai jogar uma rodada pelo lado oposto" — verdadeiro e vago: **uma**
rodada, sobre uma linha que a etapa não nomeava.

Agora é uma `<table>` de verdade, com `<th scope>` nas linhas e colunas. Uma
grade de divs com aparência de tabela lê como uma sequência de palavras soltas em
leitor de tela, e esta é justamente a tela que responde "o que falta para eu
terminar". Cada célula traz **símbolo e palavra** — ✓ demonstrado, ○ obrigatório,
· recomendado.

## Ponto cego declarado

1. **Nada ainda oferece os alvos recomendados para jogar.** `alvosRecomendados`
   existe e a matriz os mostra, mas o treino final só sorteia entre os exigidos.
   Oferecer o opcional é a fase do treino adaptativo (VNext §29 e §34).
2. **A importância continua sendo julgamento editorial**, como o ADR-0022 já
   declarava. A matriz herda essa limitação inteira: ela é precisa sobre o que o
   conteúdo diz, e o conteúdo ainda não foi calibrado com dados de aluno.
3. **Quem já cobriu um ramo `secondary` mantém o registro** em `alvosCobertos`.
   É entrada a mais que nenhuma regra lê — inofensiva, e preferível a uma
   limpeza que apagasse trabalho real do aluno.
