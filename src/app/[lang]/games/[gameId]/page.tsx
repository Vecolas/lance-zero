import type { Metadata } from 'next'
import { HumanReview } from '@/components/games/HumanReview'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Revisar partida' }

export default async function GameReviewPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  return (
    <>
      <PageHeader
        title="Revisar partida"
        description="Marque primeiro onde a partida mudou; a análise entra depois."
      />
      <HumanReview gameId={decodeURIComponent(gameId)} />
    </>
  )
}
