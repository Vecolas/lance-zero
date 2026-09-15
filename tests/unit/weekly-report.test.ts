import { describe, expect, it } from 'vitest'
import { buildWeeklyReport } from '@/domain/progress/weekly-report'
import type { Game, PuzzleAttempt } from '@/domain/types'

const NOW = new Date('2026-09-14T12:00:00.000Z')

const tentativa = (
  id: string,
  attemptedAt: string,
  solved: boolean,
  firstTry: boolean,
): PuzzleAttempt => ({
  id,
  puzzleId: id,
  skillIds: [],
  attemptedAt,
  solved,
  firstTry,
  hintsUsed: 0,
  thinkTimeMs: 120_000,
})

const partida = (id: string, importedAt: string, reviewedAt?: string): Game => ({
  id,
  source: 'pgn',
  pgn: '[Event "fixture"]',
  playedAt: importedAt,
  white: 'Alice',
  black: 'Bob',
  userColor: 'w',
  result: '1-0',
  importedAt,
  humanReview: reviewedAt ? { markedPlies: [4], notes: 'troca', reviewedAt } : undefined,
})

describe('relatório dos últimos sete dias', () => {
  it('conta só atividade dentro da janela e separa primeira tentativa', () => {
    const resultado = buildWeeklyReport({
      now: NOW,
      attempts: [
        tentativa('recente-1', '2026-09-14T10:00:00.000Z', true, true),
        tentativa('recente-2', '2026-09-10T10:00:00.000Z', true, false),
        tentativa('antiga', '2026-09-06T11:59:59.999Z', true, true),
      ],
      games: [
        partida('importada', '2026-09-12T10:00:00.000Z', '2026-09-13T10:00:00.000Z'),
        partida('antiga', '2026-09-06T11:59:59.999Z', '2026-09-13T10:00:00.000Z'),
      ],
    })

    expect(resultado).toMatchObject({
      puzzleAttempts: 2,
      puzzlesSolved: 2,
      firstTrySolved: 1,
      gamesImported: 1,
      gamesReviewed: 2,
      practiceMinutes: 4,
      hasActivity: true,
    })
  })

  it('admite semana sem atividade sem inventar zeros de progresso', () => {
    const resultado = buildWeeklyReport({ now: NOW, attempts: [], games: [] })

    expect(resultado).toMatchObject({
      puzzleAttempts: 0,
      puzzlesSolved: 0,
      gamesImported: 0,
      gamesReviewed: 0,
      practiceMinutes: 0,
      hasActivity: false,
    })
  })

  it('ignora datas ilegíveis em vez de colocá-las na semana', () => {
    const resultado = buildWeeklyReport({
      now: NOW,
      attempts: [tentativa('ilegivel', 'não-é-data', true, true)],
      games: [partida('ilegivel', 'não-é-data')],
    })

    expect(resultado.hasActivity).toBe(false)
  })
})
