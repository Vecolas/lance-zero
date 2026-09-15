import type { Metadata } from 'next'
import { OpeningCatalog } from '@/components/openings/OpeningCatalog'

export const metadata: Metadata = { title: 'Aberturas' }

export default function AberturasPage() {
  return (
    <>
      <h1>Aberturas</h1>
      <p>Aprenda ideias, planos e variações. Não apenas memorize lances.</p>
      <OpeningCatalog />
    </>
  )
}
