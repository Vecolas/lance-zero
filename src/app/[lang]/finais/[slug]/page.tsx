import { notFound } from 'next/navigation'
import { EndgameStudyJourney } from '@/components/endgames/EndgameStudyJourney'
import {
  ENDGAME_BY_SLUG,
  ENDGAME_DEFINITIONS,
  ENDGAME_LESSON_BY_ID,
  ENDGAME_POSITION_SETS,
} from '@/content/endgames/biblioteca'

/**
 * A página de UM final.
 *
 * Deixou de montar `EndgameLessonPage` — a tela de abas ("Visão geral |
 * Aprender | Praticar | Posições típicas | Erros comuns | Progresso") — e passa
 * a montar a JORNADA, pelo mesmo motivo das aberturas: escolher a ordem
 * pedagógica é trabalho do produto, não do aluno.
 *
 * A aba continua sendo `/finais`, e só finais moram nela. A infraestrutura de
 * jornada é compartilhada com Aberturas; o currículo e a validação NÃO são — em
 * final não existe "fora do repertório", e um lance diferente do exemplo que
 * preserva o resultado é aceito. Ver `@/domain/endgames/jornada`.
 *
 * O CONTEÚDO É MONTADO AQUI, no servidor, e entra na jornada por parâmetro: o
 * domínio não lê de `@/content` para continuar puro e testável com o final que
 * o teste quiser inventar.
 */
export function generateStaticParams() {
  return ENDGAME_DEFINITIONS.map((definition) => ({ slug: definition.slug }))
}

export default async function FinalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const definition = ENDGAME_BY_SLUG.get(slug)
  if (!definition) notFound()

  const positionSet = ENDGAME_POSITION_SETS.find((set) => set.id === definition.drillIds[0])
  const lesson = ENDGAME_LESSON_BY_ID.get(definition.lessonIds[0] ?? '')

  return (
    <>
      {/* O `h1` no servidor, pelo mesmo motivo da rota de abertura. */}
      <h1>{definition.name}</h1>
      <EndgameStudyJourney
        endgame={definition}
        conteudo={{
          posicoes: positionSet?.positions ?? [],
          passosDaLicao: lesson?.steps,
        }}
      />
    </>
  )
}
