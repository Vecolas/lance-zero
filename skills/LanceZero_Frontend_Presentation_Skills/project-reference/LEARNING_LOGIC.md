# LanceZero — Plano Definitivo de Correção da Lógica de Aprendizado

## Objetivo

Este plano substitui a lógica atual em que o LanceZero apresenta uma posição e pergunta “o que fazer neste lance?” antes de ensinar como pensar sobre o problema.

A correção é estrutural. O produto deve deixar de funcionar como:

```text
problema → tentativa → erro → nova tentativa
```

para funcionar como:

```text
entender → observar exemplo → praticar com apoio → resolver sozinho
→ receber feedback explicativo → revisar depois → aplicar em partidas reais
```

A meta é ensinar **processos de decisão enxadrísticos**, não apenas respostas de puzzles.

---

# 1. Diagnóstico do problema atual

Hoje, em partes de `Hoje` e `Treino`, o sistema atua como se o jogador já possuísse conhecimento que nunca foi explicitamente construído.

Fluxo problemático:

```text
usuário abre atividade
↓
posição aparece
↓
“qual é o melhor lance?”
↓
usuário ainda não aprendeu:
- o conceito;
- o padrão;
- quais candidatos procurar;
- como verificar ameaças;
- como calcular a resposta do oponente;
- como validar o próprio lance.
↓
usuário tenta
↓
feedback binário
↓
nova tentativa
```

Esse fluxo mistura **avaliação** com **ensino**.

## Regra fundamental

> O LanceZero nunca deve cobrar como conhecimento adquirido algo que ainda não ensinou.

Exceção: um diagnóstico explicitamente rotulado como diagnóstico. Nesse caso o usuário sabe que não deveria necessariamente conhecer a resposta e o resultado serve apenas para calibrar o sistema.

---

# 2. Nova arquitetura pedagógica

Toda habilidade deve poder atravessar os seguintes estágios:

```text
1. INTRODUÇÃO
2. EXEMPLO RESOLVIDO
3. EXEMPLO PARCIAL
4. PRÁTICA GUIADA
5. PRÁTICA INDEPENDENTE
6. REVISÃO ESPAÇADA
7. TRANSFERÊNCIA PARA PARTIDAS REAIS
```

Esses são estágios pedagógicos, não necessariamente sete páginas diferentes.

A assistência deve diminuir progressivamente:

```text
explicação completa
→ exemplo guiado
→ completion problem
→ dicas opcionais
→ resolução independente
```

Isso evita exigir que um iniciante descubra sozinho o procedimento correto, mas também evita manter ajuda excessiva depois que o conhecimento já foi adquirido.

---

# 3. Quatro modos pedagógicos explícitos

O produto precisa distinguir claramente quatro modos.

## 3.1 Aprender

Objetivo: construir conhecimento novo.

Pode conter:
- explicação;
- destaques no tabuleiro;
- exemplos resolvidos;
- perguntas intermediárias;
- dicas;
- comparação entre casos parecidos.

## 3.2 Praticar

Objetivo: usar conhecimento que já foi apresentado.

Pode conter:
- problemas variados;
- menos orientação;
- hints opcionais;
- feedback após a tentativa.

## 3.3 Revisar

Objetivo: recuperar conhecimento após intervalo.

Regra:

```text
tentativa antes da resposta
```

Aqui a recuperação sem revelação antecipada faz sentido porque o conceito já foi ensinado.

## 3.4 Diagnosticar

Objetivo: descobrir o que o jogador já sabe.

Não deve ser apresentado como aula nem como falha pessoal. Deve dizer claramente algo como:

> “Isto serve para calibrar seu plano. Não há problema se você ainda não souber.”

---

# 4. Estado de conhecimento por habilidade

Criar um modelo explícito por habilidade.

```ts
type LearningStage =
  | 'unseen'
  | 'introduced'
  | 'guided'
  | 'independent'
  | 'review'
  | 'transfer'
```

## Significado

### unseen
Nunca ensinado.

Permitido:
- lesson;
- worked example;
- diagnóstico.

Proibido:
- prática independente obrigatória.

### introduced
Conceito explicado, mas ainda sem autonomia.

### guided
Usuário já praticou com assistência.

### independent
Usuário já conseguiu resolver sem assistência relevante.

### review
Conhecimento entrou em ciclo de revisão espaçada.

### transfer
O sistema já procura evidência em partidas reais de que o conhecimento está sendo aplicado.

## Estado enriquecido

Não usar apenas uma enumeração. Persistir também sinais de aprendizagem.

```ts
interface SkillState {
  skillId: string
  stage: LearningStage

  exposureCount: number

  guidedAttempts: number
  guidedSuccesses: number

  independentAttempts: number
  independentSuccesses: number

  hintUsageRate: number
  recentAccuracy: number
  masteryEstimate: number

  lastTaughtAt: string | null
  lastPracticedAt: string | null

  gameEvidenceCount: number
  recurringGameErrorCount: number

  updatedAt: string
}
```

---

# 5. FSRS não é o modelo de domínio

FSRS deve responder:

```text
quando este item precisa reaparecer?
```

Não deve responder:

```text
qual é o nível geral do jogador nessa habilidade?
```

Separar:

```text
SkillState
ReviewCard/FSRS
PuzzleDifficulty
GameEvidence
```

A revisão espaçada só deve aparecer depois que o conhecimento tiver sido ensinado ou reaprendido.

---

# 6. Nova unidade central: Learning Activity

Todas as atividades de `Hoje` e `Treino` devem obedecer ao mesmo contrato.

```ts
type ActivityKind =
  | 'lesson'
  | 'guided-practice'
  | 'independent-practice'
  | 'review'
  | 'calculation'
  | 'game-review'
  | 'endgame-lesson'
  | 'opening-lesson'
```

```ts
interface ActivityDefinition {
  id: string
  kind: ActivityKind
  title: string
  description: string
  skillIds: string[]
  pedagogicalStage: LearningStage
  estimatedMinutes: number
  contentVersion: number
  completionRule: CompletionRule
}
```

Uma instância diária é separada da definição:

```ts
type ActivityStatus = 'pending' | 'in_progress' | 'completed'

interface DailyActivity {
  id: string
  dateKey: string
  definitionId: string
  status: ActivityStatus
  generatedReason: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  progress: ActivityProgress
}
```

---

# 7. Redesenho definitivo da página Hoje

## Remover o botão global “Começar treino”

A página `Hoje` não deve ser um gateway para uma sessão linear.

Ela passa a ser uma **playlist diária adaptativa de atividades independentes**.

Exemplo:

```text
HOJE

2 de 5 concluídas

✓ Peças indefesas
  Revisão · 6 min

○ Garfo de cavalo
  Aprender · 8 min

○ Cálculo: enxergar respostas
  Prática · 8 min

✓ Revise sua partida
  Análise · 7 min

○ Final de peões
  Aprender · 9 min
```

## Status dos cards

### Pendente

```text
○
```

### Em andamento

```text
◔
```

### Concluído

```text
✓
```

O card concluído permanece visível e recebe a marcação de conclusão.

## Interação

O próprio card é clicável. Não é necessário um botão global “iniciar”.

Se a atividade foi iniciada e interrompida, clicar nela retoma do checkpoint salvo.

---

# 8. Requisito crítico: qualquer ordem

O usuário deve poder executar:

```text
atividade 4 → atividade 1 → atividade 5 → atividade 2 → atividade 3
```

sem quebrar a experiência.

## A regra que torna isso possível

> O Today Planner não pode colocar no mesmo plano atividades que tenham dependência pedagógica rígida umas das outras.

Errado:

```text
Card A: Aprenda cravada
Card B: Resolva cravadas sem dica
```

Se o usuário abrir B primeiro, a lógica quebra.

Correto:

Se a skill está `unseen`, o plano contém somente algo como:

```text
APRENDER — Cravada
```

Essa atividade internamente já possui:

```text
conceito
→ exemplo
→ completion problem
→ prática guiada curta
```

Somente em um planejamento posterior a prática independente pode aparecer.

## Invariante do planner

Para toda atividade selecionada:

```text
todos os pré-requisitos pedagógicos já estavam satisfeitos
ANTES da geração do plano diário
```

Nunca depender da conclusão de outro card do mesmo dia.

---

# 9. O plano diário deve ser persistido e estável

```ts
interface DailyPlan {
  dateKey: string
  activities: DailyActivity[]
  generatedAt: string
  plannerVersion: number
  seed: string
}
```

Após a geração, o plano não deve ser reconstruído silenciosamente a cada conclusão.

Concluir uma atividade não pode:
- embaralhar as demais;
- apagar cards;
- substituir cards automaticamente;
- zerar progresso;
- mudar o plan ID.

O usuário precisa perceber uma lista concreta sendo concluída.

---

# 10. Planner determinístico

Com os mesmos:

```text
estado do usuário
data
seed
configuração
```

o planner deve gerar o mesmo resultado.

Isso permite:
- testes;
- reprodução de bugs;
- auditoria;
- comparação entre versões.

---

# 11. Inputs do Today Planner

Usar:
- revisões FSRS vencidas;
- SkillState;
- erros recentes em partidas;
- posição no currículo;
- histórico recente de treino;
- orçamento de tempo;
- diversidade de atividades;
- dificuldade adequada.

Prioridade conceitual:

```text
1. revisões importantes vencidas
2. erros graves recorrentes em partidas
3. habilidades conhecidas porém fracas
4. próximo conceito curricular
5. cálculo
6. finais
7. análise de partida
```

A regra pedagógica fica acima dessa prioridade:

```text
skill unseen → ensinar antes de cobrar
```

---

# 12. Exemplo de erro real virando ensino

Partida:

```text
jogador perde uma torre porque ela estava indefesa
```

Classificação:

```text
loose_piece
```

Se:

```text
SkillState(loose_piece).stage == unseen
```

não gerar:

```text
“Qual é o melhor lance nesta posição?”
```

Gerar:

```text
APRENDER — Peças indefesas
```

Depois, em outros ciclos:

```text
guided practice
→ independent practice
→ review
→ observar partidas reais
```

---

# 13. Estrutura definitiva de uma lesson

## Etapa 1 — objetivo

Explicar o que será aprendido e por que importa.

Exemplo:

> “Uma peça indefesa pode ser capturada sem que você consiga recuperar material. Vamos aprender a reconhecê-la antes de procurar o melhor lance.”

## Etapa 2 — conceito

Mostrar posição simples e destacar apenas o que importa.

Não começar perguntando um lance.

## Etapa 3 — processo mental

Ensinar uma pergunta reutilizável.

Exemplo:

```text
1. Qual peça está sendo atacada?
2. Se ela for capturada, posso recapturar?
3. Se não posso, ela está indefesa.
```

## Etapa 4 — worked example

O próprio LanceZero resolve passo a passo.

## Etapa 5 — contraste

Mostrar posição parecida em que a conclusão muda.

Isso evita memorização superficial.

## Etapa 6 — completion problem

Dar parte do raciocínio e pedir ao usuário apenas a etapa final.

## Etapa 7 — prática guiada

Perguntas intermediárias antes do lance.

Exemplo:

```text
Qual peça você deve investigar primeiro?
Ela está defendida?
Qual lance explora isso?
```

## Etapa 8 — primeiro problema independente

Somente agora usar algo como:

```text
Qual é a melhor continuação?
```

## Etapa 9 — resumo mental

Exemplo:

```text
ANTES DE JOGAR
□ O que meu adversário ameaça?
□ Alguma peça minha está indefesa?
□ Alguma peça dele está indefesa?
```

## Etapa 10 — revisão futura

Criar review items para reaparecerem com espaçamento.

---

# 14. Guidance fading

A ajuda diminui conforme o domínio aumenta.

```text
Nível 1: setas + destaques + explicação
Nível 2: perguntas orientadoras
Nível 3: hint opcional
Nível 4: posição independente
```

Jogadores avançados não devem ser forçados a assistir explicações básicas que já dominam.

---

# 15. “Já conheço este conceito”

Uma lesson pode oferecer:

```text
Já conheço
```

mas não simplesmente pular tudo.

Fluxo:

```text
Já conheço
→ mastery check curto
```

Se demonstra conhecimento:

```text
stage → independent/review
```

Se não:

```text
recomendar lesson
```

---

# 16. Hint ladder

Dicas devem revelar progressivamente.

## Dica 1 — direção

> “Comece procurando xeques, capturas e ameaças.”

## Dica 2 — área

> “Olhe com atenção para o rei preto.”

## Dica 3 — peça/ideia

> “O cavalo pode atacar duas peças ao mesmo tempo.”

## Dica 4 — candidato

> “Considere Ce5.”

## Solução

Somente depois.

Registrar níveis de ajuda usados:

```text
solved_without_hint
solved_hint_1
solved_hint_2
solved_hint_3
solution_revealed
```

Isso é muito mais informativo que apenas `correct/incorrect`.

---

# 17. Eliminar retry cego

Fluxo proibido:

```text
errou
→ tente novamente
errou
→ tente novamente
errou
→ tente novamente
```

Isso ensina brute force.

## Novo comportamento

Primeiro erro:

```text
feedback curto + hint conceitual
```

Segundo erro:

```text
reduzir o problema + pergunta intermediária
```

Terceiro erro:

```text
mostrar raciocínio + solução
```

Depois:

```text
nova posição equivalente
```

Não pedir o mesmo lance infinitamente.

---

# 18. Feedback explicativo

Nunca limitar a:

```text
❌ Incorreto
```

Estrutura ideal:

```text
1. O que aconteceu?
2. Por que o lance parecia plausível?
3. O que ele deixou passar?
4. Qual pergunta mental teria evitado o erro?
```

Exemplo:

> “Seu lance desenvolve uma peça, mas deixa a torre de a1 sem defesa. Antes de confirmar um lance, faça a verificação final: ‘depois que eu mover, alguma peça ficará pendurada?’”

Resposta correta também deve explicar brevemente o princípio, não apenas mostrar ✓.

---

# 19. Conclusão de atividade ≠ domínio

Esta separação é obrigatória.

`ActivityCompletion` responde:

```text
o usuário terminou a atividade?
```

`SkillState` responde:

```text
o quanto o usuário demonstrou domínio?
```

Exemplo:

```text
5 itens feitos
2 corretos
3 incorretos
```

Resultado:

```text
atividade: ✓ concluída
habilidade: ainda fraca
```

O planner poderá agendar reforço depois.

Nunca exigir que o jogador chute até atingir 80% apenas para poder sair da atividade.

---

# 20. Critérios de conclusão por atividade

## Lesson
Completar etapas centrais da lesson.

Não exigir perfeição.

## Guided practice
Completar os exemplos previstos.

## Independent practice
Responder todos os itens previstos.

Pontuação influencia domínio, não conclusão.

## Review
Realizar os itens previstos para aquela revisão.

## Game review
Examinar momentos críticos e concluir takeaway.

## Calculation
Completar o processo de cálculo definido.

---

# 21. Persistência do ✓

Ao atingir `completed`:

```text
✓
```

fica persistente.

O card não desaparece.

Pode ser reaberto em modo “Rever”, mas continua concluído.

Reload, navegação e troca de dispositivo após sync não podem reverter um card concluído.

---

# 22. Progresso diário

Topo sugerido:

```text
Hoje
3 de 5 concluídas
██████░░░░
~14 min restantes
```

Quando terminar:

```text
✓ Plano de hoje concluído
```

Abaixo podem existir:

```text
Atividades extras
```

mas não uma segunda sequência obrigatória escondida.

---

# 23. Redesenho da aba Treino

Abrir `Treino` não deve abrir automaticamente um problema.

Transformar em hub:

```text
TREINO

Continuar aprendendo
[Peças indefesas]
[Garfo]

Praticar
[Táticas]
[Cálculo]
[Finais]

Revisões
[12 itens vencidos]

Currículo
[Fundamentos]
[Tática]
[Cálculo]
[Finais]
[Aberturas]

Minhas partidas
[Erros transformados em treino]
```

Usar linguagem pedagógica:

```text
Aprender
Praticar
Revisar
Analisar
Calcular
```

Não chamar tudo genericamente de “puzzle”.

---

# 24. Curriculum Graph

Criar grafo de habilidades com pré-requisitos.

Exemplo inicial:

```text
FUNDAMENTOS
├── valor das peças
├── peças atacadas
├── peças defendidas
├── peças indefesas
├── ameaças do adversário
└── segurança do rei

PROCESSO DE PENSAMENTO
├── olhar o último lance
├── CCT: checks/captures/threats
├── candidate moves
├── resposta do adversário
├── blunder check
└── avaliação final

TÁTICA
├── ataque duplo
├── garfo
├── cravada
├── espeto
├── ataque descoberto
├── remoção do defensor
├── sobrecarga
├── desvio
└── padrões de mate

FINAIS
├── rei ativo
├── oposição
├── quadrado do peão
├── peão passado
├── K+Q
├── K+R
└── finais básicos de torre

ABERTURAS
├── desenvolvimento
├── centro
├── segurança do rei
├── tempo
└── erros típicos

CÁLCULO
├── visualizar 1 ply
├── resposta forçada
├── 2 ply
├── candidatos
├── comparar linhas
└── avaliar posição final
```

Pré-requisitos servem principalmente ao planner. Não criar uma interface cheia de cadeados.

---

# 25. Diagnóstico inicial correto

No onboarding:

> “Vamos descobrir o que você já sabe. Não é uma prova e não existe penalidade.”

Testar amostras pequenas de:
- ameaças;
- material;
- tática;
- cálculo;
- finais.

Resultado deve ser mapa de habilidades, não apenas um rating estimado.

Exemplo:

```text
Peças indefesas   forte
Garfo             conhecido
Cravada           intermediário
Cálculo 2 ply     fraco
Oposição          não demonstrado
```

Na dúvida, ensinar/revisar brevemente em vez de presumir domínio.

---

# 26. Game Review → Learning

Um dos diferenciais centrais deve ser:

```text
erro real
→ causa provável
→ habilidade
→ ensino/prática
→ revisão
→ verificar se o erro volta
```

Categorias iniciais úteis:

```text
hung_piece
missed_opponent_threat
missed_capture
missed_check
fork
pin
skewer
back_rank
mate_pattern
defender_removal
candidate_generation
calculation_depth
opening_principle
endgame_principle
```

Stockfish detecta momentos críticos, mas não deve ser tratado como professor por si só.

Se a classificação for incerta, usar categoria genérica e baixa confiança em vez de inventar precisão.

---

# 27. Cálculo precisa ensinar um processo

Atividade de cálculo não deve ser apenas “encontre o melhor lance”.

Exemplo de fluxo:

```text
1. Não mova ainda.
2. Liste 2–3 candidatos.
3. Qual é a melhor resposta do adversário?
4. Continue a linha.
5. Avalie a posição final.
6. Compare com a análise.
```

Guardar os candidatos do usuário ajuda a distinguir:

```text
não considerou o lance correto → problema de geração de candidatos
considerou mas calculou errado → problema de cálculo
```

---

# 28. Finais e aberturas usam a mesma arquitetura

## Finais

```text
princípio → exemplo → completion → guided → independent → review
```

## Aberturas

Para o público inicial, priorizar:
- desenvolvimento;
- centro;
- segurança do rei;
- tempo;
- estruturas e planos;
- erros típicos.

Não começar por memorizar árvores longas de teoria.

---

# 29. Modelo de conteúdo das lessons

Não hard-codar aulas inteiras em JSX.

Usar conteúdo versionado.

```ts
type LessonStep =
  | ExplanationStep
  | BoardExplanationStep
  | WorkedExampleStep
  | CompletionStep
  | GuidedProblemStep
  | IndependentProblemStep
  | SummaryStep
```

Exemplo:

```ts
interface BoardExplanationStep {
  type: 'board-explanation'
  fen: string
  text: string
  highlights?: SquareHighlight[]
  arrows?: BoardArrow[]
}
```

```ts
interface WorkedExampleStep {
  type: 'worked-example'
  fen: string
  reasoning: ReasoningStep[]
  line: UciMove[]
}
```

```ts
interface GuidedProblemStep {
  type: 'guided-problem'
  fen: string
  prompt: string
  hints: Hint[]
  feedback: FeedbackMap
}
```

---

# 30. Validação automática de conteúdo

Toda lesson precisa passar por validador.

Verificar:
- FEN válido;
- lado a mover correto;
- movimentos legais;
- promoção;
- solução legal;
- IDs únicos;
- skill existente;
- pré-requisitos existentes;
- PV coerente quando houver engine evidence.

Conteúdo gerado por IA nunca entra diretamente em produção.

Fluxo:

```text
IA/conteúdo humano
→ schema
→ chess.js
→ engine quando necessário
→ revisão
→ produção
```

---

# 31. Conteúdo inicial prioritário

Antes de aumentar quantidade de puzzles, produzir poucas aulas muito boas.

Primeiro bloco recomendado:

1. peças atacadas;
2. peças defendidas;
3. peças indefesas;
4. ameaças do adversário;
5. CCT;
6. ataque duplo/garfo;
7. cravada;
8. candidate moves;
9. blunder check;
10. oposição/rei ativo.

Isso cria fundação para grande parte dos problemas futuros.

---

# 32. Mastery não pode ser apenas accuracy

Sinais relevantes:
- accuracy independente;
- uso de hints;
- retenção após intervalo;
- dificuldade;
- evidência em partidas reais;
- recorrência do mesmo erro.

UI não precisa mostrar falsa precisão como “73,284% dominado”.

Estados visuais melhores:

```text
Aprendendo
Praticando
Consolidando
Forte
```

---

# 33. Dificuldade adaptativa

Se o usuário precisa de muitas dicas:
- não aumentar dificuldade apenas porque concluiu;
- reduzir complexidade ou aumentar guidance.

Se domina com facilidade:
- diminuir ajuda;
- aumentar variedade/dificuldade;
- avançar mais rápido.

---

# 34. Planejamento diário — hard rules

```text
R1. unseen nunca gera independent-practice obrigatório

R2. nenhuma atividade depende de outra atividade do mesmo DailyPlan

R3. o plano não muda durante o dia

R4. completion != mastery

R5. revisões vencidas têm prioridade adequada

R6. erro de partida só vira prática independente se o conceito já é conhecido

R7. limitar conceitos novos no mesmo dia

R8. evitar repetição excessiva da mesma skill

R9. respeitar time budget

R10. todo card possui motivo explicável
```

---

# 35. Pseudocódigo do planner

```ts
function buildDailyPlan(input: PlannerInput): DailyPlan {
  const candidates = [
    ...dueReviews(input),
    ...mistakeDrivenActivities(input),
    ...weakKnownSkillPractice(input),
    ...newCurriculumLessons(input),
    ...calculationActivities(input),
  ]

  const eligible = candidates.filter(activity =>
    prerequisitesWereAlreadySatisfied(
      activity,
      input.skillStateBeforePlan
    )
  )

  const independent = removeSameDayDependencies(eligible)

  return selectDiverseActivities({
    candidates: independent,
    timeBudget: input.timeBudget,
    seed: input.seed,
  })
}
```

---

# 36. Motivo de cada atividade

Opcionalmente mostrar “Por que isso está aqui?”.

Exemplos:

> “Você perdeu duas peças indefesas nas últimas partidas.”

> “Está na hora de revisar este padrão.”

> “Este é o próximo fundamento do seu currículo.”

Isso aumenta transparência do sistema adaptativo.

---

# 37. Time budget

Configuração sugerida:

```text
15 min
30 min
45 min
60 min
```

O planner adapta número e tamanho dos cards.

Evitar 30 minutos apenas do mesmo tipo de puzzle.

Exemplo de sessão de 30 min:

```text
8 min  aprender
6 min  revisar
8 min  cálculo
8 min  analisar partida
```

---

# 38. Checkpoints e retomada

```ts
interface ActivityProgress {
  stepIndex: number
  completedItemIds: string[]
  attemptIds: string[]
  updatedAt: string
}
```

Persistir a cada etapa relevante.

Sair da atividade não perde estado.

Após concluir:

```text
voltar para Hoje
```

Nenhuma próxima atividade deve abrir automaticamente.

---

# 39. URL própria por atividade

Usar algo como:

```text
/hoje/activity/<dailyActivityId>
```

Vantagens:
- refresh seguro;
- back/forward;
- retomada;
- testes E2E;
- deep linking interno.

---

# 40. Local-first e sync

Lessons, currículo e progresso básico continuam compatíveis com uso local-first.

Quando houver conta, sincronizar.

Para conclusão, usar merge monotônico:

```text
pending + completed → completed
```

Nunca permitir que conflito de sync reverta ✓.

Versionar:

```text
contentVersion
plannerVersion
```

---

# 41. Migração da lógica atual

Não executar um big bang sem diagnóstico do código existente.

## Fase 0 — Auditoria

Mapear:
- página Hoje;
- página Treino;
- puzzle renderer;
- engine provider;
- planner existente;
- FSRS;
- skill model;
- game review;
- IndexedDB/Supabase;
- progresso.

Para cada prompt atual, classificar:

```text
ensino?
prática?
revisão?
diagnóstico?
```

Se não for possível responder, existe dívida de produto.

## Fase 1 — domínio pedagógico

Implementar:

```text
LearningStage
SkillState
ActivityDefinition
DailyActivity
DailyPlan
```

## Fase 2 — curriculum graph

Criar registry de skills e pré-requisitos.

## Fase 3 — lesson engine

Implementar os diferentes tipos de LessonStep.

## Fase 4 — conteúdo inicial

Criar 8–12 lessons realmente boas antes de tentar escalar conteúdo.

## Fase 5 — Today Planner V2

Implementar hard rules e determinismo.

## Fase 6 — nova UI Hoje

Remover botão global “Começar treino”.

Adicionar:
- cards individuais;
- qualquer ordem;
- pending/in-progress/completed;
- ✓ persistente;
- resume;
- progresso diário.

## Fase 7 — Treino Hub

Abrir Treino não abre puzzle automaticamente.

## Fase 8 — feedback + hints

Eliminar retry cego e implementar hint ladder.

## Fase 9 — FSRS correto

Review apenas após aquisição/reaprendizagem.

## Fase 10 — game-to-learning

Erros reais alimentam SkillState e atividades adequadas.

## Fase 11 — mastery adaptativo

Combinar accuracy, hints, retenção e transferência.

## Fase 12 — analytics pedagógico

Instrumentar eventos que medem aprendizado.

## Fase 13 — remover V1

Somente após migração e testes.

---

# 42. Migração de usuários existentes

Não perder progresso.

Se houver forte evidência de domínio prévio, pode mapear para `independent`.

Na dúvida, preferir:

```text
introduced
```

em vez de presumir mastery.

Cards antigos de temas nunca formalmente ensinados podem receber:

```text
needs_instruction = true
```

O planner agenda reaprendizagem antes da próxima revisão independente.

---

# 43. Testes críticos do planner

## Teste 1

```text
skill = unseen
```

Esperado:

```text
lesson
```

Nunca independent-practice.

## Teste 2

Plano contém lesson X e practice X que depende da lesson.

Esperado:

```text
teste falha
```

## Teste 3

Usuário conclui card 4 primeiro.

Esperado:

```text
card 4 = completed
outros permanecem iguais
plan ID permanece igual
```

## Teste 4

Reload.

Esperado:

```text
✓ persiste
```

## Teste 5

Usuário termina atividade com baixo desempenho.

Esperado:

```text
activity = completed
mastery = baixo
reforço futuro possível
```

## Teste 6

Usuário erra várias vezes.

Esperado:

```text
guidance aumenta
não há brute force infinito
```

## Teste 7

Review due, mas `needs_instruction = true`.

Esperado:

```text
relearning/lesson antes de review independente
```

## Teste 8

Mesmos inputs + seed.

Esperado:

```text
mesmo DailyPlan
```

## Teste 9

Nenhum card depende de outro card do mesmo plano.

## Teste 10

Completion e mastery nunca são atualizados como sinônimos.

---

# 44. Testes de conteúdo

Validar automaticamente:
- FEN;
- side-to-move;
- legal moves;
- promotion;
- expected answer;
- lesson IDs;
- skill IDs;
- prerequisite graph sem ciclo inválido.

---

# 45. Acessibilidade

Não depender apenas de setas e cores.

Toda informação importante também deve existir em texto.

Suportar:
- teclado;
- foco visível;
- touch;
- labels;
- navegação por steps;
- modo mobile.

No mobile priorizar:

```text
tabuleiro
prompt
ação
explicação
```

---

# 46. Métricas pedagógicas

Eventos úteis:

```text
lesson_started
lesson_completed
worked_example_viewed
guided_attempt
hint_used
independent_attempt
review_attempt
activity_completed
mistake_recurred_in_game
skill_transfer_observed
```

Não otimizar apenas por:
- cliques;
- tempo preso na tela;
- streak;
- quantidade de puzzles consumidos.

Pergunta central:

> O erro real diminuiu nas partidas?

---

# 47. Definition of Done — lógica de aprendizado

```text
[ ] nenhuma skill unseen gera exercício independente obrigatório
[ ] existem lessons antes da prática independente
[ ] worked examples existem para conceitos novos
[ ] guidance fading funciona
[ ] retries cegos foram removidos
[ ] feedback explica a causa do erro
[ ] completion e mastery são separados
[ ] FSRS só revisa conhecimento adquirido/reaprendido
[ ] game mistakes podem gerar lesson antes de puzzle
```

---

# 48. Definition of Done — Hoje

```text
[ ] botão global “Começar treino” removido
[ ] atividades aparecem individualmente
[ ] qualquer card pode ser feito em qualquer ordem
[ ] nenhum card depende de outro card do mesmo plano
[ ] pending/in_progress/completed persistem
[ ] card concluído recebe ✓
[ ] reload mantém ✓
[ ] completar não regenera o plano
[ ] sair no meio permite retomar
[ ] finalizar não abre automaticamente outra atividade
```

---

# 49. Definition of Done — Treino

```text
[ ] abrir Treino não dispara puzzle
[ ] existe Aprender
[ ] existe Praticar
[ ] existe Revisar
[ ] existe Cálculo
[ ] existe Currículo
[ ] SkillState controla nível de assistência
```

---

# 50. Testes de aceite de produto

## Teste A — conhecimento prévio

Pegue um usuário novo e abra Hoje.

Para cada card, perguntar:

> “O sistema já ensinou a este usuário as ferramentas necessárias para tentar isto de forma racional?”

Se a resposta for não, o planner está errado.

## Teste B — qualquer ordem

Executar:

```text
5 → 2 → 4 → 1 → 3
```

Nada deve quebrar técnica ou pedagogicamente.

## Teste C — erro

Faça o usuário errar.

Se ele só aprender:

```text
“esse lance estava errado”
```

o feedback falhou.

Ele deve sair sabendo:
- o que não percebeu;
- como reconhecer o padrão;
- qual pergunta mental usar da próxima vez.

## Teste D — falhas repetidas

A ajuda deve aumentar; o sistema não deve exigir tentativa cega infinita.

## Teste E — baixo desempenho

Usuário termina atividade com muitos erros.

Resultado correto:

```text
✓ atividade concluída
habilidade: precisa reforço
```

---

# 51. Novo loop definitivo do LanceZero

```text
PARTIDA
   ↓
ERRO
   ↓
DIAGNÓSTICO DA CAUSA
   ↓
─────────────────────────────
A habilidade já foi ensinada?
─────────────────────────────
   ↓ não               ↓ sim
LESSON               PRACTICE
   ↓                    ↓
EXEMPLO               REVIEW
   ↓                    ↓
GUIDED PRACTICE ←───────┘
   ↓
INDEPENDENT PRACTICE
   ↓
SPACED REVIEW
   ↓
NOVA PARTIDA
   ↓
TRANSFERÊNCIA
   ↓
O erro voltou a acontecer?
   ↓
ATUALIZAR MODELO
```

---

# 52. Ordem recomendada de implementação

Se o Claude Code precisar de uma sequência única, usar:

```text
1. LearningStage + SkillState
2. curriculum/prerequisites
3. lesson engine
4. conteúdo inicial real
5. Today Planner V2
6. UI Hoje sem “Começar treino”
7. Treino Hub
8. feedback + hints
9. FSRS correto
10. game-to-learning
11. mastery/analytics
12. migração e remoção da V1
```

Não começar apenas redesenhando os cards. Sem domínio pedagógico, conteúdo e planner corretos, a nova aparência apenas esconderia o problema.

---

# 53. Regras curtas para adicionar ao CLAUDE.md

```text
LEARNING FLOW IS A HARD REQUIREMENT.

IF skill.stage == unseen:
  teach first

IF skill.stage == introduced/guided:
  provide guided practice

IF skill.stage >= independent:
  independent retrieval is allowed

IF review is due:
  test before reveal

IF user repeatedly fails:
  increase guidance; do not brute-force retry

activity completion != skill mastery

Today activities must have no same-day pedagogical dependency

Today has no global Start Training button

Every completed DailyActivity persists with a ✓

Opening Training must not automatically start a puzzle
```

---

# 54. Base pedagógica

O desenho acima é coerente com evidências de que exemplos resolvidos e maior assistência ajudam mais quando há pouco conhecimento prévio, enquanto a assistência deve diminuir conforme a expertise cresce. Também preserva retrieval practice depois da aquisição, em vez de transformar toda primeira exposição em teste.

Referências úteis:

- Charness et al. — The role of deliberate practice in chess expertise  
  https://onlinelibrary.wiley.com/doi/10.1002/acp.1106

- Longitudinal evidence from more than 40,000 chess players — practice type and improvement  
  https://pubmed.ncbi.nlm.nih.gov/42335356/

- Worked example effect / problem solving  
  https://www.sciencedirect.com/science/article/pii/S0747563208002161

- Expertise reversal meta-analysis  
  https://www.sciencedirect.com/science/article/pii/S0959475225000660

- Review on worked/erroneous examples and guidance fading  
  https://link.springer.com/article/10.1007/s10648-025-10071-x

- Chess pattern recognition research  
  https://pubmed.ncbi.nlm.nih.gov/21038986/

---

# Resultado esperado

Após esta refatoração, o LanceZero deixa de ser:

> um conjunto de posições em que o usuário tenta adivinhar o lance e a engine confirma ou rejeita.

E passa a ser:

> um sistema que identifica o que o jogador ainda não entende, ensina como reconhecer o problema, demonstra o raciocínio, reduz progressivamente a ajuda, verifica retenção e finalmente mede se a melhoria aparece nas partidas reais.

Essa deve ser tratada como a arquitetura pedagógica definitiva do produto.
