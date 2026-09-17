/**
 * As etapas de um conteúdo, montadas a partir do catálogo.
 *
 * POR QUE ISTO EXISTE: o Roadmap e o Hoje precisam saber QUANTAS etapas uma
 * abertura ou um final tem, para dizer "5 de 9". Eles não podem construir isso
 * sozinhos sem importar os dois domínios e os dois catálogos, e não deveriam —
 * cada tela que fizesse isso na mão viraria uma cópia da regra de montagem.
 *
 * Aqui a montagem acontece uma vez, atrás de uma pergunta só: "quais são as
 * etapas deste conteúdo?". Quem chama não precisa saber que abertura e final
 * usam construtores diferentes — e é justamente porque eles SÃO diferentes que
 * a tradução mora numa função e não num `if` espalhado pelas telas.
 */

import {
  ENDGAME_BY_SLUG,
  ENDGAME_LESSON_BY_ID,
  ENDGAME_POSITION_SETS,
} from '@/content/endgames/biblioteca'
import { OPENING_COURSE_BY_SLUG } from '@/content/openings/course'
import { construirJornadaDeAbertura } from '@/domain/openings/jornada'
import { construirJornadaDeFinal, type ConteudoDoFinal } from '@/domain/endgames/jornada'
import type { StudyStage } from '@/domain/jornada'
import type { ConteudoDoNo } from './jornadas-do-roadmap'

/**
 * O conteúdo de estudo de UM final, montado a partir do catálogo.
 *
 * UMA MONTAGEM SÓ, e é por isso que ela é exportada. A rota `/finais/[slug]`, o
 * Roadmap e o portão que confere se cada etapa é cumprível precisam do MESMO
 * `ConteudoDoFinal` — e três montagens à mão divergem no dia em que alguém
 * trocar de onde vem a lição. O portão passaria a medir um conteúdo que a página
 * não usa, e ficaria verde sobre a tela errada.
 *
 * `null` quando o slug não existe. Quem monta a jornada decide o que fazer com
 * isso; aqui não se inventa um final vazio.
 */
export function conteudoDoFinal(slug: string): ConteudoDoFinal | null {
  const final = ENDGAME_BY_SLUG.get(slug)
  if (!final) return null

  const conjunto = ENDGAME_POSITION_SETS.find((set) => set.id === final.drillIds[0])
  const licao = ENDGAME_LESSON_BY_ID.get(final.lessonIds[0] ?? '')
  return {
    posicoes: conjunto?.positions ?? [],
    passosDaLicao: licao?.steps,
  }
}

/**
 * As etapas, ou lista vazia quando o conteúdo não pôde ser montado.
 *
 * LISTA VAZIA E NÃO EXCEÇÃO: quem chama é uma tela de listagem, e um final com
 * conteúdo incompleto não pode derrubar o roadmap inteiro. O card degrada para
 * o comportamento antigo — que é pior que o novo e melhor que uma página branca.
 */
export function etapasDoConteudo(conteudo: ConteudoDoNo): StudyStage[] {
  try {
    if (conteudo.dominio === 'abertura') {
      const abertura = OPENING_COURSE_BY_SLUG.get(conteudo.slug)
      return abertura ? construirJornadaDeAbertura(abertura) : []
    }

    const final = ENDGAME_BY_SLUG.get(conteudo.slug)
    const material = conteudoDoFinal(conteudo.slug)
    if (!final || !material) return []

    return construirJornadaDeFinal(final, material)
  } catch {
    // `construirJornadaDeFinal` LANÇA quando o conteúdo não dá jornada (menos de
    // duas posições na família, por exemplo). É a decisão certa lá — conteúdo
    // quebrado não deve virar jornada silenciosa —, e aqui vira lista vazia
    // porque uma listagem não é o lugar de falhar por conteúdo de um item.
    return []
  }
}
