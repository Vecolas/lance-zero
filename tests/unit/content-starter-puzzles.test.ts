import { describe, expect, it } from 'vitest'
import { STARTER_PUZZLES_CSV } from '@/content/puzzles/starter'
import { parsePuzzleCsv, toSolvable } from '@/domain/puzzles'

describe('conjunto inicial de puzzles', () => {
  it('passa inteiro pelo parser, sem erro', () => {
    const { puzzles, erros } = parsePuzzleCsv(STARTER_PUZZLES_CSV, { pularCabecalho: true })
    expect(erros).toEqual([])
    expect(puzzles.length).toBe(11)
  })

  it('todo puzzle vira jogável com solução legal', () => {
    const { puzzles } = parsePuzzleCsv(STARTER_PUZZLES_CSV, { pularCabecalho: true })
    for (const puzzle of puzzles) {
      const solvable = toSolvable(puzzle)
      expect(solvable.solutionUci.length, puzzle.id).toBeGreaterThan(0)
      expect(solvable.startFen, puzzle.id).not.toBe(puzzle.fen)
    }
  })

  it('todo puzzle mapeia para pelo menos uma habilidade', () => {
    const { puzzles } = parsePuzzleCsv(STARTER_PUZZLES_CSV, { pularCabecalho: true })
    for (const puzzle of puzzles) {
      expect(
        puzzle.skillIds.length,
        `${puzzle.id} temas=${puzzle.themes.join(',')}`,
      ).toBeGreaterThan(0)
    }
  })
})
