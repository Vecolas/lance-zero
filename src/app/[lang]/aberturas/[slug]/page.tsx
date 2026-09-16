import { notFound } from 'next/navigation'
import { OpeningStudyJourney } from '@/components/openings/OpeningStudyJourney'
import { OPENING_COURSE_BY_SLUG, OPENING_COURSES } from '@/content/openings/course'

/**
 * A página de UMA abertura.
 *
 * O QUE MUDOU AQUI é pequeno no diff e grande no produto: ela deixou de montar
 * `OpeningCourse` — a tela de abas — e passa a montar a JORNADA.
 *
 * A aba continua sendo `/aberturas`, e só aberturas moram nela. Não existe uma
 * terceira aba agregando Aberturas e Finais, e não existe currículo misturado:
 * o que os dois módulos compartilham é a casca da jornada, nunca as regras.
 * Ver `@/domain/jornada`.
 */
export function generateStaticParams() {
  return OPENING_COURSES.map((opening) => ({ slug: opening.slug }))
}

export default async function AberturaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const opening = OPENING_COURSE_BY_SLUG.get(slug)
  if (!opening) notFound()

  return (
    <>
      {/*
        O `h1` É RENDERIZADO AQUI, no servidor, e não dentro da jornada.

        A jornada só existe depois de ler o IndexedDB; com o `h1` lá dentro, a
        página ficava sem cabeçalho nenhum até a hidratação — o contrato ARIA
        reprovou, e com razão. A identidade da página não pode depender de uma
        leitura de banco local que pode demorar ou falhar.
      */}
      <h1>{opening.name}</h1>
      <OpeningStudyJourney opening={opening} />
    </>
  )
}
