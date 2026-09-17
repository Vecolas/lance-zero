# ADR-0019 — Responder é jogar: a posição anda e o computador responde

- **Estado:** aceito
- **Data:** 2026-09-17
- **Relacionado:** ADR-0017 (a variação se ensina e se enfrenta), ADR-0016 (uma etapa por vez), ADR-0014 (tabuleiro dominante)

## Contexto

O ADR anterior sobre resposta no tabuleiro tirou a lista de notação das telas: a
pergunta que pode ser respondida com um lance passou a ser respondida com um
lance. Ficou um degrau inteiro por subir, e ele aparecia em quatro telas ao
mesmo tempo.

1. **O lance não ficava jogado.** `LicaoPlayer` renderizava `fen={exercicio.fen}`
   do começo ao fim. O aluno arrastava a peça, acertava, e a peça voltava. O
   lance certo nunca aparecia no tabuleiro e o adversário não existia — `grep`
   por resposta automática em lições devolvia zero.

2. **A tela trocava a cada lance.** A prática guiada da abertura pedia um clique
   em `Continuar` depois de **cada** lance. Pior: como o índice do item era o
   índice do lance, ela pedia também os lances do ADVERSÁRIO — o aluno jogava os
   dois lados, um lance por tela, contra ninguém.

3. **O treino do final não tinha adversário.** `interactive={!terminou}` não
   olhava de quem era a vez. A tela dizia "conduza a posição até o fim" e
   entregava um tabuleiro de análise: o aluno "ganhava" todo final movendo as
   peças pretas para onde convinha, e nada dizia que não havia ninguém do outro
   lado.

4. **A prática guiada do final não tinha posição.** A pergunta era _"qual é o
   elemento crítico DESTA posição?"_ e não havia posição alguma na tela.

E havia um defeito mudo por baixo de tudo: `LicaoAberta` tratava "ainda não sei"
e "não tem repositório" como o mesmo caso — os dois são `repo === null`. A tela
montava o player na etapa 1, o aluno avançava, e quando o IndexedDB abria o
player **desmontava e remontava na etapa gravada**. Dois cliques em `Continuar`,
e a lição rebobinava para o primeiro.

## Decisão

### 1. Um motor de sequência, puro, e o adversário na MESMA transição

`src/domain/exercicios/sequencia.ts` guarda uma linha e caminha por ela. O lance
do aluno e a resposta do computador acontecem na mesma transição — nunca num
efeito com relógio, nunca depois de um botão. **Não existe instante em que é a
vez do computador e a tela está parada esperando um clique.**

É a forma que `SparringDaAbertura` já usava e que o lint do projeto obrigou uma
vez: efeito que escreve estado foi recusado ali, e não volta aqui.

**Quem joga cada lance é derivado do FEN, nunca da paridade do índice.** A linha
pode começar pelo adversário — é o "lance preparatório" do dump da Lichess, e é
o caso do banco de puzzles inteiro. Um módulo que lesse a paridade mentiria
exatamente ali. É também o que faz "treinando de brancas o computador joga de
pretas, e o contrário também" ser verdade sem nenhum caso especial nas telas.

### 2. Linha de UM lance é o caso normal

Quando um lance resolve, o exercício termina nele e o computador não responde
nada. Forçar uma resposta inventaria continuação que o conteúdo não tem.

Por isso `continuacao` é **opcional** em `ExercicioPosicional`, e a linha é
DERIVADA quando ela não existe: `[lancesAceitos[0]]`. Os 36 exercícios do
catálogo migraram sem uma palavra de conteúdo novo, e acrescentar a resposta do
adversário a uma lição passou a ser acrescentar um campo.

Dois testes guardam o par, e eles existem juntos de propósito: com continuação o
tabuleiro anda **dois** lances num gesto; sem continuação anda **um** e acaba.
Sem o segundo, "responder sozinho" viraria "jogar um lance a mais sempre".

### 3. Errar não anda a posição

Lance legal fora da linha faz **snapback**: a peça volta, a posição fica, o texto
ao lado explica e conta a tentativa. Levar o aluno para a posição seguinte seria
ensinar que errar é um jeito de avançar.

Lance ilegal continua não sendo erro conceitual — a ordem das duas perguntas
("isto é um lance?" antes de "é ESTE lance?") é a mesma de
`resposta-no-tabuleiro.ts`, e um arraste torto não mexe na contagem nem abre
dica.

### 4. Uma tela de exercício, dentro da `MesaDeEstudo`

`ExercicioNoTabuleiro` substituiu duas cópias quase literais — o `Tabuleiro` da
lição e o `ItemDePratica` da prática de habilidade. As duas já tinham divergido:
na prática de habilidade a grade punha o **tabuleiro** na coluna estreita de
20 rem e o texto na larga.

O texto fica ao lado por construção, porque a mesa é a mesma das jornadas.
Abaixo de 60 rem ele vai para baixo, com o tabuleiro primeiro — em 360 px não
existe "ao lado", e encolher o tabuleiro para forçar duas colunas é o que o
portão de layout do projeto reprova.

### 5. `attempt.ts` NÃO delega ao motor novo

Foi considerado e recusado depois de ler os dois. O núcleo compartilhado é
pequeno — aplicar o lance, aplicar a resposta. O que sobra em `attempt.ts` é
política de puzzle, e nenhuma delas vale para uma linha autorada de lição:

- mate fora da linha é ACEITO, porque o dump guarda uma linha só e recusar um
  mate correto seria mentir. Numa lição, o lance fora da linha é o que se quer
  corrigir;
- a tentativa REPROVA depois de dois erros, porque puzzle mede. A lição ensina:
  lá o erro devolve a peça e o aluno tenta de novo, sem limite;
- mate encerra a tentativa antes do fim da linha;
- linha do dataset quebrada no meio encerra como resolvida, porque o dado é de
  terceiro. Linha de lição quebrada é defeito nosso, e quem reprova é o portão.

Empurrar os quatro para o motor atrás de bandeiras produziria o desenho que
`@/domain/openings/jornada` recusa por escrito: _"um trainer genérico com
condicionais para os dois domínios"_. O que **era** de fato duplicado — a regra
de promoção — mudou-se para `@/domain/exercicios/lances` e hoje tem um dono só.

### 6. O adversário do final joga, e diz de onde veio

`escolherRespostaDoAdversario` já existia pronta e testada para o
`EndgameTrainer`; o treino da jornada passou a usá-la, com a mesma sonda de
tablebase. `aplicarRespostaDoAdversarioNoFinal` é nova e **separada** de
`jogarNaRodadaDeFinal`: aquela julga o lance DO ALUNO e pode reprovar a rodada,
e passar o lance do computador por ela faria o adversário reprovar o aluno ao
jogar bem.

**A procedência aparece na tela.** Um final convertido contra "um lance legal
qualquer" não é um final convertido, e esconder a diferença diria ao aluno que
ele venceu a defesa correta quando não venceu.

### 7. A prática guiada do final continua sendo escolha — com a posição na tela

A pergunta dela não é sobre um lance: _"atividade e relação dos reis"_ não se
joga no tabuleiro. A regra do projeto é que a pergunta **respondível com um
lance** se responde no tabuleiro; transformar esta num arraste exigiria inventar
um lance que o conteúdo não tem, e ensinaria que reconhecer é mover.

O que faltava era a posição, e ela entrou.

## Ponto cego declarado

1. **A rota do final continua sem `julgar`.** O treino aceita o lance e diz que
   não comparou — que é o comportamento honesto que já estava escrito lá. O
   adversário agora existe; o juiz do lance, não.
2. **`EndgamePosition` não guarda linha modelo**, então a defesa da jornada sai
   da tablebase ou de um lance legal. Nas posições de poucas peças do currículo
   a tablebase cobre; quando não cobrir, a tela diz.
3. **O ajudante de travessia dos testes de abertura passou a conhecer a linha
   principal.** Ele derivou-a do conteúdo em vez de copiá-la, mas continua sendo
   um teste que sabe o que a tela espera — e isso o torna cego a um repertório
   cujo conteúdo esteja errado do mesmo jeito nos dois lugares.
