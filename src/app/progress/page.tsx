import type { Metadata } from 'next'
import { ProgressView } from '@/components/training/ProgressView'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Progresso' }

export default function ProgressPage() {
  return (
    <>
      <PageHeader
        title="Progresso"
        description="Leitura honesta do que mudou, do que precisa de trabalho e do próximo passo."
      />
      <ProgressView />
    </>
  )
}
