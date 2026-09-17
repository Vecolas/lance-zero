# LanceZero — Plano Definitivo VNext para a Área de Aberturas
## Pesquisa, diagnóstico do sistema atual e plano de implementação

**Base analisada:** `MAPA-DO-SISTEMA.md`, varredura da `main` integrada em 2026-09-17.

Este documento não propõe “mais conteúdo” como solução principal. O objetivo é tornar o que já existe na área de Aberturas mais coerente, adaptativo, didático e robusto, preservando a arquitetura que já funciona.

---

# 0. Decisão executiva

A área de Aberturas deve deixar de ser percebida como uma sequência de páginas/etapas que o usuário “consome” e passar a funcionar como um **sistema de aquisição de repertório e compreensão de posições**.

O novo ciclo deve ser:

```text
VER A POSIÇÃO
→ ENTENDER A IDEIA
→ VER UM EXEMPLO RESOLVIDO
→ COMPLETAR DECISÕES COM AJUDA
→ ESTUDAR AS VARIAÇÕES IMPORTANTES
→ ENTENDER O PLANO RESULTANTE
→ JOGAR PELOS DOIS LADOS
→ PRATICAR COM AJUDA DECRESCENTE
→ TREINAR RAMOS MISTURADOS SEM AJUDA
→ REVISAR DEPOIS
→ ENCONTRAR O MESMO CONHECIMENTO NAS PRÓPRIAS PARTIDAS
```

A principal mudança estrutural é:

```text
ANTES

Visão
Ideias
Linha
Respostas do adversário
Variações
Planos
Dois lados
Prática guiada
Treino

DEPOIS

Visão
Ideias
Linha principal
Variações
Planos
Dois lados
Prática guiada
Treino
```

A etapa isolada **“Respostas do adversário” deve desaparecer**.

As respostas do adversário são propriedades dos ramos da abertura e devem ser ensinadas dentro de:

- Linha principal;
- Variações;
- Dois lados;
- Prática;
- Treino.

Isso simplifica a jornada sem reduzir conhecimento.

---

# 1. O que já existe e deve ser preservado

A implementação atual tem uma base técnica forte. Não substituir essas partes sem necessidade.

## 1.1 Grafo de posições

Já existe:

```text
buildOpeningGraph
posição → arestas
identidade de posição
reconhecimento de transposições
```

Isso é exatamente a estrutura correta para um sistema de repertório robusto.

O VNext deve se apoiar ainda mais no grafo.

Não voltar para:

```text
array linear de variantes
```

como fonte principal de verdade.

---

## 1.2 Seis cursos autorados

Atualmente existem:

```text
italiana
caro-kann
gambito-da-dama-recusado
escocesa
sistema-londres
defesa-eslava
```

Eles já possuem:

- linha principal;
- comentários;
- variações;
- planos;
- estruturas de peões;
- erros comuns.

Portanto, o primeiro esforço não deve ser:

```text
adicionar 30 aberturas
```

O primeiro esforço deve ser:

```text
fazer essas seis ensinarem muito melhor.
```

---

## 1.3 Transposições

A identidade por posição já reconhece transposições.

Isso precisa continuar sendo uma vantagem central.

Se:

```text
A → B → C
```

e:

```text
A → D → C
```

chegam à mesma posição,

o sistema precisa saber:

```text
mesma posição de conhecimento.
```

Nunca punir um usuário por ter chegado a um node válido através de uma ordem conhecida e aceita.

---

## 1.4 Jornada genérica

`src/domain/jornada` é compartilhado entre Aberturas e Finais e é puro.

Preservar essa arquitetura.

Não colocar dentro dele regras como:

```text
if opening ...
```

As regras específicas ficam no domínio de Aberturas.

---

## 1.5 Regra de itens derivada do conteúdo

O sistema já corrigiu um defeito importante:

```text
total de itens
```

nasce da lista real que a UI desenha.

Preservar absolutamente.

Nenhum número como:

```text
total: 4
```

deve ser escrito manualmente se pode ser derivado dos ramos.

---

## 1.6 Prática guiada board-first

Atualmente:

```text
usuário joga no tabuleiro
computador responde
não existe botão entre lances
erro faz snapback
```

Isso está correto.

Deve virar padrão para toda parte interativa da área de Aberturas.

---

## 1.7 Treino por cobertura

O treino final já não é apenas:

```text
“acerte 10 vezes”
```

Ele cobra:

- linha principal;
- variações;
- perspectiva reversa.

E os targets nascem do conteúdo.

Preservar esse modelo.

Mas torná-lo mais granular e adaptativo.

---

## 1.8 MesaDeEstudo

Preservar como layout único.

Contrato:

```text
DESKTOP

TABULEIRO | INSTRUÇÕES

MOBILE

TABULEIRO
↓
INSTRUÇÕES
```

Não criar nova grade exclusiva para Aberturas.

---

## 1.9 Entrada pelo tabuleiro

Preservar:

```text
drag
+
clique em duas casas
```

Ambos são formas de jogar **no tabuleiro**.

Isso é melhor que exigir apenas drag porque mantém acessibilidade motora e uso confortável em dispositivos diferentes.

Nunca reintroduzir:

```text
botões SAN
campo UCI
lista de lances possíveis
```

como mecanismo de resposta.

---

## 1.10 Revisão espaçada

Já existe:

```text
ts-fsrs
reviewCards
nó de repertório
```

O VNext deve integrar melhor isso à experiência de Aberturas, não criar outro scheduler.

---

## 1.11 Partidas reais

O plano do dia já lê:

```text
desvios de repertório
erros de partidas
```

Isso é um ativo muito importante.

O VNext deve fechar o ciclo:

```text
estudar abertura
→ jogar partida
→ detectar desvio
→ voltar à abertura certa
→ treinar o ponto exato
```

---

# 2. Diagnóstico: os problemas mais importantes hoje

## 2.1 A jornada divide ramos por “quem toma a decisão”

Hoje existem:

```text
Respostas
Variações
```

como listas complementares.

Tecnicamente isso é limpo.

Pedagogicamente, é artificial.

O jogador pensa:

```text
“estou na Variante dos Dois Cavalos”
```

e não:

```text
“estou numa lista de branches cujo autor da decisão foi o oponente.”
```

### Correção

O ramo passa a ser a unidade visível.

Metadados como:

```text
quem desviou
quem toma a decisão
```

continuam no domínio.

Mas não criam duas etapas pedagógicas diferentes.

---

# 3. O que a pesquisa sugere

Este plano combina evidência de aprendizagem geral, pesquisa sobre expertise em xadrez e comparação com produtos de treino atuais.

Importante:

não existem estudos randomizados suficientes que digam exatamente como uma “página ideal de treinador de aberturas” deve funcionar.

Portanto:

- princípios de memória/aprendizagem têm base científica;
- decisões específicas de UX são hipóteses de produto;
- pesos e thresholds devem continuar configuráveis e calibrados por telemetria.

---

## 3.1 Reconhecimento de padrões importa muito no xadrez

Pesquisas clássicas de Gobet e Simon mostram que jogadores fortes armazenam e recuperam estruturas reconhecíveis de posições, em vez de depender apenas de busca profunda a cada lance.

Consequência para LanceZero:

não ensinar abertura como:

```text
e4
e5
Cf3
Cc6
Bc4
...
```

isoladamente.

Ensinar:

```text
posição
→ padrão
→ intenção
→ decisão
→ posição resultante
```

### Aplicação

Cada branch precisa destacar:

- estrutura;
- casas críticas;
- intenção de ambos os lados;
- mudança causada pelo último lance.

---

## 3.2 Worked examples são úteis no início

A literatura de exemplos resolvidos indica que iniciantes podem aprender melhor quando primeiro observam uma solução estruturada, em vez de serem jogados diretamente em resolução sem suporte.

Mas manter suporte por tempo demais cria dependência.

### Aplicação

Linha principal:

```text
primeiro:
ver + entender

depois:
completar partes

depois:
recuperar sem ajuda
```

Não manter a Linha Principal como slideshow passivo até o fim.

---

## 3.3 Fading: retirar ajuda progressivamente

Pesquisas sobre faded worked examples apoiam uma transição gradual de:

```text
solução mostrada
→ parte faltando
→ mais partes faltando
→ resolução independente
```

### Aplicação

Uma branch pode passar por:

```text
Demonstração
→ Movimento guiado
→ Movimento com dica opcional
→ Movimento sem dica
```

sem criar quatro páginas separadas.

---

## 3.4 Retrieval practice melhora retenção

Recuperar uma informação posteriormente tende a produzir retenção melhor que apenas reler.

### Aplicação

Depois de entender uma linha:

não perguntar novamente cinco segundos depois com a resposta ainda fresca.

O conteúdo deve voltar em:

```text
Prática guiada
Treino
Revisão futura
```

---

## 3.5 Spacing

A prática distribuída no tempo é robustamente associada a retenção melhor que repetição massiva.

### Aplicação

Não exigir que o usuário memorize toda a abertura numa sessão.

Depois da aquisição:

```text
FSRS
```

assume retenção.

---

## 3.6 Interleaving

Misturar tipos de problemas pode melhorar a capacidade de discriminar qual método/padrão usar, em vez de apenas repetir o mesmo formato.

### Aplicação

Treino final não deve ser:

```text
Giuoco
Giuoco
Giuoco
Giuoco
Two Knights
Two Knights
```

Preferir:

```text
mainline
Two Knights
mainline transposta
Giuoco
perspectiva reversa
Evans
```

respeitando nível, cobertura e repetição recente.

---

## 3.7 Self-explanation

Pedir ao estudante para explicar relações pode melhorar compreensão e transferência.

Não transformar isso em uma caixa de redação obrigatória.

### Aplicação leve

Durante estudo:

```text
“Antes de continuar, tente responder mentalmente:
o que ...Cf6 mudou na posição?”
```

Depois mostrar:

```text
ataca e4
desenvolve
prepara roque
aumenta pressão central
```

Sem pontuação obrigatória.

---

## 3.8 Prática deliberada

Pesquisa em expertise em xadrez encontrou associação forte entre estudo individual sério e nível de jogo.

Para produto, o principal insight é:

```text
treinar o que está fraco
```

é mais útil que repetir uniformemente tudo.

### Aplicação

Seleção adaptativa de branch baseada em:

- erro;
- tempo desde última revisão;
- desvio em partida real;
- cobertura faltante;
- dificuldade individual.

---

# 4. Benchmark de ferramentas atuais

## 4.1 ChessTempo

O treinador de aberturas oferece:

- treino de branch;
- repetição espaçada;
- prioridade por profundidade ou largura;
- limite de profundidade;
- identificação de moves resistentes;
- integração com desvios de partidas.

Insight útil:

```text
branch
```

é uma unidade excelente de treino.

Outro insight:

não existe uma única ordem universal para aprender um repertório.

Alguns usuários precisam:

```text
mainline primeiro
```

outros precisam:

```text
cobertura dos desvios mais cedo.
```

---

## 4.2 Chess.com Practice

Permite escolher:

- abertura;
- lado;
- prática contra bot que joga movimentos apropriados.

Insight:

escolher explicitamente o lado é valioso.

O LanceZero já tem perspectiva reversa e deve aprofundá-la.

---

## 4.3 Chess.com Lessons

O produto diferencia:

```text
learning path
```

e:

```text
lesson library.
```

Isso reforça uma decisão já boa do LanceZero:

```text
ordem recomendada
≠
conteúdo invisível.
```

---

## 4.4 Lições de abertura do Chess.com

As lições de abertura combinam:

- linhas principais;
- ideias estratégicas;
- táticas típicas;
- partidas modelo.

Para o LanceZero:

não criar necessariamente quatro módulos novos.

Usar esses elementos para ligar:

```text
memória do repertório
```

a:

```text
compreensão da posição.
```

---

# 5. Arquitetura pedagógica VNext

A jornada passa de 9 para 8 etapas:

```text
1. Visão
2. Ideias
3. Linha principal
4. Variações
5. Planos
6. Dois lados
7. Prática guiada
8. Treino
```

---

# 6. Navegação

A tela principal não deve mostrar os oito títulos simultaneamente numa faixa.

Mostrar:

```text
Variações
Etapa 4 de 8
```

Depois:

```text
Planos
Etapa 5 de 8
```

O componente é:

```text
StudyStageHeader
```

---

## 6.1 Exploração livre

Manter:

```text
Mapa do estudo
```

ou:

```text
Ver conteúdo
```

O mapa lista:

```text
✓ Visão
✓ Ideias
✓ Linha
◉ Variações
○ Planos
○ Dois lados
○ Guiada
○ Treino
```

Tudo acessível.

Progresso define:

```text
recomendação
conclusão
```

Não:

```text
permissão para abrir.
```

---

# 7. Layout fixo da experiência

Usar exclusivamente:

```text
MesaDeEstudo
```

Em desktop:

```text
┌────────────────────────────┬──────────────────────────────┐
│                            │                              │
│        TABULEIRO           │    CONTEÚDO / INSTRUÇÃO     │
│                            │                              │
│                            │    objetivo                  │
│                            │    explicação                │
│                            │    feedback                  │
│                            │    hint                      │
│                            │    navegação                 │
│                            │                              │
└────────────────────────────┴──────────────────────────────┘
```

Não colocar o texto pedagógico principal abaixo do board em desktop.

---

## 7.1 Não recriar grid

Se a coluna atual de 24 rem precisar de ajuste:

alterar `MesaDeEstudo`.

Não criar:

```text
OpeningStudyGrid
```

paralelo.

---

# 8. Novo modelo mental: “decisões de repertório”

O grafo deve passar a ser usado não apenas para reproduzir linhas, mas para identificar:

```text
CriticalDecision
```

Uma decisão é:

```text
posição
+
lado do aluno
+
objetivo
+
moves aceitos
+
branches resultantes
```

---

## 8.1 Modelo proposto

```ts
interface OpeningDecision {
  id: string
  positionId: string
  fen: string

  studentSide: 'white' | 'black'

  conceptIds: string[]

  repertoireMoves: string[]

  acceptableTranspositions?: string[]

  explanation: LocalizedText
  opponentIntent?: LocalizedText
  studentGoal: LocalizedText

  importance:
    | 'core'
    | 'secondary'
    | 'optional'
}
```

---

# 9. Modelo de Branch

```ts
interface OpeningBranch {
  id: string

  openingId: string
  name: LocalizedText

  branchPointPositionId: string

  actor:
    | 'student'
    | 'opponent'

  importance:
    | 'core'
    | 'secondary'
    | 'optional'

  moveSequence: string[]

  decisionIds: string[]

  planIds: string[]

  pawnStructureIds?: string[]

  tacticalMotifIds?: string[]

  exitPositionId?: string

  trainingBoundary: OpeningBoundary
}
```

`actor` continua existindo.

Mas serve como:

```text
metadata.
```

Não como etapa separada.

---

# 10. Corrigir o campo `frequency`

Hoje:

```text
frequency
```

é quantidade de linhas autoradas que passam pela aresta.

O nome parece:

```text
frequência real da jogada.
```

Isso é perigoso.

---

## 10.1 Renomear

Preferir:

```text
authoringPathCount
```

ou:

```text
lineCoverageCount
```

---

## 10.2 Frequência real

Se futuramente existir:

```text
referenceFrequency
```

ela deve trazer:

```ts
{
  value: number
  source: string
  population: string
  timeControl?: string
  ratingBand?: string
  asOf: string
}
```

Nunca misturar com contagem de autoria.

---

# 11. Não depender do Lichess Explorer em runtime

O próprio sistema já mediu falha 401 para uso anônimo e removeu o Explorer da jornada.

Preservar essa decisão.

Se frequência externa for importante:

usar:

```text
snapshot offline
```

ou:

```text
dados das partidas do próprio usuário.
```

A aula principal precisa continuar funcionando:

```text
offline/local-first.
```

---

# 12. Etapa 1 — Visão

Objetivo:

```text
dar um mapa mental antes da teoria.
```

---

## 12.1 Board obrigatório

Mostrar no board:

```text
posição característica
```

e não apenas posição inicial.

---

## 12.2 Painel direito

Responder:

```text
O que esta abertura tenta conseguir?
Que tipo de centro costuma aparecer?
Que peças ficam importantes?
Qual é o caráter da posição?
Quando a teoria deixa de ser o ponto principal?
```

---

## 12.3 “Ao final você deve saber”

Mostrar 3–5 outcomes concretos.

Exemplo:

```text
- reconhecer a estrutura típica;
- saber desenvolver sem perder e4;
- responder às três principais escolhas das pretas;
- chegar ao meio-jogo sabendo seu plano.
```

---

# 13. Etapa 2 — Ideias

Hoje não deve ser uma página de prosa.

Transformar em:

```text
IdeaGallery
```

Cada ideia possui:

```text
mini posição
→ abrir
→ board grande
→ explicação
→ microaplicação
```

---

## 13.1 Exemplos de ideia

Para uma abertura:

```text
controle do centro
ruptura d4
pressão em f7
casa forte d5
torre na coluna e
troca de bispo
```

---

## 13.2 Microaplicação

Depois de explicar:

perguntar no board:

```text
“Qual lance começa a colocar essa ideia em prática?”
```

Se houver um lance natural.

Não usar botão SAN.

---

# 14. Etapa 3 — Linha principal

Esta é uma área de grande oportunidade.

Hoje:

```text
tabuleiro fixo
um lance por vez
comentário
← / →
```

É útil como referência.

Mas passivo demais como aquisição.

---

# 15. Novo `LinhaComentada`

Preservar o componente, mas criar dois estados dentro da mesma etapa:

```text
ENTENDER
↓
COMPLETAR
```

Não novas abas.

---

## 15.1 Passo A — worked example

Primeiro contato:

```text
computador demonstra
comentário explica
board mostra
```

O usuário pode avançar.

---

## 15.2 Passo B — completion

Depois de alguns lances demonstrados:

o próximo lance passa a ser jogado pelo usuário.

Exemplo:

```text
Você já viu:
e4 e5 Cf3 Cc6

Agora:
“Seu objetivo é desenvolver pressionando f7.
Qual lance continua a ideia?”
```

Usuário joga:

```text
Bc4
```

no board.

---

## 15.3 Fading

Ao longo da linha:

reduzir ajuda.

Primeiras decisões:

```text
objetivo + hint
```

Depois:

```text
objetivo
```

Depois:

```text
posição apenas
```

---

## 15.4 Sem dupla contagem

Tudo isso continua sendo:

```text
Etapa Linha Principal
```

Não transformar cada lance em etapa global.

---

# 16. Etapa 4 — Variações

Esta deve ser uma das maiores melhorias.

Substituir a separação:

```text
respostasDoAdversario
variacoesDoAluno
```

na UI por:

```text
VariationLibrary
```

---

# 17. VariationLibrary

Exemplo:

```text
VARIAÇÕES PRINCIPAIS

[mini-board] Two Knights
            3...Cf6
            Core
            ✓ estudada

[mini-board] Giuoco Piano
            3...Bc5
            Core
            ◉ próxima

[mini-board] Evans Gambit
            4.b4
            Secondary
            ○ disponível
```

---

## 17.1 Card

Mostrar:

- mini-board no branch point;
- nome;
- primeiro movimento característico;
- por que existe;
- importância;
- status.

---

## 17.2 Não mostrar frequência falsa

Nunca renderizar o `frequency` atual como:

```text
“72% das partidas”
```

---

# 18. Estudo de uma variação

Abrir no mesmo:

```text
MesaDeEstudo
```

Board esquerda.

Texto direita.

---

## 18.1 Sequência pedagógica interna

Cada variação passa por:

```text
1. O que mudou?
2. O que o adversário quer?
3. Qual é seu objetivo?
4. Worked example curto
5. Você joga a decisão
6. Computador responde
7. O que fazer depois?
```

---

## 18.2 Exemplo

```text
Two Knights

Posição:
1.e4 e5 2.Cf3 Cc6 3.Bc4 Cf6

O que mudou?

O cavalo de f6:
- desenvolveu;
- atacou e4;
- criou pressão imediata.

Seu objetivo:
não perder o centro enquanto conclui o desenvolvimento.
```

Depois:

```text
“Jogue a continuação do seu repertório.”
```

Board interativo.

---

# 19. Hint ladder das variações

Nível 0:

```text
sem dica
```

Nível 1:

```text
objetivo
```

Nível 2:

```text
tipo de peça / ideia
```

Nível 3:

```text
zona do tabuleiro
```

Nível 4:

```text
seta / demonstração
```

Registrar:

```text
quantos hints foram necessários.
```

---

# 20. Core vs Secondary vs Optional

Separar importância pedagógica.

```text
core
secondary
optional
```

---

## 20.1 Core

Necessária para conclusão inicial.

---

## 20.2 Secondary

Recomendada, mas pode entrar depois.

---

## 20.3 Optional

Referência livre.

Não tornar o curso interminável.

---

# 21. Estratégia breadth-first no início

Para aproximadamente nível intermediário inicial:

é mais útil reconhecer vários desvios comuns cedo do que memorizar 18 lances de uma linha antes de conhecer uma resposta crítica no lance 4.

---

## 21.1 Política recomendada

Primeiro ciclo:

```text
mainline até boundary moderada
+
core branches superficiais
```

Depois:

```text
aprofundar ramos conforme necessidade.
```

---

## 21.2 Não hard-code

Criar configuração:

```ts
OPENING_LEARNING_POLICY = {
  initialBreadth: ...,
  initialDepth: ...,
  ...
}
```

---

# 22. Training Boundary

Não definir “fim da abertura” apenas como:

```text
12 plies.
```

Cada branch deve saber onde a aprendizagem daquela abertura deixa de ser:

```text
“qual é o lance do repertório?”
```

e vira:

```text
“qual é o plano desta posição?”
```

---

## 22.1 Tipos de boundary

```ts
type OpeningBoundary =
  | { type: 'graph-leaf' }
  | { type: 'ply'; maxPly: number }
  | { type: 'position'; positionIds: string[] }
  | { type: 'handoff'; planId: string }
```

---

# 23. Handoff para o meio-jogo

Ao alcançar boundary:

não apenas mostrar:

```text
“linha concluída.”
```

Mostrar:

```text
“Você chegou ao tipo de posição que esta abertura procura.”
```

E responder:

```text
qual seu plano?
qual ruptura?
qual peça ruim?
qual troca favorece?
```

Isso impede o efeito:

```text
“sei 8 lances e depois não sei o que fazer.”
```

---

# 24. Etapa 5 — Planos

Essa etapa precisa ser fortemente board-based.

Não apenas texto.

---

## 24.1 PlanLibrary

Cada plano:

```text
mini-board
nome
condição
objetivo
```

Exemplo:

```text
Ruptura d4
Ativar torre na coluna e
Transferir cavalo para d5
Trocar o bispo ruim
```

---

## 24.2 Estudo de plano

Board grande.

Texto:

```text
Quando usar?
Por que funciona?
O que precisa estar preparado?
O que o adversário tenta impedir?
```

---

## 24.3 Microdecisão

Quando possível:

```text
“Qual lance começa esse plano?”
```

Usuário joga no board.

---

# 25. Táticas típicas

Não criar obrigatoriamente uma nona etapa.

Associar motivos táticos a:

```text
Variation
Plan
Decision
```

Exemplo:

```text
branch Two Knights
→ motif fork
→ motif sacrifice on f7
```

Se a posição tiver uma tática típica:

incluir microdesafio.

---

# 26. Modelo de partida

Também não precisa virar etapa obrigatória.

Adicionar como:

```text
material de transferência
```

dentro de Planos ou Referência.

---

## 26.1 Model Game Slice

Não obrigar assistir uma partida inteira de 50 lances.

Destacar:

```text
saída da abertura
→ plano
→ 5–12 lances relevantes
```

Com board.

---

# 27. Etapa 6 — Dois lados

O sistema já possui perspectiva reversa.

Tornar isso mais útil.

---

## 27.1 Problema atual potencial

Um único target:

```text
“perspectiva reversa”
```

pode ser amplo demais.

---

## 27.2 Cobertura em matriz

Para core branches:

```text
branch × role
```

Exemplo:

| Branch | lado do repertório | lado adversário |
|---|---:|---:|
| Mainline | obrigatório | obrigatório |
| Two Knights | obrigatório | obrigatório/recomendado |
| Giuoco | obrigatório | recomendado |
| Optional X | opcional | opcional |

---

## 27.3 Não dobrar o curso

Reverse-side não exige repetir todos os comentários.

Foco:

```text
“o que o adversário está tentando fazer contra você?”
```

---

# 28. Etapa 7 — Prática guiada

Hoje ela joga a mainline.

VNext deve misturar:

```text
mainline
+
core branches
```

---

# 29. Guided Practice Selector

Criar seleção adaptativa.

Score ilustrativo:

```text
0.30 * weakDecision
+ 0.20 * uncoveredBranch
+ 0.20 * recentError
+ 0.15 * dueSoon
+ 0.10 * corePriority
+ 0.05 * roleBalance
- recentExposurePenalty
```

São heurísticas.

Centralizar em configuração.

---

## 29.1 Prática com ajuda decrescente

Primeira ocorrência:

```text
goal visible
hint available
```

Depois:

```text
goal visible
no automatic hint
```

Depois:

```text
board only
```

---

# 30. Erro na prática guiada

Separar tipos.

```text
ILLEGAL
WRONG_REPERTOIRE_MOVE
VALID_TRANSPOSITION
PLAYABLE_OUTSIDE_REPERTOIRE
```

---

## 30.1 Illegal

```text
snapback
```

Não erro pedagógico.

---

## 30.2 Wrong repertoire

Exemplo:

```text
“Esta não é a resposta estudada para este branch.”
```

Mostrar:

```text
objetivo
explicação
hint
```

---

## 30.3 Valid transposition

Aceitar.

---

## 30.4 Playable outside repertoire

Não chamar:

```text
blunder.
```

Mostrar:

```text
FORA DO REPERTÓRIO

Este lance pode ser jogável,
mas não é a resposta que este curso está consolidando.
```

Na prática guiada:

pode permitir:

```text
ver por que
recomeçar
reaprender branch.
```

---

# 31. Etapa 8 — Treino final

Essa é a prova de recuperação.

Sem:

```text
best move
arrows
opening explorer %
hint automático
engine bar
```

---

# 32. Training Round

```ts
interface OpeningTrainingRound {
  id: string

  openingId: string
  branchTargetIds: string[]

  startPositionId: string

  userSide: 'white' | 'black'

  targetBoundary: OpeningBoundary

  status:
    | 'active'
    | 'success'
    | 'failed'

  failureReason?:
    | 'out-of-repertoire'
    | 'objective-error'

  playedMoves: string[]
}
```

---

# 33. Dois tipos de round

## 33.1 Context round

Começa no início da abertura.

Bom para:

```text
reconstruir contexto.
```

---

## 33.2 Branch round

Começa:

```text
1–2 decisões antes de um ponto fraco.
```

Bom para:

```text
prática eficiente.
```

---

## 33.3 Misturar ambos

Não treinar sempre da posição inicial.

Não treinar sempre de FEN isolada.

---

# 34. Seleção do computador

Nunca usar Stockfish livre para “inventar” a abertura durante treino de repertório.

Usar:

```text
OpeningGraph
```

---

## 34.1 Seleção de branch

Score ilustrativo:

```text
0.30 * userWeakness
+ 0.20 * notYetCovered
+ 0.20 * realGameRelevance
+ 0.15 * corePriority
+ 0.10 * dueState
+ 0.05 * variety
- repetitionPenalty
```

---

# 35. Importância das partidas reais

Adicionar ao score:

```text
realGameRelevance
```

Se usuário enfrentou:

```text
...Cf6
```

três vezes recentemente e errou:

essa branch deve subir.

---

# 36. Integração “Das suas partidas”

Na página da abertura:

criar seção secundária:

```text
Das suas partidas
```

Exemplos:

```text
2 partidas saíram do repertório nesta posição.

[mini-board]

Você jogou:
5.Cc3

Seu repertório:
5.d4

[Estudar este ponto]
```

---

## 36.1 Não exigir backend novo

Os jogos já são importados.

O planner já lê desvios.

Reutilizar essa evidência.

---

# 37. Primeiro desvio

Para cada partida vinculável a um curso:

detectar:

```text
último node conhecido
primeiro move fora do repertoire
quem desviou
```

---

# 38. Classificar desvio

```text
PLAYER_DEVIATION
OPPONENT_NOVELTY
KNOWN_TRANSPOSITION
OUTSIDE_COURSE
```

---

## 38.1 Player deviation

CTA:

```text
Reaprender esta posição
```

---

## 38.2 Opponent novelty

Se já existe branch equivalente:

```text
Treinar resposta
```

Se não existe:

```text
Analisar
```

Não inventar automaticamente um ramo no repertório.

---

# 39. Mastery: separar conclusão e domínio

Concluir a jornada:

```text
✓ estudada
```

não significa:

```text
forte para sempre.
```

---

# 40. OpeningDecisionState

```ts
interface OpeningDecisionState {
  decisionId: string

  exposures: number
  attempts: number
  firstTryCorrect: number

  hintsUsed: number

  lastSeenAt: string | null
  lastSuccessAt: string | null

  realGameSuccesses: number
  realGameFailures: number
}
```

---

# 41. OpeningBranchState

```ts
interface OpeningBranchState {
  branchId: string

  learned: boolean

  guidedCompleted: boolean
  independentCompleted: boolean

  primaryRoleCompleted: boolean
  reverseRoleCompleted: boolean

  lastPracticedAt: string | null
}
```

---

# 42. UI de domínio

Não mostrar porcentagem falsa como:

```text
82% dominado
```

Preferir:

```text
Aprendendo
Consolidando
Forte
Revisar
```

---

# 43. Review: preservar FSRS, melhorar a apresentação

Hoje existem cards de nó de repertório.

Não remover FSRS.

Melhorar como o card é apresentado.

---

# 44. Context reconstruction

Se node:

```text
posição X
```

está vencido,

não necessariamente jogar o usuário direto em X.

Montar:

```text
posição X - 1 ou X - 2 decisões
```

para reconstruir contexto.

Depois cobrar X.

---

# 45. ReviewItem de abertura

Externamente:

```text
Abertura Italiana — Two Knights
```

conta como uma unidade de revisão.

Internamente:

vários node cards podem ser atualizados.

Isso evita:

```text
1/20 por ply.
```

---

# 46. Reaprender branch

Se usuário falha review:

CTA:

```text
Reaprender esta variação
```

Deep-link para:

```text
Opening
→ Variations
→ branchId
```

Não para biblioteca genérica.

---

# 47. Sparring

Hoje só fica disponível depois de concluir.

VNext:

pode manter como conteúdo pós-conclusão recomendado.

Ou, se o contrato geral exige livre exploração:

permitir abrir cedo, mas com:

```text
“Recomendamos concluir o treino antes.”
```

Importante:

Sparring não deve marcar:

```text
journey completed.
```

---

# 48. Bot de sparring

Pode continuar restrito ao repertório.

Melhorar seleção:

```text
mais ampla
menos previsível
sem sacrificar qualidade
```

---

# 49. “Linha resistente”

Inspirado no conceito de resistant moves:

identificar decisões que continuam falhando apesar de revisões.

Critério configurável.

Exemplo:

```text
>= 3 erros recentes
e
>= 2 sessões distintas
```

Status:

```text
Ponto resistente
```

---

# 50. O que fazer com ponto resistente

Não apenas repetir mais.

Acionar:

```text
Relearn
```

com:

```text
explicação
worked example
branch context
guided attempt
```

---

# 51. Não treinar só memória de lance

Para cada decisão crítica, pelo menos um destes elementos deve estar ligado:

```text
concept
plan
structure
opponentIntent
```

Isso faz o sistema ensinar:

```text
por que
```

junto de:

```text
o que.
```

---

# 52. Transposições como ferramenta pedagógica

Não apenas aceitar tecnicamente.

Ensinar.

Exemplo:

```text
“Você chegou à mesma posição
por uma ordem diferente.”
```

Isso ajuda o usuário a abandonar memorização rígida de sequência.

---

# 53. Transposition Challenge

Dentro de Guided Practice:

ocasionalmente usar:

```text
move order alternativo
```

que chega ao mesmo node.

Usuário deve reconhecer:

```text
posição conhecida.
```

---

# 54. Variação de contexto

Pesquisa sobre variabilidade de exemplos sugere benefício de treinar conceito em mais de uma apresentação.

Aplicação:

não mostrar sempre:

```text
mesma FEN
```

para plano/conceito quando houver posições equivalentes curadas.

---

# 55. Não depender do banco de puzzles

O sistema atualmente tem apenas 11 puzzles runtime.

Logo:

não fazer do VNext uma arquitetura dependente de:

```text
“pegue um puzzle correspondente automaticamente.”
```

Para abertura:

usar:

```text
posições autoradas
grafo
partidas do usuário
```

até o pipeline de puzzles existir.

---

# 56. Biblioteca de Aberturas

A rota de listagem dos seis cursos também deve melhorar.

Não precisa busca complexa com apenas seis.

---

## 56.1 Card

Mostrar:

```text
mini-board característico
nome
lado/repertório
descrição curta
progresso
estado
última atividade
CTA
```

---

## 56.2 Exemplo

```text
[mini board]

Abertura Italiana

Brancas
Jogo aberto · desenvolvimento rápido

Consolidando
5 de 8 etapas

[Continuar]
```

---

# 57. Mini-board correto

Não usar simplesmente a posição inicial.

Usar:

```text
posição identificável da abertura.
```

---

# 58. Não mostrar estatísticas inventadas

Sem fonte confiável:

não mostrar:

```text
“jogada em 34%”
```

---

# 59. Acesso livre + caminho recomendado

Cards podem abrir:

```text
course page.
```

Curso mostra:

```text
Continuar estudo
```

e:

```text
Mapa do estudo.
```

---

# 60. Estado global do curso

Usar:

```text
Não iniciado
Em aprendizado
Consolidando
Concluído
Revisar
Reaprender recomendado
```

---

# 61. Conteúdo PT/EN

O domínio permanece canônico.

Textos:

```text
localized.
```

---

## 61.1 Nomes

Usar nome estabelecido:

PT:
```text
Abertura Italiana
```

EN:
```text
Italian Game
```

---

# 62. Authoring schema VNext

Separar:

```text
chess data
```

de:

```text
instructional text.
```

---

## 62.1 Course

```ts
interface OpeningCourseVNext {
  id: string

  primarySide: 'white' | 'black'

  entryPositionId: string

  concepts: OpeningConcept[]
  branches: OpeningBranch[]
  plans: OpeningPlan[]

  mainBranchId: string

  journey: OpeningJourneyDefinition

  completionPolicy: OpeningCompletionPolicy
}
```

---

# 63. Content gates

Criar novos portões.

---

## 63.1 Branch legality gate

Toda sequência:

```text
legal.
```

---

## 63.2 Reachability gate

Todo core branch:

```text
atingível no graph.
```

---

## 63.3 Transposition gate

Nodes equivalentes:

```text
mesma identidade.
```

---

## 63.4 Required explanation gate

Cada core branch precisa ter:

```text
opponent intent
student goal
at least one explanation
```

---

## 63.5 Boundary gate

Cada core branch precisa terminar em:

```text
boundary válida.
```

---

## 63.6 Coverage gate

Treino obrigatório deriva:

```text
core branches
+
role policy
```

Nunca lista manual duplicada.

---

## 63.7 No dead stage

Manter o portão atual:

nenhuma etapa com regra de itens sem itens.

---

# 64. Substituir o portão ADR-0018 antigo

Hoje existe um gate que afirma:

```text
respostasDoAdversario
+
variacoesDoAluno
=
total
```

Ao fundir essas listas:

esse gate deve desaparecer.

Substituir por:

```text
allBranchIds are unique
all branches appear exactly once in VariationLibrary
all core branches have required study data
```

---

# 65. Novo ADR

Criar ADR:

```text
ADR-00XX — Opening branches are the pedagogical unit
```

Registrar:

- por que “Respostas” deixou de ser etapa;
- por que actor continua metadata;
- por que UI usa branch;
- como cobertura deriva das branches.

---

# 66. Migração da jornada 9 → 8 etapas

Muito importante para usuários existentes.

Não apagar progresso.

---

# 67. Mapping

```text
old visão
→ new visão

old ideias
→ new ideias

old linha
→ new linha

old respostas + old variações
→ new variações

old planos
→ new planos

old dois lados
→ new dois lados

old guiada
→ new guiada

old treino
→ new treino
```

---

# 68. Estado da nova Variações

Se:

```text
responses completed
AND
variations completed
```

então:

```text
new variations = completed.
```

---

## 68.1 Apenas uma concluída

Então:

```text
new variations = in_progress.
```

Preservar subcoverage.

---

# 69. Current stage migration

Se usuário estava:

```text
responses
```

ou:

```text
variations
```

retomar:

```text
new variations
```

no primeiro branch pendente correspondente.

---

# 70. StudyJourney version

Bump:

```text
openingJourneyVersion
```

ou versionamento equivalente.

Migração determinística.

---

# 71. Persistência

Stores atuais:

```text
openingProgress
studyJourneys
reviewCards
```

devem continuar sendo a base.

Se o schema precisar de novos campos:

criar migração IndexedDB.

Não escrever blobs paralelos ad hoc em localStorage.

---

# 72. Local-first

Nenhuma função principal desse sistema pode exigir login.

---

# 73. Adaptive policy pura

Seleção de branch deve ficar em:

```text
src/domain
```

como função pura.

Entradas:

```text
now
seed
progress
errors
game deviations
branch metadata
```

Saída:

```text
branch / round plan
```

---

# 74. Determinismo

Mesmo:

```text
contexto
seed
```

deve gerar:

```text
mesma sessão.
```

Preservar filosofia do Daily Plan.

---

# 75. Analytics / telemetria

Hoje os pesos não foram calibrados com dados de alunos.

Portanto registrar eventos que permitam calibrar.

---

## 75.1 Por decision

```text
firstTryCorrect
attempts
hints
time
relearn
```

---

## 75.2 Por branch

```text
guidedSuccess
independentSuccess
reverseSuccess
reviewFailure
realGameDeviation
```

---

## 75.3 Por curso

```text
drop-off stage
time per stage
revisit rate
sparring usage
```

---

# 76. Métricas de qualidade

Não usar:

```text
“usuário clicou 50 vezes”
```

como sucesso.

Preferir:

```text
first-try recall
retention after delay
branch coverage
reduction in real-game deviations
transfer to unseen move orders
```

---

# 77. Experimentos futuros

Somente depois de baseline.

Exemplos:

```text
breadth-first vs mainline-first
```

```text
full-start rounds vs branch-context rounds
```

```text
self-explanation prompt on/off
```

---

# 78. Não otimizar prematuramente

Não criar A/B framework complexo agora.

Primeiro:

```text
event schema estável.
```

---

# 79. Feedback de erro VNext

Error panel precisa responder:

```text
O que aconteceu?
Por que não pertence ao repertório?
O que você deveria observar?
O que fazer agora?
```

---

# 80. Fora do repertório

Visual próprio.

Exemplo:

```text
FORA DO REPERTÓRIO

Seu lance 5.Cc3 é legal,
mas este curso está consolidando 5.d4 nesta posição.

Por quê?
5.d4 desafia imediatamente o centro enquanto seu desenvolvimento permite abrir a posição.
```

---

## 80.1 Não dizer

```text
“lance errado”
```

como única mensagem.

---

# 81. Engine pós-erro

Opcionalmente:

depois do round,

pode mostrar:

```text
“Seu lance também é jogável objetivamente.”
```

se houver análise confiável.

Mas:

isso não muda o resultado de:

```text
repertoire drill.
```

---

# 82. Não carregar engine para cada decisão

Só quando:

```text
precisa classificar alternativa não autorada
```

ou:

```text
modo análise.
```

Graph continua primeira autoridade do repertório.

---

# 83. Performance

Carregar apenas:

```text
course atual
graph atual
localized content atual
```

Não carregar seis grafos + duas línguas + engine simultaneamente.

---

# 84. Board state

Continuar expondo:

```text
data-interactive
data-fen
```

para os testes.

Adicionar, se útil:

```text
data-opening-id
data-branch-id
data-stage-id
```

somente se isso melhorar testes e não acoplar UI.

---

# 85. Acessibilidade

Preservar:

```text
drag
+
click-two-squares.
```

Não voltar a notação por botão como “fallback”.

---

# 86. Mobile

No mobile:

```text
board
↓
instruction
```

StudyStageHeader compacto.

Mapa do estudo em:

```text
drawer.
```

VariationLibrary:

```text
1 coluna.
```

---

# 87. Desktop

Board deve permanecer visualmente dominante.

Painel direito:

```text
24rem atual
```

pode evoluir para algo responsivo se necessário.

Mas alterar no componente compartilhado.

---

# 88. Não poluir com métricas

Durante estudo:

não mostrar:

```text
12 números
3 gráficos
rating
engine bar
```

Contexto pedagógico primeiro.

---

# 89. Reference mode

Depois de estudar:

permitir consultar rapidamente:

```text
linha
branches
plans
structures
common mistakes
```

sem mexer no estado de mastery.

---

# 90. Study mode vs Reference mode

Não criar duas rotas necessariamente.

Pode ser:

```text
Study
```

com:

```text
Mapa do estudo
```

e um:

```text
modo Referência
```

secundário.

---

# 91. User journey completo

Exemplo:

```text
Usuário abre Italiana

Visão 1/8
→ entende objetivo

Ideias 2/8
→ observa padrões

Linha 3/8
→ worked example
→ completa decisões

Variações 4/8
→ Two Knights
→ Giuoco
→ branch do aluno

Planos 5/8
→ d4
→ atividade das peças
→ posição típica

Dois lados 6/8
→ joga brancas
→ joga pretas

Guiada 7/8
→ branches misturadas
→ hints decrescentes

Treino 8/8
→ rounds sem ajuda
→ transposições
→ ambos lados
→ coverage

dias depois
→ FSRS

partida real
→ desvio detectado
→ deep-link para branch

reaprende
→ revisão futura.
```

---

# 92. Prioridade de implementação

Não implementar tudo simultaneamente.

---

## Fase 0 — congelar baseline

Antes de mudar:

rodar:

```text
pnpm check
pnpm test:e2e
```

Registrar screenshots das seis aberturas.

---

## Fase 1 — novo modelo de branch

Objetivo:

```text
unificar Respostas + Variações no domínio de apresentação.
```

Trabalho:

- `OpeningBranch`;
- actor metadata;
- importance;
- boundaries;
- migration adapters.

Ainda sem redesign grande.

---

## Fase 2 — gates do conteúdo

Implementar:

- legalidade;
- reachability;
- branch uniqueness;
- core metadata;
- boundaries;
- coverage.

Substituir gate ADR-0018.

---

## Fase 3 — jornada 9 → 8

Atualizar:

```text
OpeningStudyJourneyBuilder
```

ou equivalente real.

Migrar progresso.

Testar usuários:

- novos;
- etapa 3;
- etapa 4;
- etapa 5;
- etapa 9 concluída.

---

## Fase 4 — StageHeader + StudyMap

Aplicar contrato:

```text
Variações
4/8
```

Mapa separado.

Não mexer na `MesaDeEstudo`.

---

## Fase 5 — Mainline VNext

Adicionar:

```text
worked example
→ completion
→ fading.
```

---

## Fase 6 — VariationLibrary

Criar:

- mini boards;
- cards;
- status;
- core/secondary/optional;
- branch deep-link.

---

## Fase 7 — VariationStudy

Board + right panel.

Adicionar:

- opponentIntent;
- studentGoal;
- hint ladder;
- guided move.

---

## Fase 8 — Plans VNext

Transformar prosa em:

```text
typical position
+
explanation
+
microdecision.
```

---

## Fase 9 — Both Sides VNext

Coverage matrix.

Sem duplicar conteúdo textual.

---

## Fase 10 — Guided Practice adaptive

Misturar core branches.

Hints decrescentes.

Aceitar transposições.

---

## Fase 11 — Final Training VNext

Adicionar:

- context rounds;
- branch rounds;
- adaptive branch selection;
- reverse role;
- dynamic boundary;
- distinct out-of-repertoire.

---

## Fase 12 — Review integration

Agrupar node cards em:

```text
OpeningReviewItem
```

Context reconstruction.

Deep-link Reaprender.

---

## Fase 13 — Real game loop

Criar:

```text
Das suas partidas
```

e branch relevance.

---

## Fase 14 — Library polish

Mini boards e progresso.

---

## Fase 15 — Sparring

Adaptar seleção e metadata.

---

## Fase 16 — analytics

Instrumentar decisões e branches.

---

## Fase 17 — QA e cleanup

Remover:

- stage Respostas;
- componentes redundantes;
- CSS morto relacionado;
- nomes antigos;
- frequency ambígua;
- gates antigos.

---

# 93. Testes unitários obrigatórios

## Graph

```text
transposition accepted
branch reachable
duplicate branch rejected
illegal branch rejected
```

---

## Journey

```text
8 stages
every stage openable
recommendation sequence correct
migration 9→8
```

---

## Mainline

```text
worked example
guided completion
fading
resume
```

---

## Variation

```text
branch progress
accepted move
wrong repertoire move
transposition
hint levels
```

---

## Plans

```text
position linked to plan
microdecision
alternative valid move
```

---

## Training selector

```text
weak branch priority
coverage priority
game deviation priority
anti-repetition
deterministic seed
```

---

## Coverage

```text
all core branches
role requirements
optional branch not blocking
```

---

# 94. E2E obrigatórios

Criar/atualizar cenários:

```text
new user studies Italian Game
```

```text
opens Variation directly before Mainline
```

```text
mainline worked example → independent move
```

```text
studies Two Knights
```

```text
transposition accepted
```

```text
out-of-repertoire not shown as generic blunder
```

```text
guided practice mixes branches
```

```text
final training reverse role
```

```text
reload preserves branch/internal state
```

```text
review deep-links to forgotten branch
```

```text
real-game deviation opens exact study target
```

---

# 95. Visual QA

Viewports:

```text
360×800
768×1024
1280×800
1440×900
```

---

## Fail if

- text under board on desktop with unused right space;
- board becomes the narrow column;
- stage names become horizontal tab clutter;
- Variation card has no board;
- feedback overlays board;
- long PT/EN copy clips;
- `OUT_OF_REPERTOIRE` looks like success;
- failed round shows completed state.

---

# 96. Critério de aceite pedagógico

Uma abertura está “bem implementada” quando um aluno consegue:

```text
1. reconhecer a posição;
2. explicar o objetivo geral;
3. jogar a mainline;
4. reagir às core variations;
5. dizer o que o adversário quer;
6. chegar ao meio-jogo com um plano;
7. jogar a abertura pelos dois lados;
8. recuperar decisões sem ajuda;
9. reconhecer transposições;
10. corrigir o próprio desvio após uma partida real.
```

Não basta:

```text
reproduzir 12 lances.
```

---

# 97. Critério de aceite de produto

A área deve responder quatro perguntas diferentes:

```text
O que devo estudar?
→ Continue Study

O que esta abertura significa?
→ Visão / Ideias / Planos

O que faço contra esta resposta?
→ VariationLibrary

Será que realmente lembro?
→ Guided / Training / Review
```

---

# 98. O que NÃO fazer

Não:

- adicionar dezenas de aberturas antes de melhorar as seis;
- depender do Lichess Explorer em runtime;
- usar Stockfish como professor de repertório;
- transformar `frequency` atual em popularidade;
- usar notação como resposta;
- criar grade diferente da `MesaDeEstudo`;
- bloquear conteúdo que já existe;
- contar cada ply como unidade de progresso;
- tratar um move jogável fora do repertório como blunder automaticamente;
- ensinar 20 lances sem explicar a posição resultante;
- criar uma árvore visual gigante como UI principal;
- duplicar scheduler em vez de usar FSRS;
- criar números de mastery com precisão fictícia.

---

# 99. O que adiar

Prioridade baixa para o primeiro VNext:

```text
mais cursos
repertório totalmente customizado pelo usuário
sunburst complexo
live explorer
cloud analysis em massa
social/community repertoire
```

Primeiro melhorar:

```text
aquisição
compreensão
recuperação
transferência.
```

---

# 100. Fontes de pesquisa

## Expertise e reconhecimento em xadrez

Fernand Gobet & Herbert A. Simon.  
**Templates in Chess Memory: A Mechanism for Recalling Several Boards.** Cognitive Psychology, 1996.  
https://doi.org/10.1006/cogp.1996.0011

Fernand Gobet & Herbert A. Simon.  
**Recall of random and distorted chess positions: implications for the theory of expertise.** Memory & Cognition, 1996.  
https://doi.org/10.3758/BF03200937

Fernand Gobet & Herbert A. Simon.  
**The Roles of Recognition Processes and Look-Ahead Search in Time-Constrained Expert Problem Solving.** Psychological Science, 1996.  
https://doi.org/10.1111/j.1467-9280.1996.tb00666.x

Neil Charness et al.  
**The role of deliberate practice in chess expertise.** Applied Cognitive Psychology, 2005.  
https://doi.org/10.1002/acp.1106

## Retrieval e spacing

Henry L. Roediger III & Jeffrey D. Karpicke.  
**Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention.** Psychological Science, 2006.  
https://doi.org/10.1111/j.1467-9280.2006.01693.x

Nicholas J. Cepeda et al.  
**Distributed practice in verbal recall tasks: A review and quantitative synthesis.** Psychological Bulletin, 2006.  
https://doi.org/10.1037/0033-2909.132.3.354

## Worked examples e fading

Alexander Renkl et al.  
**Learning from Worked-Out Examples: The Effects of Example Variability and Elicited Self-Explanations.** Contemporary Educational Psychology, 1998.  
https://doi.org/10.1006/ceps.1997.0959

Alexander Renkl, Robert Atkinson & Cornelia Große.  
**How Fading Worked Solution Steps Works — A Cognitive Load Perspective.** Instructional Science, 2004.  
https://doi.org/10.1023/B:TRUC.0000021815.74806.F6

## Interleaving

Doug Rohrer & Kelli Taylor.  
**The Shuffling of Mathematics Problems Improves Learning.** Instructional Science, 2007.  
https://doi.org/10.1007/s11251-007-9015-8

## Benchmarks de produto

ChessTempo Manual — Opening Training.  
https://www.chesstempo.com/manual/en/manual.html

ChessTempo — Opening Training.  
https://www.chesstempo.com/opening-training/

Chess.com Help — Practice.  
https://support.chess.com/en/articles/8724749-what-is-practice-on-chess-com

Chess.com Help — Lessons.  
https://support.chess.com/en/articles/8609703-how-do-lessons-work-on-chess-com

Chess.com — Opening Lessons.  
https://www.chess.com/news/view/chesscom-releases-50-opening-lessons

Lichess — Features / opening explorer context.  
https://lichess.org/features

---

# 101. Instrução final para o agente

Implementar o VNext da área de Aberturas partindo do código real existente, não recriando sistemas que já funcionam.

Invariantes:

- preserve `buildOpeningGraph`, position identity and transposition recognition;
- preserve the pure-domain boundary;
- preserve `MesaDeEstudo` as the single board-left / instruction-right desktop composition;
- preserve board-based move input through drag and two-square click;
- preserve content-derived journey requirements and no-dead-end gates;
- preserve FSRS, local-first persistence and real-game deviation evidence;
- reduce the opening journey from 9 stages to 8 by removing the standalone Opponent Responses stage;
- make `OpeningBranch` the visible pedagogical unit while keeping `actor` as domain metadata;
- merge legacy response/variation content into one Variation Library without losing any authored branch;
- replace the old ADR-0018 complement invariant with branch uniqueness, reachability and coverage invariants;
- turn the Main Line from a passive move slideshow into worked-example → completion → faded-guidance learning;
- make every important variation an actual board-based study flow with opponent intent, student goal, progressive hints and a meaningful exit/plan;
- distinguish core, secondary and optional branches so the course does not become infinite;
- use breadth-before-excessive-depth for initial acquisition, while keeping the policy configurable;
- define an opening boundary per branch and hand the student off from “remember the move” to “understand the middlegame plan”;
- make Plans board-based through typical positions and actionable decisions;
- expand both-side practice into branch/role coverage rather than one vague reverse-perspective flag;
- make Guided Practice mix the main line and core branches with diminishing assistance;
- make Final Training interleave context rounds, weak-branch rounds, transpositions and reverse-side rounds without hints;
- select training branches adaptively using weakness, coverage, real-game deviations, review state and anti-repetition;
- keep the repertoire graph—not unconstrained Stockfish—as the authority during opening training;
- accept valid transpositions;
- classify a playable move outside the chosen repertoire as `OUT_OF_REPERTOIRE`, not automatically as a chess blunder;
- separate course completion from long-term mastery;
- keep FSRS at the scheduling layer but present coherent branch-level review items with context reconstruction;
- deep-link review failures to the exact variation that needs relearning;
- add a “Das suas partidas” loop that connects imported-game repertoire deviations back to the correct branch;
- rename the misleading authored `frequency` field so it can never be confused with real-world play frequency;
- do not make the study journey depend on the live Lichess Explorer;
- version and migrate existing 9-stage progress deterministically into the 8-stage model without deleting user history;
- add new content gates for legality, branch reachability, unique coverage, valid boundaries and required instructional metadata;
- instrument decision/branch telemetry before tuning heuristics;
- treat all numeric selector weights as configurable product heuristics until real student data exists;
- keep PT-BR/EN content localized while all chess IDs/FEN/UCI/graph data remain canonical;
- do not consider VNext complete until unit, E2E, visual and migration tests prove the entire loop from study → training → review → real-game deviation → relearning.

The main success criterion is not “the user can reproduce the opening line.”

It is:

> the user recognizes the position, understands what both sides are trying to do, retrieves the repertoire under variation, reaches the middlegame with a plan, and can recover when real games stop following the main line.
