# ADR-0026 — A prática guiada treina o que o treino cobra

- **Estado:** aceito
- **Data:** 2026-09-17
- **Relacionado:** ADR-0025 (matriz de cobertura), ADR-0023 (ajuda decrescente),
  ADR-0020 (a etapa só cobra o que a tela oferece), plano VNext §28–§30

## Contexto

A prática guiada treinava **só a linha principal**. O treino final cobrava a
principal **e os ramos**.

O degrau _com apoio_ preparava para uma coisa e a prova media outra. O aluno
chegava ao treino tendo praticado metade do que seria exigido, e descobria isso
errando — na única etapa do curso em que errar reprova a rodada.

## Decisão

### 1. A prática é um roteiro: principal, depois cada ramo `core`

`roteiroDaPraticaGuiada(opening)` devolve os trechos na ordem em que se joga. A
principal vem primeiro: treinar o desvio antes da linha que ele recusa é ensinar
a exceção antes da regra.

**Só ramo `core`**, pela mesma razão do ADR-0025 — o que não bloqueia a
conclusão do curso não pode bloquear a conclusão de uma etapa dele.

**O ramo que não bifurca não entra.** É o Giuoco Piano: um nome para um trecho da
própria principal. Cobrá-lo seria pedir os mesmos lances duas vezes com dois
títulos diferentes.

### 2. Cada trecho começa no próprio desvio

O computador monta a posição; a jogada começa onde o ramo ensina. Os itens do
ramo são só os que vêm **depois** da bifurcação.

### 3. A transição entre linhas é por botão

O tabuleiro voltaria ao começo sem aviso, e o aluno leria isso como um erro dele.

### 4. A ajuda decresce ao longo da ETAPA, não de cada linha

A escada é do aluno, não da linha. Recomeçá-la a cada ramo daria a ajuda máxima
de novo na quarta linha — que é o contrário de fading.

### 5. A taxonomia de erro do §30 chega à tela

| Tipo               | O que a tela faz                                                  |
| ------------------ | ----------------------------------------------------------------- |
| ilegal             | snapback **silencioso** — não é erro pedagógico (§30.1)           |
| fora do repertório | "pode ser jogável, mas não é a resposta que este curso consolida" |

Chamar o segundo de erro ensinaria que existe um lance certo por posição, que é
falso e é o oposto do que a etapa quer. Tratar o primeiro como decisão errada
ensinaria o aluno a desconfiar da própria leitura da posição.

## O defeito retroativo que isto quase causou

`etapaCumprida` para uma etapa de itens comparava `respondidos >= total`.

Ao crescer o conteúdo, o total sobe — e a comparação **volta a ser falsa para
quem já tinha terminado**. `jornadaConcluida` deixa de valer, o Sparring some da
tela, a marca de concluída desaparece. Nada aconteceu do lado do aluno, e nada na
tela explica.

A regra agora honra `completedStageIds`: **quem completou, completou sob a regra
que existia.** Isso é seguro porque `concluirEtapa` recusa gravar conclusão antes
de a regra ser cumprida — um teste guarda essa premissa, senão a proteção viraria
porta dos fundos.

**Quem estava no meio continua vendo os itens novos.** Metade não é conclusão, e
promover esconderia para sempre o conteúdo que a pessoa não viu — o mesmo
raciocínio da migração de nove etapas para oito.

## O defeito que os portões pegaram durante a entrega

A primeira versão montava a sequência do ramo com a linha **inteira**, ignorando
o `inicio` que o domínio calculava. O aluno tinha de rejogar `e4`, `Cf3`, `Bc4` —
os lances da principal que ele acabara de responder.

Pior que a repetição: esses plies **não têm item no ramo**, então respondê-los
não mexia na contagem. A etapa pedia lances que não contavam para nada, e o
portão de travessia parou nela acusando beco sem saída.

A asserção que ficou compara a FEN de abertura do trecho com a posição inicial e
com o índice dela dentro da linha do ramo.

## Ponto cego declarado

1. **Transposições não são aceitas** (§30.3). O conteúdo atual não tem linhas com
   ordens alternativas autoradas, então qualquer implementação seria mecanismo
   sem caso de uso — e um caminho de aceitação que nunca dispara é pior que a
   ausência dele, porque parece pronto.
2. **A seleção não é adaptativa** (§29). O roteiro é a ordem do conteúdo, não um
   score por decisão fraca ou erro recente. O score do plano depende de
   `OpeningDecisionState`, que ainda não existe.
3. **A ajuda decrescente usa só duas alturas** — objetivo e nada. A escada de
   quatro degraus do §19 pertence ao estudo de variação, não a esta etapa.
