import { describe, expect, it } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'
import { applyMove, identidadeDePosicao } from '@/lib/chess'
import {
  activateOpeningRepertoire,
  classifyOpeningAttempt,
  chooseOpponentResponse,
  chooseOpeningTrainingOpponent,
  completeOpeningActivity,
  emptyOpeningProgress,
  markOpeningLearned,
  markOpeningAttempt,
  markOpeningLessonProgress,
  mergeOpeningProgress,
  mergeOpeningProgressList,
  openingDiagnosticQuestions,
  validateOpeningDefinition,
  openingHint,
  trainingNode,
  type OpeningDefinition,
} from '@/domain/openings'
import { openingAuthoringSchema } from '@/domain/openings/schema'
import { openingReviewCards } from '@/domain/openings/review'
import { registerOpeningGameEvidence, reviewOpeningGame } from '@/domain/openings/game-review'
import { parsePgn } from '@/lib/chess'
import { seedOpeningReviewCards } from '@/lib/training/opening-reviews'
import { applyReview } from '@/lib/fsrs/cards'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'

function positionAt(opening: OpeningDefinition, ply: number): string {
  let fen = opening.rootFen
  for (let index = 0; index < ply; index += 1) {
    const applied = applyMove(fen, opening.mainline[index].san)
    if (!applied) throw new Error(`linha ilegal no teste: ${opening.mainline[index].san}`)
    fen = applied.fenAfter
  }
  return identidadeDePosicao(fen)
}

describe('curso de aberturas como grafo pedagógico', () => {
  it('publica os cursos do catálogo, cada um com conteúdo mínimo', () => {
    /*
      O NÚMERO É CRAVADO DE PROPÓSITO e sobe a cada curso da expansão. Ele não
      mede qualidade — mede AUSÊNCIA: um curso que desaparecesse do registro por
      acidente não quebraria nenhum outro teste, porque todos iteram sobre a
      lista e uma lista menor passa igual.
    */
    expect(OPENING_COURSES).toHaveLength(8)
    for (const opening of OPENING_COURSES) {
      expect(opening.graph.size).toBeGreaterThan(opening.mainline.length)
      expect(opening.plans.length).toBeGreaterThan(0)
      expect(opening.structures.length).toBeGreaterThan(0)
      expect(opening.mistakes.length).toBeGreaterThan(0)
      expect(opening.transitionToMiddlegame.length).toBeGreaterThan(20)
    }
  })

  it('cada lance principal é legal e possui explicação', () => {
    for (const opening of OPENING_COURSES) {
      for (const move of opening.mainline) {
        expect(move.comment.trim(), `${opening.id}:${move.san}`).not.toBe('')
        expect(move.uci, `${opening.id}:${move.san} sem UCI normalizado`).toMatch(
          /^[a-h][1-8][a-h][1-8][qrbn]?$/,
        )
      }
      let fen = opening.rootFen
      for (const move of opening.mainline) {
        const applied = applyMove(fen, move.san)
        expect(applied, `${opening.id}:${move.san}`).not.toBeNull()
        fen = applied?.fenAfter ?? fen
      }
    }
  })

  it('planos e erros comuns apontam para a posição pedagógica correta', () => {
    for (const opening of OPENING_COURSES) {
      for (const plan of opening.plans) {
        const node = opening.graph.get(plan.positionNodeId)
        expect(node, `${opening.id}:${plan.id} sem node`).toBeDefined()
        if (node && plan.positionPly !== undefined) expect(node.ply).toBe(plan.positionPly)
      }
      for (const mistake of opening.mistakes) {
        const node = opening.graph.get(mistake.nodeId)
        expect(node, `${opening.id}:${mistake.id} sem node`).toBeDefined()
        if (node)
          expect(applyMove(node.fen, mistake.moveSan), `${opening.id}:${mistake.id}`).not.toBeNull()
      }
    }
  })

  it('todos os grafos publicados passam pelo portão de nodes e edges', () => {
    for (const opening of OPENING_COURSES) expect(validateOpeningDefinition(opening)).toEqual([])
  })

  it('o contrato autorado valida cursos e rejeita comentário vazio', () => {
    for (const opening of OPENING_COURSES)
      expect(openingAuthoringSchema.safeParse(opening).success).toBe(true)
    const opening = OPENING_COURSES[0]
    const invalid = {
      ...opening,
      mainline: opening.mainline.map((move, index) =>
        index === 0 ? { ...move, comment: '   ' } : move,
      ),
    }
    expect(openingAuthoringSchema.safeParse(invalid).success).toBe(false)
  })

  it('diagnóstico distribui posições do lado do repertório sem revelar a preferida', () => {
    for (const opening of OPENING_COURSES) {
      const questions = openingDiagnosticQuestions(opening)
      expect(questions.length).toBeGreaterThan(0)
      expect(questions.length).toBeLessThanOrEqual(4)
      for (const question of questions) {
        expect(question.moves.length).toBeGreaterThan(0)
        expect(question.moves.every((move) => move.role !== 'mistake')).toBe(true)
      }
    }
  })

  it('ativar repertório preserva nodes fracos e mantém o status ativo após treino', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const active = activateOpeningRepertoire(
      emptyOpeningProgress(opening.id),
      '2026-01-01T00:00:00.000Z',
    )
    expect(active.status).toBe('active_repertoire')
    expect(markOpeningLearned(active, opening.rootNodeId, '2026-01-01T00:01:00.000Z').status).toBe(
      'active_repertoire',
    )
    const trained = markOpeningAttempt(
      active,
      opening.rootNodeId,
      'inaccurate',
      '2026-01-02T00:00:00.000Z',
    )
    expect(trained.status).toBe('active_repertoire')
    expect(trained.weakNodeIds).toContain(opening.rootNodeId)
  })

  it('o mesmo node é a posição, não o caminho textual', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana')
    expect(opening).toBeDefined()
    const italiana = opening as OpeningDefinition
    const a = positionAt(italiana, 5)
    const b = italiana.graph.get(a)
    expect(b).toBeDefined()
    expect(new Set([...italiana.graph.keys()]).size).toBe(italiana.graph.size)
  })

  it('variações apontam para o ponto de divergência compartilhado', () => {
    const italiana = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const doisCavalos = italiana.variations.find((item) => item.id === 'italiana-dois-cavalos')
    expect(doisCavalos).toBeDefined()
    expect(doisCavalos?.rootNodeId).not.toBe(italiana.rootNodeId)
    expect(italiana.graph.get(doisCavalos?.rootNodeId ?? '')?.ply).toBe(5)
  })

  it('o opponent só escolhe respostas que saem do node e são legais', () => {
    for (const opening of OPENING_COURSES) {
      for (const node of opening.graph.values()) {
        const training = trainingNode(opening, node.id)
        if (!training || training.opponentResponses.length === 0) continue
        const response = chooseOpponentResponse(training, () => 0)
        expect(response).toBeDefined()
        expect(node.outgoingMoves.some((edge) => edge.uci === response?.uci)).toBe(true)
        expect(response?.weight).toBeGreaterThan(0)
      }
    }
  })

  it('lance saudável fora da linha não é classificado como blunder', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const root = opening.rootNodeId
    const result = classifyOpeningAttempt(opening, root, 'f1b5')
    expect(result.classification).toBe('out_of_repertoire')
    expect(result.message).toMatch(/jogável|bom/i)
    expect(result.classification).not.toBe('blunder')
  })

  it('desvio bom recebe o plano específico da posição quando existe', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const nodeId = positionAt(opening, 8)
    const result = classifyOpeningAttempt(opening, nodeId, 'c2c3')
    expect(result.classification).toBe('out_of_repertoire')
    expect(result.message).toMatch(/Ruptura d4|Abrir o centro/i)
  })

  it('só cria revisão depois de ensinar a posição', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const empty = emptyOpeningProgress(opening.id)
    expect(openingReviewCards(opening, empty, new Date('2026-01-01T00:00:00.000Z'))).toHaveLength(0)
    const learned = markOpeningLearned(empty, opening.rootNodeId, '2026-01-01T00:00:00.000Z')
    expect(openingReviewCards(opening, learned, new Date('2026-01-01T00:00:00.000Z'))[0]?.id).toBe(
      `opening:${opening.id}:${opening.rootNodeId}`,
    )
    const planNode = positionAt(opening, 8)
    const planProgress = markOpeningLearned(
      emptyOpeningProgress(opening.id),
      planNode,
      '2026-01-01T00:00:00.000Z',
    )
    expect(
      new Set(openingReviewCards(opening, planProgress, new Date()).map((card) => card.kind)),
    ).toContain('conceito')
  })

  it('funde progresso de dispositivos sem perder conclusões', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const left = completeOpeningActivity(
      emptyOpeningProgress(opening.id),
      'learn',
      '2026-01-01T00:00:00.000Z',
    )
    const right = markOpeningLearned(
      emptyOpeningProgress(opening.id),
      opening.rootNodeId,
      '2026-01-02T00:00:00.000Z',
    )
    const merged = mergeOpeningProgress(left, right)
    expect(merged.completedActivities).toContain('learn')
    expect(merged.learnedNodeIds).toContain(opening.rootNodeId)
    expect(merged.lastPracticedAt).toBe('2026-01-02T00:00:00.000Z')
  })

  it('game review separa desvio do adversário de erro de repertório', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const partida = parsePgn('[White "Aluno"]\n[Black "Oponente"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 *')
    const nodeBeforeDeviation = identidadeDePosicao(partida.plies[4]?.fenBefore ?? opening.rootFen)
    const learned = markOpeningLearned(
      emptyOpeningProgress(opening.id),
      nodeBeforeDeviation,
      '2026-01-01T00:00:00.000Z',
    )
    const review = reviewOpeningGame(opening, partida, 'w', learned)
    expect(review.classification).toBe('repertoire_mistake')
    const progress = markOpeningLearned(
      emptyOpeningProgress(opening.id),
      review.nodeId ?? opening.rootNodeId,
      '2026-01-01T00:00:00.000Z',
    )
    const updated = registerOpeningGameEvidence(progress, review, '2026-01-02T00:00:00.000Z')
    expect(updated.weakNodeIds).toContain(review.nodeId)
  })

  it('desvio de node ainda não ensinado não vira esquecimento', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const partida = parsePgn('[White "Aluno"]\n[Black "Oponente"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 *')
    const review = reviewOpeningGame(opening, partida, 'w', emptyOpeningProgress(opening.id))
    expect(review.classification).not.toBe('repertoire_mistake')
  })

  it('dicas sobem do conceito ao lance explícito', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    expect(openingHint(opening, opening.rootNodeId, 0)).toBeNull()
    expect(openingHint(opening, opening.rootNodeId, 1)).toMatch(/peça/i)
    expect(openingHint(opening, opening.rootNodeId, 4)).toMatch(/e4/i)
  })

  it('oponente adaptativo só usa mainline, nodes ensinados ou discovery-safe', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const progress = markOpeningLearned(
      emptyOpeningProgress(opening.id),
      opening.rootNodeId,
      '2026-01-01T00:00:00.000Z',
    )
    const response = chooseOpeningTrainingOpponent(opening, opening.rootNodeId, progress, () => 0)
    expect(response).toBeDefined()
    expect(
      opening.graph
        .get(opening.rootNodeId)
        ?.outgoingMoves.some(
          (edge) => edge.uci === response?.uci && (edge.role === 'main' || edge.discoverySafe),
        ),
    ).toBe(true)
  })

  it('checkpoint da aula avança e não volta ao recarregar', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const base = emptyOpeningProgress(opening.id)
    const avancado = markOpeningLessonProgress(base, 4, '2026-01-01T00:00:00.000Z')
    const voltou = markOpeningLessonProgress(avancado, 2, '2026-01-02T00:00:00.000Z')
    expect(voltou.lessonPly).toBe(4)
    expect(voltou.lastSection).toBe('learn')
  })

  it('funde listas de progresso sem perder a cópia de nenhum aparelho', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const local = markOpeningLearned(
      emptyOpeningProgress(opening.id),
      opening.rootNodeId,
      '2026-01-01T00:00:00.000Z',
    )
    const remote = completeOpeningActivity(
      emptyOpeningProgress(opening.id),
      'opening:italiana:learn',
      '2026-01-02T00:00:00.000Z',
    )
    const merged = mergeOpeningProgressList([local], [remote])
    expect(merged[0]?.learnedNodeIds).toContain(opening.rootNodeId)
    expect(merged[0]?.completedActivities).toContain('opening:italiana:learn')
  })

  it('semeia card de abertura sem reiniciar o FSRS existente', async () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const progress = markOpeningLearned(
      emptyOpeningProgress(opening.id),
      opening.rootNodeId,
      '2026-01-01T00:00:00.000Z',
    )
    const withPlan = markOpeningLearned(
      progress,
      positionAt(opening, 8),
      '2026-01-01T00:00:00.000Z',
    )
    const repo = new MemoryTrainingRepository()
    const now = new Date('2026-01-01T00:00:00.000Z')
    expect(await seedOpeningReviewCards(repo, opening, withPlan, now)).toBeGreaterThan(1)
    const first = (await repo.listReviewCards()).find(
      (card) => card.id === `opening:${opening.id}:${opening.rootNodeId}`,
    )
    if (!first) throw new Error('card não criado')
    const scheduled = applyReview(first, 'good', new Date('2026-01-02T00:00:00.000Z'))
    await repo.saveReviewCard(scheduled)
    expect(
      await seedOpeningReviewCards(repo, opening, withPlan, new Date('2026-01-03T00:00:00.000Z')),
    ).toBe(0)
    expect((await repo.listReviewCards()).find((card) => card.id === first.id)?.dueAt).toBe(
      scheduled.dueAt,
    )
  })
})
