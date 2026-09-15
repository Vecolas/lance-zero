import type { Metadata } from 'next'
import { EndgamesWorkbench } from '@/components/endgames/EndgamesWorkbench'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Finais' }

export default function EndgamesPage() {
  return (
    <>
      <PageHeader
        title="Finais"
        description="Final não se decora, se calcula. Jogue até cumprir o objetivo e entenda o princípio que decide a posição."
      />
      <EndgamesWorkbench />
    </>
  )
}
