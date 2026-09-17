# ADR-0018 — Quem desvia decide a etapa, e o explorador sai da jornada

- **Estado:** aceito
- **Data:** 2026-09-17
- **Relacionado:** ADR-0017 (a variação se ensina e se enfrenta), ADR-0016 (uma etapa por vez)

## Contexto

A etapa 4/9 de uma abertura chama-se **"Melhores respostas do adversário"** e
promete, no cabeçalho, _"antecipar o que as pretas realmente jogam nesta
posição"_.

O que ela entregava era uma lista de nomes de variação em texto — a **mesma
lista** que a etapa 5/9 mostrava logo depois — seguida de um `ExplorerPanel` com
um menu suspenso de posições para consultar o explorador da Lichess.

Três defeitos, e o terceiro é o que torna os outros dois invisíveis:

1. **A posição não estava na tela.** A etapa falava de decisões do adversário
   sem mostrar a decisão. O ADR-0017 já tinha corrigido exatamente isto na etapa
   seguinte, e a 4/9 ficou para trás.

2. **O explorador virou a aula.** O plano definitivo de aberturas é explícito no
   §60 — _"não usar como UI principal"_ — e no §61 — _"frequência é insumo, não
   aula"_. Um menu de FENs dentro de uma etapa de estudo transfere ao aluno a
   decisão pedagógica que o produto acabou de tomar, e faz a frequência do mundo
   virar autoridade sobre o repertório dele. Some-se a isso o fato registrado na
   issue #71: `explorer.lichess.ovh` responde **401 a requisição anônima** desde
   2026-09, de duas máquinas diferentes. O menu era um convite para uma consulta
   que sabemos que falha.

3. **As duas etapas liam a mesma lista, e ninguém tinha escrito qual pergunta
   cada uma responde.** Enquanto as duas mostravam `opening.variations` inteiro,
   a duplicação passava por variação de layout.

## Decisão

### 1. A partição é por AUTOR DA DECISÃO, não por importância

- **4/9 responde _"o que ele joga aqui?"_** — os ramos em que quem recusa a
  linha principal é o **adversário**;
- **5/9 responde _"onde eu escolho?"_** — o complemento exato: os desvios do
  próprio aluno, mais os nomes que não desviam (o Giuoco Piano é o nome de um
  trecho da própria linha principal).

A definição mora em `ehRespostaDoAdversario`, em `src/domain/openings/variacoes.ts`,
e é **complementar por construção**: `respostasDoAdversario` e `variacoesDoAluno`
filtram a mesma lista por um predicado e sua negação. Um portão afirma que a
soma das duas é o total e que nenhum id aparece nas duas.

O ADR-0017 já registra que _"variação = lance do outro"_ mentiria em um terço do
conteúdo — a Eslava, dentro do repertório de pretas do Gambito da Dama Recusado,
é escolha do aluno. Por isso isto é uma **partição**, e nunca uma suposição.

**O objetivo da etapa 5 mudou junto.** Ele dizia _"saber o que muda quando o
ADVERSÁRIO desvia da linha principal"_, que é, palavra por palavra, a etapa
anterior. Separar as listas tornou a frase falsa, e promessa falsa no cabeçalho
é pior que etapa magra.

### 2. Uma tela, duas etapas

`LinhasEnsinadas` atende as duas: recebe a lista já separada, os textos da etapa
e devolve seletor de linhas + `LinhaComentada` começando no desvio. Não são dois
componentes porque duas cópias da mesma tela divergem na primeira correção que
só uma delas recebe — que é precisamente como a 4/9 ficou sem tabuleiro depois
do ADR-0017.

### 3. O explorador sai da jornada e fica em `/openings`

O `ExplorerPanel` continua montado no `RepertorioCard`, em `/openings`, que é
onde ele é enriquecimento e não currículo. **Nenhuma capacidade foi perdida** —
a regra "migrar, não apagar" continua respeitada.

O teste da jornada (`o Explorer continua sendo enriquecimento sob demanda`) foi
**deletado, e não perdido**: a propriedade que ele guardava — o explorador não
consulta a rede sozinho — já é afirmada em `tests/e2e/aberturas.spec.ts`, na
tela onde o painel mora. E a metade que faltava lá foi fechada **antes** da
remoção: o teste de falha passou a contar `consultas === 1` depois do clique,
para que um botão que parasse de disparar a consulta não passasse nos dois lados.

No lugar dele, o teste novo da etapa 4 conta as consultas e exige **zero**: a
saída do explorador é afirmada, não prometida.

### 4. Resposta do adversário é alvo de cobertura do treino final

`alvosDeTreinoFinal` deriva de `opening.variations` e **não foi editado**: cada
resposta autorada passa a ser cobrada no treino final sozinha. Foi considerado e
**rejeitado** separar ensino de cobrança — deixar as respostas alimentarem o bot
sem entrarem na cobertura recriaria, pelo lado da cobertura, exatamente o
defeito que o ADR-0017 corrigiu pelo lado do bot: _variação que o adversário
nunca joga é decoração_. O aluno terminaria o treino sem nunca ter enfrentado o
que a etapa 4 acabou de ensinar, e a tela continuaria verde.

O custo é real e está medido: o treino final vai de 2–4 para 4–6 rodadas por
abertura. As rodadas de resposta são curtas porque `raizDoAlvo` começa a rodada
**no nó do desvio** — 1 ou 2 lances do aluno cada.

### 5. Toda resposta de uma abertura ramifica do MESMO nó

Regra de autoria, e ela tem dois motivos independentes:

- **produto:** uma posição, N respostas. O tabuleiro não salta quando o aluno
  troca de chip, e a etapa é sobre _aquela_ decisão;
- **mecânico:** `lanceDoBot` escolhe `opcoes[seed % opcoes.length]` e recebe o
  **mesmo `seed` em toda profundidade**. Duas profundidades de ramificação do bot
  no mesmo caminho podem tornar a mais profunda inalcançável para **todo** seed,
  quando as contagens de opções compartilham fator. O conteúdo ficaria na tela e
  nunca seria jogado.

O portão que faz a regra valer já existe: `tests/unit/openings-sparring.test.ts`
gera um caso por resposta e reprova com _"nunca é jogada pelo bot"_. A correção
estrutural de `lanceDoBot` fica como issue separada — a regra de autoria não
depende dela.

### 6. O piso de comentário, e onde ele mora

Todo lance **do desvio em diante** precisa de comentário com ao menos 40
caracteres, diferente do comentário da linha principal no mesmo índice, e o
lance do desvio precisa dizer também o que prepara (`strategicIdea` ou
`resultingPlan`).

O piso **não é calibrado**. Ele é o comprimento abaixo do qual todo comentário
de variação do catálogo anterior era rótulo e não explicação: `'Centro.'` tem 8,
`'Defesa natural.'` tem 15, `'Recupere e abra linhas.'` tem 23, e o mais longo
de todos, `'Sustente e4 e continue o plano.'`, tem 31.

O portão vive em `tests/unit/openings-variacoes.test.ts` e não em
`validateOpeningDefinition` porque `variacoes.ts` importa de `index.ts` — a
dependência inversa seria circular. **Ele foi rodado vermelho antes de verde:**
contra o conteúdo anterior reprova em três casos; contra o novo, passa.

A regra "diferente da principal" existe porque a maneira óbvia de burlar o piso
é colar o comentário da principal, que já é longo o bastante — e ele descreve o
lance **recusado**, não o jogado.

### 7. Uma variação PODE continuar depois do fim da linha principal

É o caso do Jogo Escocês, cuja principal termina em `4.Nxd4` e cujas respostas
vêm logo depois. Nesse caso `ramificacaoDaVariacao` devolve divergência com
`lanceRecusado: null`, e **a tela diz isso**: _"a linha principal termina em
Cxd4; daqui em diante quem escolhe é o adversário"_. Foi considerado proibir a
extensão e obrigar a estender a principal; a frase honesta é mais barata e mais
verdadeira — a principal de fato acabou ali, e fingir que existe um lance
recusado inventaria a alternativa que o conteúdo não tem.

## O que o conteúdo ganhou

Metade do catálogo não tinha variação nenhuma. Agora as seis aberturas têm ao
menos duas respostas do adversário, autoradas na voz da linha principal, e um
portão reprova a abertura que ficar sem nenhuma.

O prefixo compartilhado de cada linha passou a **reusar os objetos da linha
principal** (`[...italianaMain.slice(0, 5), lesson(6, 'Be7', …)]`) em vez de
redigitar `'Centro.'`: some a segunda cópia do mesmo lance, e some a chance de
as duas divergirem.

## Ponto cego declarado

1. **Nenhuma das respostas veio de estatística real.** A única fonte de
   popularidade que temos é o explorador, que não responde a nós. A ordem dos
   chips é a ordem autorada, e a tela **não afirma frequência** — dizer "33% das
   partidas" seria a falsa precisão que o `CLAUDE.md` proíbe.
2. **A cobertura pode creditar o ramo errado.** `lanceDirigidoDoRamo` força o
   COMPUTADOR na linha do alvo, mas `jogarNaRodada` aceita qualquer aresta do
   grafo para o ALUNO. Se duas linhas autoradas compartilharem nó e continuarem
   diferente, uma rodada com escopo A pode ser concluída dentro de B e creditar
   A. O conteúdo atual não ativa o caso — cada continuação de resposta tem uma
   única aresta de saída —, mas nada impede o próximo conteúdo de ativá-lo.
3. **O piso de 40 caracteres separa o catálogo em duas metades limpas, e isso é
   tudo o que ele prova.** Um comentário de 41 caracteres sem conteúdo passa.
   Nenhum portão automático distingue explicação de enchimento.
4. **A etapa 5 fica vazia em quatro das seis aberturas.** É o que a partição
   revelou sobre o conteúdo, não um defeito dela, e a decisão foi **deixar
   assim, dito na cara**: a tela afirma que não há variação sua a estudar **e
   que isso não é conteúdo faltando**, com a posição do repertório no tabuleiro.

   Foi considerado e adiado o que o V5.1 prevê — **oito** etapas na abertura,
   com "Respostas" fundida à linha principal. Fundir é uma segunda decisão e não
   entra aqui. Também foi considerado e recusado autorar uma "escolha de
   repertório" para as quatro aberturas que não têm nenhuma: inventar duas
   maneiras de jogar a mesma abertura para um aluno de ~1100 seria conteúdo
   escrito para encher uma etapa, e não porque ele precisa.
