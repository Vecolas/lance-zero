import type { Metadata } from 'next'
import { ReviewSession } from '@/components/training/ReviewSession'

export const metadata: Metadata = { title: 'Treinar' }

export default function TrainPage() {
  return (
    <>
      <h1>Treinar</h1>
      <p>
        A sessão começa pelas revisões vencidas, porque o que você já errou uma vez vale mais que
        conteúdo novo. Táticas e cálculo entram aqui quando a Fase 3 chegar.
      </p>
      <ReviewSession />
    </>
  )
}
