import type { Metadata } from 'next'
import { GamesWorkbench } from '@/components/games/GamesWorkbench'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Partidas' }

export default function GamesPage() {
  return (
    <>
      <PageHeader
        title="Partidas"
        description="Importe suas partidas e revise primeiro com suas próprias perguntas. A engine só entra depois."
      />
      <GamesWorkbench />
    </>
  )
}
