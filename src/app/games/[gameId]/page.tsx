import type { Metadata } from 'next'
import { HumanReview } from '@/components/games/HumanReview'

export const metadata: Metadata = { title: 'Revisar partida' }

export default async function GameReviewPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  return (
    <>
      <h1>Revisar partida</h1>
      <HumanReview gameId={decodeURIComponent(gameId)} />
    </>
  )
}
