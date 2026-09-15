import { describe, expect, it } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'
import { applyMove, identidadeDePosicao } from '@/lib/chess'
import {
  classifyOpeningAttempt,
  chooseOpponentResponse,
  completeOpeningActivity,
  emptyOpeningProgress,
  markOpeningLearned,
  mergeOpeningProgress,
  trainingNode,
  type OpeningDefinition,
} from '@/domain/openings'
import { openingReviewCards } from '@/domain/openings/review'

function positionAt(opening: OpeningDefinition, ply: number): string {
  let fen = opening.previewFen
  for (let index = 0; index < ply; index += 1) {
    const applied = applyMove(fen, opening.mainline[index].san)
    if (!applied) throw new Error(`linha ilegal no teste: ${opening.mainline[index].san}`)
    fen = applied.fenAfter
  }
  return identidadeDePosicao(fen)
}

describe('curso de aberturas como grafo pedagógico', () => {
  it('publica seis cursos completos, cada um com conteúdo mínimo', () => {
    expect(OPENING_COURSES).toHaveLength(6)
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
      }
      let fen = opening.previewFen
      for (const move of opening.mainline) {
        const applied = applyMove(fen, move.san)
        expect(applied, `${opening.id}:${move.san}`).not.toBeNull()
        fen = applied?.fenAfter ?? fen
      }
    }
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

  it('só cria revisão depois de ensinar a posição', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const empty = emptyOpeningProgress(opening.id)
    expect(openingReviewCards(opening, empty, new Date('2026-01-01T00:00:00.000Z'))).toHaveLength(0)
    const learned = markOpeningLearned(empty, opening.rootNodeId, '2026-01-01T00:00:00.000Z')
    expect(openingReviewCards(opening, learned, new Date('2026-01-01T00:00:00.000Z'))[0]?.id).toBe(
      `opening:${opening.id}:${opening.rootNodeId}`,
    )
  })

  it('funde progresso de dispositivos sem perder conclusões', () => {
    const opening = OPENING_COURSES.find((item) => item.id === 'italiana') as OpeningDefinition
    const left = completeOpeningActivity(emptyOpeningProgress(opening.id), 'learn', '2026-01-01T00:00:00.000Z')
    const right = markOpeningLearned(emptyOpeningProgress(opening.id), opening.rootNodeId, '2026-01-02T00:00:00.000Z')
    const merged = mergeOpeningProgress(left, right)
    expect(merged.completedActivities).toContain('learn')
    expect(merged.learnedNodeIds).toContain(opening.rootNodeId)
    expect(merged.lastPracticedAt).toBe('2026-01-02T00:00:00.000Z')
  })
})
