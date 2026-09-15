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
  /** Branch explicitamente seguro para diagnóstico antes de ser ensinado. */
  discoverySafe?: boolean
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
  /** Posição semântica na linha principal para conteúdo autorado. */
  positionPly?: number
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
  /** Posição semântica na linha principal para conteúdo autorado. */
  positionPly?: number
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
  rootFen: string
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
  lessonPly: number
  lastSection: 'learn' | 'train' | null
}

export interface OpeningTrainingNode {
  fen: string
  preferredMoves: string[]
  acceptableMoves: string[]
  opponentResponses: WeightedMove[]
  explanationAfterAttempt: string
}

export interface OpeningDiagnosticQuestion {
  nodeId: string
  fen: string
  ply: number
  prompt: string
  moves: OpeningMoveEdge[]
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

export interface OpeningValidationIssue {
  nodeId: string
  message: string
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
    lessonPly: 0,
    lastSection: null,
  }
}

function stableId(fen: string): string {
  return identidadeDePosicao(fen)
}

function mergeUnique(values: string[], additions: readonly string[]): void {
  for (const value of additions) if (!values.includes(value)) values.push(value)
}

function normalizeAuthoredLine(moves: readonly OpeningMoveLesson[]): OpeningMoveLesson[] {
  let fen = START_FEN
  return moves.map((lesson) => {
    const before = fen
    const applied = applyMove(before, lesson.san)
    if (!applied) throw new Error(`Lance ilegal na abertura: ${lesson.san} em ${before}`)
    const alternatives = lesson.alternatives?.map((alternative) => {
      const alternativeApplied = applyMove(before, alternative.san)
      if (!alternativeApplied) {
        throw new Error(`Alternativa ilegal na abertura: ${alternative.san} em ${before}`)
      }
      return {
        ...alternative,
        san: alternativeApplied.move.san,
        uci: alternativeApplied.move.uci,
      }
    })
    fen = applied.fenAfter
    return {
      ...lesson,
      san: applied.move.san,
      uci: applied.move.uci,
      alternatives,
    }
  })
}

function variationRootNodeId(
  mainline: readonly OpeningMoveLesson[],
  variation: readonly OpeningMoveLesson[],
  graph: ReadonlyMap<string, OpeningNode>,
): string {
  let fen = START_FEN
  let common = 0
  while (common < mainline.length && common < variation.length) {
    if (mainline[common]?.uci !== variation[common]?.uci) break
    const applied = applyMove(fen, variation[common]?.san ?? '')
    if (!applied) break
    fen = applied.fenAfter
    common += 1
  }
  const node = graph.get(stableId(fen))
  return node?.id ?? stableId(fen)
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
          discoverySafe: line.role === 'variation',
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
    'graph' | 'rootNodeId' | 'previewFen' | 'rootFen' | 'mainLineId' | 'variationIds' | 'planIds'
  >,
): OpeningDefinition {
  // O schema Zod é um portão de autoria/testes e não entra no bundle do aluno:
  // Zod compila algumas regras com Function(), o que gera uma violação CSP
  // report-only em toda página que importa o catálogo. A validação completa
  // acontece em `schema.ts` nos testes/pipeline; aqui validamos o grafo derivado
  // sem carregar esse runtime pesado no navegador.
  const source = definition
  const mainline = normalizeAuthoredLine(source.mainline)
  const variationLines = source.variations.map((variation) => normalizeAuthoredLine(variation.line))
  const lines = [
    { moves: mainline, role: 'main' as const },
    ...variationLines.map((moves) => ({
      moves,
      role: 'variation' as const,
    })),
  ]
  const { graph, rootNodeId } = buildOpeningGraph(lines)
  const mainLineId = `${source.id}:main`
  const variations = source.variations.map((variation, index) => ({
    ...variation,
    rootNodeId: variationRootNodeId(mainline, variationLines[index] ?? [], graph),
    line: variationLines[index] ?? [],
  }))
  const nodeAtMainlinePly = (ply: number | undefined) => {
    if (ply === undefined || ply < 0) return undefined
    let fen = START_FEN
    for (const lesson of mainline.slice(0, ply)) {
      const applied = applyMove(fen, lesson.san)
      if (!applied) return undefined
      fen = applied.fenAfter
    }
    return graph.get(stableId(fen))
  }
  const plans = source.plans.map((plan) => {
    const node =
      nodeAtMainlinePly(plan.positionPly) ?? graph.get(plan.positionNodeId) ?? graph.get(rootNodeId)
    return { ...plan, positionNodeId: node?.id ?? rootNodeId }
  })
  const mistakes = source.mistakes.map((mistake) => {
    const node =
      nodeAtMainlinePly(mistake.positionPly) ?? graph.get(mistake.nodeId) ?? graph.get(rootNodeId)
    return { ...mistake, nodeId: node?.id ?? rootNodeId }
  })
  let previewFen = graph.get(rootNodeId)?.fen ?? START_FEN
  let previewCursor = START_FEN
  for (const lesson of mainline.slice(0, 4)) {
    const applied = applyMove(previewCursor, lesson.san)
    if (!applied) break
    previewCursor = applied.fenAfter
    previewFen = previewCursor
  }
  const opening: OpeningDefinition = {
    ...source,
    mainline,
    rootNodeId,
    rootFen: graph.get(rootNodeId)?.fen ?? START_FEN,
    previewFen,
    mainLineId,
    variationIds: variations.map((variation) => variation.id),
    planIds: plans.map((plan) => plan.id),
    variations,
    plans,
    mistakes,
    graph,
  }
  const issues = validateOpeningDefinition(opening)
  if (issues.length > 0) {
    throw new Error(
      `Abertura inválida: ${issues.map((issue) => `${issue.nodeId}: ${issue.message}`).join('; ')}`,
    )
  }
  return opening
}

/** Portão de publicação: toda edge precisa ser legal, alcançável e apontar para o filho correto. */
export function validateOpeningDefinition(opening: OpeningDefinition): OpeningValidationIssue[] {
  const issues: OpeningValidationIssue[] = []
  const reachable = new Set<string>()
  const pending = [opening.rootNodeId]
  while (pending.length > 0) {
    const nodeId = pending.pop()
    if (!nodeId || reachable.has(nodeId)) continue
    reachable.add(nodeId)
    const node = opening.graph.get(nodeId)
    if (!node) {
      issues.push({ nodeId, message: 'node raiz/filho ausente' })
      continue
    }
    for (const edge of node.outgoingMoves) {
      const child = opening.graph.get(edge.nextNodeId)
      if (!child) {
        issues.push({ nodeId, message: `edge ${edge.uci} aponta para filho ausente` })
        continue
      }
      const applied = applyMove(node.fen, edge.san)
      if (!applied) {
        issues.push({ nodeId, message: `edge ${edge.san} ilegal` })
      } else if (identidadeDePosicao(applied.fenAfter) !== child.id) {
        issues.push({ nodeId, message: `edge ${edge.san} aponta para FEN incorreto` })
      }
      pending.push(child.id)
    }
  }
  for (const nodeId of opening.graph.keys()) {
    if (!reachable.has(nodeId)) issues.push({ nodeId, message: 'node órfão' })
  }
  for (const move of opening.mainline) {
    if (move.comment.trim().length === 0)
      issues.push({ nodeId: opening.rootNodeId, message: `lance ${move.san} sem comentário` })
  }
  return issues
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

/** Seleciona posições distribuídas na linha para quem já chega com repertório. */
export function openingDiagnosticQuestions(
  opening: OpeningDefinition,
  limit = 4,
): OpeningDiagnosticQuestion[] {
  if (limit <= 0) return []
  const candidates: OpeningDiagnosticQuestion[] = []
  let fen = opening.rootFen
  for (let index = 0; index < opening.mainline.length; index += 1) {
    const nodeId = identidadeDePosicao(fen)
    const node = opening.graph.get(nodeId)
    const turn = fen.split(' ')[1]
    if (node && turn === (opening.side === 'white' ? 'w' : 'b') && node.outgoingMoves.length > 0) {
      candidates.push({
        nodeId,
        fen,
        ply: node.ply,
        prompt: 'Qual decisão você tomaria nesta posição sem consultar a linha?',
        moves: node.outgoingMoves.filter((edge) => edge.role !== 'mistake'),
      })
    }
    const applied = applyMove(fen, opening.mainline[index]?.san ?? '')
    if (!applied) break
    fen = applied.fenAfter
  }
  if (candidates.length <= limit) return candidates
  return Array.from({ length: limit }, (_, index) => {
    const position = Math.round((index * (candidates.length - 1)) / (limit - 1))
    return candidates[position] as OpeningDiagnosticQuestion
  })
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

/** Oponente do treino: grafo permitido + frequência + adaptação ao progresso. */
export function chooseOpeningTrainingOpponent(
  opening: OpeningDefinition,
  nodeId: string,
  progress: OpeningProgress,
  random = Math.random,
): WeightedMove | null {
  const node = opening.graph.get(nodeId)
  if (!node) return null
  const learned = new Set(progress.learnedNodeIds)
  const weak = new Set(progress.weakNodeIds)
  const allowed = node.outgoingMoves.filter(
    (edge) => edge.role === 'main' || learned.has(edge.nextNodeId) || edge.discoverySafe === true,
  )
  const candidates =
    allowed.length > 0 ? allowed : node.outgoingMoves.filter((edge) => edge.role === 'main')
  if (candidates.length === 0) return null
  const weighted = candidates.map((edge) => ({
    edge,
    weight:
      Math.max(1, edge.frequency) *
      (weak.has(edge.nextNodeId) ? 2 : 1) *
      (edge.role === 'main' ? 1.2 : 1),
  }))
  const total = weighted.reduce((sum, item) => sum + item.weight, 0)
  let cursor = random() * total
  for (const item of weighted) {
    cursor -= item.weight
    if (cursor <= 0) {
      return {
        uci: item.edge.uci,
        san: item.edge.san,
        weight: item.weight,
        nextNodeId: item.edge.nextNodeId,
      }
    }
  }
  const last = weighted[weighted.length - 1]?.edge
  return last
    ? {
        uci: last.uci,
        san: last.san,
        weight: weighted.at(-1)?.weight ?? 1,
        nextNodeId: last.nextNodeId,
      }
    : null
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
    const plan = opening.plans.find((candidate) => candidate.positionNodeId === node.id)
    const context = plan
      ? ` Nesta posição, o plano estudado é “${plan.name}”: ${plan.objective}`
      : ''
    return {
      classification: 'out_of_repertoire',
      message: `Esse lance pode ser jogável, mas sai do repertório que estamos treinando.${context}`,
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
      message: edge.explanation
        ? `Esse lance é bom e pertence a uma variação estudada. ${edge.explanation}`
        : 'Esse lance é bom e pertence a uma variação estudada.',
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
  return {
    ...progress,
    status: progress.status === 'active_repertoire' ? 'active_repertoire' : 'learning',
    learnedNodeIds,
    lastPracticedAt: now,
  }
}

/** Ativa uma abertura no repertório guiado sem apagar o estado pedagógico. */
export function activateOpeningRepertoire(progress: OpeningProgress, now: string): OpeningProgress {
  return { ...progress, status: 'active_repertoire', lastPracticedAt: now }
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
  const status: OpeningStatus =
    progress.status === 'active_repertoire'
      ? 'active_repertoire'
      : weakNodeIds.length > 0
        ? 'consolidating'
        : 'training'
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

/** Confiança é uma leitura dos fatos, não uma segunda fonte de verdade. */
export function openingConfidence(progress: OpeningProgress): number {
  if (progress.trainedNodeIds.length === 0) return 0
  return Math.max(0, 1 - progress.weakNodeIds.length / progress.trainedNodeIds.length)
}

/** Funde duas cópias sem apagar ensino, treino ou posições fracas. */
export function mergeOpeningProgress(
  local: OpeningProgress,
  remote: OpeningProgress,
): OpeningProgress {
  const union = (left: string[], right: string[]) => [...new Set([...left, ...right])]
  const learnedNodeIds = union(local.learnedNodeIds, remote.learnedNodeIds)
  const trainedNodeIds = union(local.trainedNodeIds, remote.trainedNodeIds)
  const weakNodeIds = union(local.weakNodeIds, remote.weakNodeIds)
  const completedActivities = union(local.completedActivities, remote.completedActivities)
  const lastPracticedAt =
    [local.lastPracticedAt, remote.lastPracticedAt]
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1) ?? null
  const statusRank: Record<OpeningStatus, number> = {
    not_started: 0,
    learning: 1,
    training: 2,
    consolidating: 3,
    active_repertoire: 4,
  }
  const status =
    statusRank[local.status] >= statusRank[remote.status] ? local.status : remote.status
  const merged = {
    ...local,
    status,
    learnedNodeIds,
    trainedNodeIds,
    weakNodeIds,
    completedActivities,
    lastPracticedAt,
  }
  return {
    ...merged,
    confidence: openingConfidence(merged),
    lessonPly: Math.max(local.lessonPly ?? 0, remote.lessonPly ?? 0),
    lastSection:
      (remote.lastPracticedAt ?? '') >= (local.lastPracticedAt ?? '')
        ? remote.lastSection
        : local.lastSection,
  }
}

export function markOpeningLessonProgress(
  progress: OpeningProgress,
  ply: number,
  now: string,
): OpeningProgress {
  return {
    ...progress,
    lessonPly: Math.max(progress.lessonPly ?? 0, ply),
    lastSection: 'learn',
    lastPracticedAt: now,
  }
}

export function mergeOpeningProgressList(
  local: readonly OpeningProgress[],
  remote: readonly OpeningProgress[],
): OpeningProgress[] {
  const byOpening = new Map(local.map((progress) => [progress.openingId, progress]))
  for (const incoming of remote) {
    const current = byOpening.get(incoming.openingId)
    byOpening.set(incoming.openingId, current ? mergeOpeningProgress(current, incoming) : incoming)
  }
  return [...byOpening.values()]
}

/** Escada de ajuda: raciocínio primeiro, lance explícito somente sob pedido. */
export function openingHint(
  opening: OpeningDefinition,
  nodeId: string,
  level: number,
): string | null {
  const node = opening.graph.get(nodeId)
  const preferred =
    node?.outgoingMoves.find((edge) => edge.role === 'main') ?? node?.outgoingMoves[0]
  if (!node || !preferred || level < 1) return null
  if (level === 1) return 'Qual peça ainda precisa ser desenvolvida para uma casa ativa?'
  if (level === 2)
    return (
      preferred.lesson?.resultingPlan ??
      preferred.lesson?.strategicIdea ??
      'Pense no plano que esta posição prepara.'
    )
  if (level === 3)
    return `Procure uma casa ativa para a peça que ainda está fora do jogo; observe a pressão em ${preferred.lesson?.highlights?.[0] ?? 'uma casa central'}.`
  return `O lance candidato do repertório é ${preferred.san}.`
}
