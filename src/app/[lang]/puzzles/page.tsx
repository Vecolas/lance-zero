import type { Metadata } from 'next'
import { PuzzleTrainer } from '@/components/puzzles/PuzzleTrainer'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Puzzles' }

export default function PuzzlesPage() {
  return (
    <>
      <PageHeader
        title="Puzzles"
        description="O tema não aparece antes da resposta. O que você errar volta como revisão."
      />
      <PuzzleTrainer />
    </>
  )
}
