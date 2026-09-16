import type { Metadata } from 'next'
import { OpeningsWorkbench } from '@/components/openings/OpeningsWorkbench'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Aberturas' }

export default function OpeningsPage() {
  return (
    <>
      <PageHeader
        title="Aberturas"
        description="Poucas linhas, cada uma com a ideia escrita ao lado do lance. O próximo estudo nasce das suas partidas."
      />
      <OpeningsWorkbench />
    </>
  )
}
