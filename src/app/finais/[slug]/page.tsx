import { notFound } from 'next/navigation'
import { EndgameLessonPage } from '@/components/endgames/EndgameLessonPage'
import { ENDGAME_BY_SLUG, ENDGAME_DEFINITIONS } from '@/content/endgames/biblioteca'

export function generateStaticParams() { return ENDGAME_DEFINITIONS.map((definition) => ({ slug: definition.slug })) }

export default async function FinalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const definition = ENDGAME_BY_SLUG.get(slug)
  if (!definition) notFound()
  return <EndgameLessonPage definition={definition} />
}
