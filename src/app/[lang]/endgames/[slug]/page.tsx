import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CURRICULO_FINAIS } from '@/content/endgames'
import { EndgameDetail } from '@/components/endgames/EndgameDetail'

export function generateStaticParams() {
  return CURRICULO_FINAIS.map((licao) => ({ slug: licao.id }))
}

export const dynamicParams = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const licao = CURRICULO_FINAIS.find((item) => item.id === slug)
  return { title: licao?.titulo ?? 'Final' }
}

export default async function EndgameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const licao = CURRICULO_FINAIS.find((item) => item.id === slug)
  if (!licao) notFound()
  return <EndgameDetail licao={licao} />
}
