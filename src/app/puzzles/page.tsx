import type { Metadata } from 'next'
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen'

export const metadata: Metadata = { title: 'Puzzles' }

export default function PuzzlesPage() {
  return (
    <PlaceholderScreen
      title="Puzzles"
      phase={3}
      lead="Treinador de táticas com puzzles CC0 do Lichess, sem revelar o tema antes da resposta."
      planned={[
        'Dataset curado a partir do dump oficial do Lichess',
        'Semântica correta: o primeiro lance do PGN é aplicado antes de você jogar',
        'Dicas em três níveis: categoria, peça/casa, primeiro lance',
        'Depois da resposta: solução, motivo, variação jogável e por que o seu lance falha',
      ]}
    />
  )
}
