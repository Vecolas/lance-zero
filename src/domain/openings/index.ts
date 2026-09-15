/**
 * Domínio dos cursos de abertura.
 *
 * Decisão carregada por este módulo: uma abertura é um grafo de posições, não
 * uma lista de SAN. O mesmo FEN normalizado recebe o mesmo node, portanto uma
 * transposição compartilha conteúdo e progresso. React, engine e provedores
 * externos ficam fora desta fronteira.
 */
import { applyMove, identidadeDePosicao, START_FEN, type SquareName } from '@/lib/chess'

export type OpeningSide = 'white' | 'black'
export type OpeningStatus =
  'not_started' | 'learning' | 'training' | 'consolidating' | 'active_repertoire'

export type OpeningMoveRole = 'main' | 'variation' | 'alternative' | 'mistake'
export type OpeningMoveClassification =
  'preferred' | 'acceptable' | 'out_of_repertoire' | 'inaccurate' | 'blunder'

export interface BoardArrow {
  from: SquareName
  to: SquareName
}

export interface OpeningAlternative {
  san: string
  uci: string
  label: string
  explanation: string
  acceptable: boolean
}

export interface OpeningMoveLesson {
  ply: number
  uci: string
  san: string
  comment: string
  strategicIdea?: string
  tacticalIdea?: string
  highlights?: SquareName[]
  arrows?: BoardArrow[]
  alternatives?: OpeningAlternative[]
  warning?: string
  resultingPlan?: string
}

export interface OpeningMoveEdge {
  uci: string
  san: string
  nextNodeId: string
  frequency: number
  role: OpeningMoveRole
  explanation?: string
  lesson?: OpeningMoveLesson
}

export interface OpeningNode {
  id: string
  fen: string
  ply: number
  outgoingMoves: OpeningMoveEdge[]
  concepts: string[]
  plans: string[]
  lessonComment?: string
}

export interface OpeningVariation {
  id: string
  name: string
  description: string
  rootNodeId: string
  line: OpeningMoveLesson[]
}

export interface OpeningPlan {
  id: string
  name: string
  positionNodeId: string
  objective: string
  when: string
  risk: string
  arrows?: BoardArrow[]
}

export interface OpeningStructure {
  name: string
  description: string
  pawnBreaks: string[]
  weakSquares: string[]
  openFiles: string[]
}

export interface OpeningMistake {
  id: string
  nodeId: string
  moveSan: string
  explanation: string
  principle: string
}

export interface OpeningDefinition {
  id: string
  slug: string
  name: string
  side: OpeningSide
  ecoCodes: string[]
  description: string
  philosophy: string
  previewFen: string
  rootNodeId: string
  mainLineId: string
  variationIds: string[]
  planIds: string[]
  difficulty: number
  prerequisites: string[]
  tags: string[]
  transitionToMiddlegame: string
  mainline: OpeningMoveLesson[]
  variations: OpeningVariation[]
  plans: OpeningPlan[]
  structures: OpeningStructure[]
  mistakes: OpeningMistake[]
  graph: ReadonlyMap<string, OpeningNode>
  version: number
}

export interface OpeningProgress {
  openingId: string
  status: OpeningStatus
  learnedNodeIds: string[]
  trainedNodeIds: string[]
  weakNodeIds: string[]
  completedActivities: string[]
  lastPracticedAt: string | null
  confidence: number
}

export interface OpeningTrainingNode {
  fen: string
  preferredMoves: string[]
  acceptableMoves: string[]
  opponentResponses: WeightedMove[]
  explanationAfterAttempt: string
}

export interface WeightedMove {
  uci: string
  san: string
  weight: number
  nextNodeId: string
}

export interface OpeningAttemptResult {
  classification: OpeningMoveClassification
  message: string
  nextNodeId: string | null
}

export function emptyOpeningProgress(openingId: string): OpeningProgress {
  return {
    openingId,
    status: 'not_started',
    learnedNodeIds: [],
    trainedNodeIds: [],
    weakNodeIds: [],
    completedActivities: [],
    lastPracticedAt: null,
    confidence: 0,
  }
}

function stableId(fen: string): string {
  return identidadeDePosicao(fen)
}

function mergeUnique(values: string[], additions: readonly string[]): void {
  for (const value of additions) if (!values.includes(value)) values.push(value)
}

/** Monta o grafo e recusa conteúdo ilegal em vez de publicar um falso verde. */
export function buildOpeningGraph(
  lines: readonly { moves: readonly OpeningMoveLesson[]; role: OpeningMoveRole }[],
): { graph: Map<string, OpeningNode>; rootNodeId: string } {
  const graph = new Map<string, OpeningNode>()
  const rootNodeId = stableId(START_FEN)
  graph.set(rootNodeId, {
    id: rootNodeId,
    fen: START_FEN,
    ply: 0,
    outgoingMoves: [],
    concepts: [],
    plans: [],
  })

  for (const line of lines) {
    let fen = START_FEN
    for (const lesson of line.moves) {
      const fromId = stableId(fen)
      const from = graph.get(fromId)
      if (!from) throw new Error(`Node ausente ao construir abertura: ${fromId}`)
      const applied = applyMove(fen, lesson.san)
      if (!applied) throw new Error(`Lance ilegal na abertura: ${lesson.san} em ${fen}`)
      const toId = stableId(applied.fenAfter)
      if (!graph.has(toId)) {
        graph.set(toId, {
          id: toId,
          fen: applied.fenAfter,
          ply: lesson.ply,
          outgoingMoves: [],
          concepts: [],
          plans: [],
          lessonComment: lesson.comment,
        })
      }
      const existing = from.outgoingMoves.find((edge) => edge.uci === applied.move.uci)
      if (existing) {
        existing.frequency += 1
        existing.lesson ??= lesson
      } else {
        from.outgoingMoves.push({
          uci: applied.move.uci,
          san: applied.move.san,
          nextNodeId: toId,
          frequency: 1,
          role: line.role,
          explanation: lesson.comment,
          lesson,
        })
      }
      fen = applied.fenAfter
    }
  }
  return { graph, rootNodeId }
}

export function buildOpeningDefinition(
  definition: Omit<
    OpeningDefinition,
    'graph' | 'rootNodeId' | 'previewFen' | 'mainLineId' | 'variationIds' | 'planIds'
  >,
): OpeningDefinition {
  const lines = [
    { moves: definition.mainline, role: 'main' as const },
    ...definition.variations.map((variation) => ({
      moves: variation.line,
      role: 'variation' as const,
    })),
  ]
  const { graph, rootNodeId } = buildOpeningGraph(lines)
  const mainLineId = `${definition.id}:main`
  const variations = definition.variations.map((variation) => ({
    ...variation,
    rootNodeId,
  }))
  const plans = definition.plans.map((plan) => {
    const node = graph.get(plan.positionNodeId) ?? graph.get(rootNodeId)
    return { ...plan, positionNodeId: node?.id ?? rootNodeId }
  })
  return {
    ...definition,
    rootNodeId,
    previewFen: graph.get(rootNodeId)?.fen ?? START_FEN,
    mainLineId,
    variationIds: variations.map((variation) => variation.id),
    planIds: plans.map((plan) => plan.id),
    variations,
    plans,
    graph,
  }
}

export function trainingNode(
  opening: OpeningDefinition,
  nodeId: string,
): OpeningTrainingNode | null {
  const node = opening.graph.get(nodeId)
  if (!node) return null
  const preferred = node.outgoingMoves
    .filter((edge) => edge.role === 'main')
    .map((edge) => edge.uci)
  const acceptable = node.outgoingMoves
    .filter(
      (edge) => edge.role === 'main' || edge.role === 'variation' || edge.role === 'alternative',
    )
    .map((edge) => edge.uci)
  return {
    fen: node.fen,
    preferredMoves: preferred,
    acceptableMoves: acceptable,
    opponentResponses: node.outgoingMoves.map((edge) => ({
      uci: edge.uci,
      san: edge.san,
      weight: Math.max(1, edge.frequency),
      nextNodeId: edge.nextNodeId,
    })),
    explanationAfterAttempt:
      node.outgoingMoves.find((edge) => edge.role === 'main')?.explanation ??
      'Agora compare a posição com os planos estudados antes de escolher o próximo lance.',
  }
}

export function chooseOpponentResponse(
  node: OpeningTrainingNode,
  random = Math.random,
): WeightedMove | null {
  const total = node.opponentResponses.reduce((sum, move) => sum + Math.max(0, move.weight), 0)
  if (total <= 0) return null
  let cursor = random() * total
  for (const move of node.opponentResponses) {
    cursor -= Math.max(0, move.weight)
    if (cursor <= 0) return move
  }
  return node.opponentResponses[node.opponentResponses.length - 1] ?? null
}

export function classifyOpeningAttempt(
  opening: OpeningDefinition,
  nodeId: string,
  uci: string,
): OpeningAttemptResult {
  const node = opening.graph.get(nodeId)
  if (!node)
    return {
      classification: 'blunder',
      message: 'Esta posição não pertence ao curso.',
      nextNodeId: null,
    }
  const edge = node.outgoingMoves.find((candidate) => candidate.uci === uci)
  if (!edge) {
    return {
      classification: 'out_of_repertoire',
      message: 'Esse lance pode ser jogável, mas sai do repertório que estamos treinando.',
      nextNodeId: null,
    }
  }
  if (edge.role === 'main') {
    return {
      classification: 'preferred',
      message: edge.explanation ?? 'Lance do repertório.',
      nextNodeId: edge.nextNodeId,
    }
  }
  if (edge.role === 'variation' || edge.role === 'alternative') {
    return {
      classification: 'acceptable',
      message: 'Esse lance é bom e pertence a uma variação estudada.',
      nextNodeId: edge.nextNodeId,
    }
  }
  return {
    classification: 'inaccurate',
    message: edge.explanation ?? 'Esse lance cria uma dificuldade desnecessária.',
    nextNodeId: edge.nextNodeId,
  }
}

export function markOpeningLearned(
  progress: OpeningProgress,
  nodeId: string,
  now: string,
): OpeningProgress {
  const learnedNodeIds = [...progress.learnedNodeIds]
  mergeUnique(learnedNodeIds, [nodeId])
  return { ...progress, status: 'learning', learnedNodeIds, lastPracticedAt: now }
}

export function markOpeningAttempt(
  progress: OpeningProgress,
  nodeId: string,
  classification: OpeningMoveClassification,
  now: string,
): OpeningProgress {
  const trainedNodeIds = [...progress.trainedNodeIds]
  const weakNodeIds = [...progress.weakNodeIds]
  mergeUnique(trainedNodeIds, [nodeId])
  if (classification !== 'preferred') mergeUnique(weakNodeIds, [nodeId])
  const status: OpeningStatus = weakNodeIds.length > 0 ? 'consolidating' : 'training'
  const confidence =
    trainedNodeIds.length === 0 ? 0 : Math.max(0, 1 - weakNodeIds.length / trainedNodeIds.length)
  return { ...progress, status, trainedNodeIds, weakNodeIds, confidence, lastPracticedAt: now }
}

export function completeOpeningActivity(
  progress: OpeningProgress,
  activityId: string,
  now: string,
): OpeningProgress {
  const completedActivities = [...progress.completedActivities]
  mergeUnique(completedActivities, [activityId])
  return { ...progress, completedActivities, lastPracticedAt: now }
}
