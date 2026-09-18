# ADR-0028 — A revisão de abertura é por ramo, e reconstrói o caminho

- **Estado:** aceito
- **Data:** 2026-09-17
- **Relacionado:** ADR-0027 (a rodada tem tipo), ADR-0022 (o ramo é a unidade),
  plano VNext §43–§46

## Contexto

Cada nó do repertório vira um card de FSRS, e **isso deve continuar**: agendar
por posição é o que faz a revisão acertar o que o aluno de fato esqueceu. O
problema nunca foi o modelo — é a apresentação e o enquadramento.

### O que eu encontrei ao abrir o código

`planner-v2` **já agrupava** cards de abertura em itens pedagógicos. A chave era:

```ts
return `opening:${parts[1] ?? card.id}` // o id da ABERTURA
```

Toda a Italiana virava **um** item. E `MAX_STEPS_PER_ITEM = 7` corta o item em
sete passos, então os cards além do sétimo **não entram na sessão**.

Eles continuam vencidos e voltam depois — não há perda de dado. Mas o aluno vê
"1 item" onde há vinte posições, e **a fila não encolhe por mais que ele
revise**. É o "1/20 por ply" do §45 pelo avesso: em vez de vinte itens iguais,
um item que nunca termina.

### O segundo problema é pedagógico

A revisão largava o aluno numa FEN do meio da linha e perguntava o lance. Isso
mede **reconhecimento de imagem**, não repertório — e a diferença aparece
justamente na partida, onde a posição chega por um caminho e não por um cartão.

## Decisão

### 1. Refinar o que existe, não construir em paralelo

O planner ganhou um resolvedor **opcional** de subgrupo:

```ts
type ResolvedorDeSubgrupo = (card: ReviewCard) => string | null
```

Ele **refina, nunca substitui**: o resultado é acrescentado à chave da abertura,
então um resolvedor ausente ou que devolva `null` produz exatamente a chave de
antes — e nenhuma sessão já gravada muda de forma.

**Por que injetado e não resolvido no planner:** separar por ramo exige ler o
conteúdo do curso, e o planner é domínio puro — ele não conhece a Italiana. Quem
chama conhece.

### 2. O agrupamento é por ramo, com a regra "depois da bifurcação"

Um nó do prefixo compartilhado é da **linha principal**, mesmo que a linha do
ramo também passe por ele. Atribuí-lo ao ramo faria a mesma posição aparecer em
dois itens, e o aluno a revisaria duas vezes com o mesmo lance.

### 3. O título diz o que se revisa

"Abertura Italiana — Defesa dos Dois Cavalos", não "Abertura". Com seis cursos, a
categoria não informa nada. O título cai no rótulo genérico quando o item não é
de abertura — nunca inventa um nome.

### 4. A reconstrução de contexto (§44)

`contextoDaRevisao` devolve o caminho até a posição do card: duas decisões antes,
em UCI e em SAN.

**Recua por decisões, não por plies** — a mesma razão do ADR-0027: recuar um
número ímpar entregaria a vez ao outro lado, e a reconstrução terminaria numa
posição que não é a do card.

### 5. O CTA de reaprender aponta para a variação (§46)

`/aberturas/<slug>?etapa=variacoes&ramo=<id>&modo=reaprender`, e não a biblioteca
genérica. Quem falhou uma revisão precisa do conteúdo daquele ramo; mandá-lo para
a lista é pedir que procure sozinho o que o app já sabe.

## Os dois portões que escrevi contra mim mesmo

**Nenhum card se perde no agrupamento.** Um card fora de todo item é um card que
o aluno nunca revisa e cujo agendamento nunca avança: fica vencido para sempre, a
fila nunca zera, e nada explica por quê.

**Pelo menos um item é de ramo.** Sem esse piso, metade dos testes do arquivo
passaria por vacuidade — um agrupamento que jogasse todo card na linha principal
satisfaria "nenhum card se perde", "a principal vem primeiro" e o teste do CTA,
que só verifica a rota do ramo quando existe um ramo.

E um invariante que sustenta a reconstrução: **o caminho sempre termina na
posição do card.** Se terminasse noutra, o FSRS registraria acerto ou erro sobre
uma pergunta que não foi feita.

## O caso do card órfão

Editar o conteúdo pode deixar um card apontando para uma posição que nenhuma
linha alcança. A reconstrução então devolve a **posição crua**, com lista vazia.

Inventar um caminho até ela ensinaria uma ordem de lances que o repertório não
tem — pior que não reconstruir.

## Ponto cego declarado

1. **A sessão ainda não JOGA a reconstrução.** `contextoDaRevisao` existe, está
   testada e o agrupamento a usa; ligar o tabuleiro para percorrer o caminho
   antes de habilitar a entrada é mudança na máquina de estado da revisão, que
   serve aos cinco tipos de card. Fazê-la junto com o agrupamento seria mexer em
   duas coisas ao mesmo tempo na tela mais compartilhada do app.
2. **`MAX_STEPS_PER_ITEM = 7` continua cortando.** Com o corte por ramo ele
   morde muito menos — um ramo raramente tem sete nós —, mas a linha principal de
   uma abertura longa ainda pode passar disso.
3. **`agruparRevisaoDeAbertura` não é usada pela tela**, só pelos testes: a tela
   usa o resolvedor de subgrupo dentro do planner. Ela existe como a leitura
   direta e testável do agrupamento, e é a porta para a fila do dia listar itens
   de abertura com contagem própria.
