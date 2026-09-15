import { notFound } from 'next/navigation'
import { OpeningCourse } from '@/components/openings/OpeningCourse'
import { OPENING_COURSE_BY_SLUG, OPENING_COURSES } from '@/content/openings/course'

export function generateStaticParams() {
  return OPENING_COURSES.map((opening) => ({ slug: opening.slug }))
}

export default async function AberturaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const opening = OPENING_COURSE_BY_SLUG.get(slug)
  if (!opening) notFound()
  return <OpeningCourse opening={opening} />
}
