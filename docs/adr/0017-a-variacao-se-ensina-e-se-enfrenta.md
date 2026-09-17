# ADR-0017 — A variação se ensina na jornada e se enfrenta no treino

- **Estado:** aceito
- **Data:** 2026-09-16
- **Relacionado:** ADR-0016 (uma etapa por vez), ADR-0014 (tabuleiro dominante)

## Contexto

A etapa **"Variações importantes"** de uma abertura mostrava, por variação, três
coisas: nome, descrição e a linha inteira em notação numa string —
`e4 e5 Nf3 Nc6 Bc4 Nf6 d3`.

Dois defeitos, e eles se agravam um ao outro:

1. **A etapa não ensinava a variação.** Dos sete lances daquela string, cinco são
   reprise literal da linha principal que o aluno acabou de percorrer na etapa
   anterior. O único que importa — o desvio — não recebia destaque nenhum, e a
   posição em que a decisão acontece nunca aparecia na tela. Uma variação é uma
   DECISÃO tomada numa posição; sem a posição, "Cf6 em vez de Bc5" é uma
   informação que o aluno não tem como conferir.

2. **O bot do treino nunca jogava as variações.** `lanceDoBot` filtrava as
   continuações para a linha principal e só olhava as variações quando a
   principal acabava. Como uma variação ramifica JUSTAMENTE onde a principal
   continua, o filtro a tornava inalcançável: o aluno lia sobre a Defesa dos Dois
   Cavalos numa etapa e jamais a encontrava na prática.

Juntos, os dois fecham um círculo vicioso: conteúdo que não é ensinado e que
também nunca é cobrado. Variação que o adversário nunca joga é decoração.

## Decisão

**A mesma árvore de linhas serve às duas pontas: a jornada ensina, o treino
cobra.**

### 1. A etapa abre na posição do desvio

O tabuleiro da etapa mostra a posição em que a decisão é tomada — não a posição
inicial, não a posição depois do desvio. A navegação lance a lance começa NO
desvio, e o texto nomeia as duas metades da decisão: o lance que a variação joga
e o lance da linha principal que ela recusa.

Os lances anteriores viram uma frase ("Até e4 e5 Cf3 Cc6 Bc4, tudo igual à linha
principal"), porque eles já foram ensinados e repeti-los lance a lance faria o
aluno atravessar cinco telas conhecidas para chegar à única nova.

### 2. Uma variação que não desvia é dita como o que é

O Giuoco Piano, no conteúdo atual, é o nome de um trecho da própria linha
principal — `mainline.slice(0, 6)`. Ele não ramifica em lugar nenhum.

A etapa afirma isso em vez de inventar uma bifurcação: **"este é o nome da linha
principal até aqui — não é um desvio"**. Apresentar como escolha algo que não é
escolha ensinaria uma decisão que não existe no tabuleiro.

### 3. O bot joga as variações, e a rodada decide qual

`lanceDoBot` escolhe entre TODAS as continuações declaradas. A rodada da sessão
é o `seed`:

- **rodada 0 é a linha principal** — a primeira partida confirma o que foi
  ensinado;
- **recomeçar traz os desvios**, ciclicamente, então praticar várias vezes
  percorre o repertório em vez de repetir a mesma partida.

O botão "Recomeçar a partida" passa a dizer isso, porque um bot que muda de linha
sem avisar parece um bot que errou.

### 4. O treino diz o nome da linha que está jogando

Quando o desvio é jogado, a tela de prática nomeia a variação. É o que liga a
etapa que ensinou ao treino que cobra: sem o nome, o aluno reconhece a posição
mas não reconhece o que ela é, e cada partida vira um episódio solto.

O nome só aparece **depois** que o lance de desvio foi jogado, e só quando uma
única variação é compatível com o histórico. Nomear antes seria pôr nome numa
bifurcação que ainda não aconteceu; nomear entre duas compatíveis seria escolher
por sorteio e apresentar o resultado como fato.

## O que foi rejeitado

**Mini tabuleiro por variação, numa biblioteca à parte** — era o que o ADR-0016
deixara registrado como trabalho futuro, e foi descartado.

Uma galeria de posições enfileiradas é o mesmo erro da faixa de dez etapas que o
ADR-0016 desfez: o aluno passa a escolher entre miniaturas em vez de seguir uma
sequência, e nenhuma delas é grande o bastante para pensar dentro. Pior, ela
duplicaria a árvore — a biblioteca teria a sua cópia das linhas e o bot a dele,
e as duas divergiriam na primeira variação nova.

O caminho escolhido não tem segunda fonte: a etapa e o bot leem a **mesma**
`OpeningDefinition`.

## Consequências

- `src/domain/openings/variacoes.ts` é novo e **puro**: acha onde cada variação
  ramifica (`ramificacaoDaVariacao`) e responde em qual linha a partida está
  (`variacaoEmCurso`). Sem React, sem relógio.
- `posicoesDaLinha` mudou-se para lá. Era a terceira cópia do mesmo laço;
  percorrer uma linha é fato de xadrez, não de tela.
- Uma variação pode ramificar do lado do ALUNO, e não só do adversário — é o
  caso da Eslava no repertório de pretas do Gambito da Dama Recusado. O texto da
  etapa diz "você joga" nesses casos, e o treino aceita o desvio como teoria.
  Um módulo que assumisse "variação = lance do outro" mentiria em um terço do
  conteúdo atual.
- Três das seis aberturas não têm variação autorada. A etapa tem estado vazio
  honesto, com a posição que o repertório busca no tabuleiro.
- Um portão de conteúdo novo prova que toda linha autorada é legal do começo ao
  fim. `posicoesDaLinha` para no primeiro lance impossível **em silêncio**: sem
  o portão, uma variação truncada apareceria na tela sem erro nenhum.

## Nota sobre o teste que quase passou pelo motivo errado

A primeira versão do teste "o bot joga as variações" perguntava se o lance do
desvio aparecia em algum lugar do histórico. Na Italiana isso ficava **verde com
o bot antigo**: o desvio é Cf6, e a linha principal também joga Cf6 — oito
lances depois.

A conferência passou a ser por **prefixo**: seguir a variação significa que os
lances até o desvio, inclusive, são exatamente os dela. Com o bot antigo o teste
reprova as duas aberturas que têm desvio do adversário, que é o que ele precisa
fazer para valer alguma coisa.
