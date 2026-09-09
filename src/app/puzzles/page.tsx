import type { Metadata } from 'next'
import { PuzzleTrainer } from '@/components/puzzles/PuzzleTrainer'

export const metadata: Metadata = { title: 'Puzzles' }

export default function PuzzlesPage() {
  return (
    <>
      <h1>Puzzles</h1>
      <p>
        O tema não aparece antes da resposta. Tentar e não conseguir ensina mais do que ler a
        solução — por isso o que você errar volta como revisão.
      </p>
      <PuzzleTrainer />
    </>
  )
}
