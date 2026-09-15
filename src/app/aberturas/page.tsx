import type { Metadata } from 'next'
import { OpeningCatalog } from '@/components/openings/OpeningCatalog'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Aberturas' }

export default function AberturasPage() {
  return (
    <>
      <PageHeader
        title="Aberturas"
        description="Aprenda ideias, planos e variações. Não apenas memorize lances."
      />
      <OpeningCatalog />
    </>
  )
}
