import type { Game, PuzzleAttempt } from '@/domain/types'

export interface WeeklyReportInput {
  now: Date
  attempts: readonly PuzzleAttempt[]
  games: readonly Game[]
}

export interface WeeklyReport {
  from: string
  to: string
  puzzleAttempts: number
  puzzlesSolved: number
  firstTrySolved: number
  gamesImported: number
  gamesReviewed: number
  practiceMinutes: number
  hasActivity: boolean
}

function instanteValido(value: string | undefined): number | null {
  if (typeof value !== 'string') return null
  const instante = Date.parse(value)
  return Number.isFinite(instante) ? instante : null
}

function noPeriodo(value: string | undefined, from: number, to: number): boolean {
  const instante = instanteValido(value)
  return instante !== null && instante >= from && instante <= to
}

export function buildWeeklyReport(input: WeeklyReportInput): WeeklyReport {
  const to = input.now.getTime()
  const from = to - 7 * 24 * 60 * 60 * 1000
  const attempts = input.attempts.filter((attempt) => noPeriodo(attempt.attemptedAt, from, to))
  const gamesImported = input.games.filter((game) => noPeriodo(game.importedAt, from, to)).length
  const gamesReviewed = input.games.filter((game) =>
    noPeriodo(game.humanReview?.reviewedAt, from, to),
  ).length
  const practiceMinutes = Math.round(
    attempts.reduce((total, attempt) => total + Math.max(0, attempt.thinkTimeMs), 0) / 60_000,
  )

  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    puzzleAttempts: attempts.length,
    puzzlesSolved: attempts.filter((attempt) => attempt.solved).length,
    firstTrySolved: attempts.filter((attempt) => attempt.solved && attempt.firstTry).length,
    gamesImported,
    gamesReviewed,
    practiceMinutes,
    hasActivity: attempts.length > 0 || gamesImported > 0 || gamesReviewed > 0,
  }
}
