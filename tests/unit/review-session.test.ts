import { describe, expect, it } from 'vitest'
import {
  availableRatings,
  createReviewSession,
  expectedMove,
  giveUpReview,
  submitReviewMove,
} from '@/domain/review/session'
import type { ReviewCard } from '@/domain/types'

/** Card com solução de 3 lances: aluno, adversário, aluno. */
function card(overrides: Partial<ReviewCard> = {}): ReviewCard {
  return {
    id: 'card-1',
    kind: 'posicao-exata',
    skillIds: ['tactics.fork'],
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    solutionUci: ['f3f7'],
    prompt: 'Brancas jogam e dão mate.',
    createdAt: '2026-01-01T00:00:00.000Z',
    dueAt: '2026-01-01T00:00:00.000Z',
    scheduler: {
      stability: 1,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 1,
      reps: 0,
      lapses: 0,
      state: 'new',
      lastReviewAt: null,
    },
    ...overrides,
  }
}

describe('sessão de revisão', () => {
  it('começa resolvendo, na posição do card', () => {
    const estado = createReviewSession(card())
    expect(estado.phase).toBe('resolvendo')
    expect(estado.fen).toBe(card().fen)
    expect(estado.step).toBe(0)
    expect(expectedMove(estado)).toBe('f3f7')
  })

  it('lance certo conclui a revisão de um lance só', () => {
    const estado = submitReviewMove(createReviewSession(card()), 'f3f7')
    expect(estado.phase).toBe('acertou')
    expect(estado.semErro).toBe(true)
    expect(estado.fen).not.toBe(card().fen)
  })

  it('lance errado leva a errou sem mexer na posição', () => {
    const inicial = createReviewSession(card())
    const estado = submitReviewMove(inicial, 'e1e2')
    expect(estado.phase).toBe('errou')
    expect(estado.lanceErrado).toBe('e1e2')
    expect(estado.semErro).toBe(false)
    expect(estado.fen).toBe(inicial.fen)
  })

  it('não muta o estado anterior', () => {
    const inicial = createReviewSession(card())
    submitReviewMove(inicial, 'f3f7')
    expect(inicial.phase).toBe('resolvendo')
    expect(inicial.step).toBe(0)
  })

  it('responde pelo adversário nos lances de índice ímpar', () => {
    const multi = card({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      solutionUci: ['e2e4', 'e7e5', 'g1f3'],
    })
    const passo1 = submitReviewMove(createReviewSession(multi), 'e2e4')
    // Avançou dois: o lance do aluno e a resposta automática.
    expect(passo1.step).toBe(2)
    expect(passo1.phase).toBe('resolvendo')
    expect(expectedMove(passo1)).toBe('g1f3')

    const passo2 = submitReviewMove(passo1, 'g1f3')
    expect(passo2.phase).toBe('acertou')
  })

  it('ignora tentativa depois de concluída', () => {
    const pronto = submitReviewMove(createReviewSession(card()), 'f3f7')
    expect(submitReviewMove(pronto, 'e1e2')).toBe(pronto)
  })

  it('desistir conta como erro', () => {
    const estado = giveUpReview(createReviewSession(card()))
    expect(estado.phase).toBe('errou')
    expect(estado.semErro).toBe(false)
  })

  it('só quem acertou sem errar pode marcar Fácil', () => {
    const semErro = submitReviewMove(createReviewSession(card()), 'f3f7')
    expect(availableRatings(semErro)).toEqual(['again', 'hard', 'good', 'easy'])

    const errou = submitReviewMove(createReviewSession(card()), 'e1e2')
    expect(availableRatings(errou)).toEqual(['again'])
  })
})
