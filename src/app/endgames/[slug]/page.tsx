import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CURRICULO_FINAIS } from '@/content/endgames'
import { EndgameDetail } from '@/components/endgames/EndgameDetail'

export function generateStaticParams() {
  return CURRICULO_FINAIS.map((licao) => ({ slug: licao.id }))
}

export const dynamicParams = false

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const licao = CURRICULO_FINAIS.find((item) => item.id === params.slug)
  return { title: licao?.titulo ?? 'Final' }
}

export default function EndgameDetailPage({ params }: { params: { slug: string } }) {
  const licao = CURRICULO_FINAIS.find((item) => item.id === params.slug)
  if (!licao) notFound()
  return <EndgameDetail licao={licao} />
}
