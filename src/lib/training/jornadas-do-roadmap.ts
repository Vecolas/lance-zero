/**
 * A ponte entre os nós do Roadmap e as jornadas de Aberturas e Finais.
 *
 * ELA ERA POR NOME, E DEIXOU DE SER. A versão anterior comparava TÍTULOS
 * normalizados — "Abertura Italiana" no Roadmap contra "Abertura Italiana" no
 * catálogo — porque os dois vocabulários nasceram separados e ninguém queria uma
 * tabela escrita à mão.
 *
 * O preço estava declarado no próprio arquivo e continuava sendo pago: renomear
 * um dos lados quebrava o link em silêncio. E o risco pior nunca era a quebra, e
 * sim o ACERTO ERRADO — busca por nome pode casar com o conteúdo vizinho, e um
 * aluno que pede Caro-Kann e recebe outra abertura não tem como saber que foi o
 * app que errou.
 *
 * Agora a ligação vem de `LEARNING_OBJECTS`, declarada por ID, uma linha por nó.
 * A tabela escrita à mão que evitávamos é exatamente o que torna a ligação
 * auditável: um nó novo sem decisão reprova no portão, em vez de casar por
 * acaso com o nome mais parecido.
 *
 * O QUE SOBROU AQUI é só a tradução de id de conteúdo para SLUG, que é
 * informação do catálogo e não do currículo.
 */

import { ENDGAME_DEFINITIONS } from '@/content/endgames/biblioteca'
import { OPENING_COURSES } from '@/content/openings/course'
import type { RoadmapNode } from '@/domain/roadmap'
import { learningTargetOf } from '@/domain/roadmap/learning-objects'
import type { LearningTarget } from '@/domain/roadmap/learning-target'
import { rotaDaJornada, type DominioDeJornada } from '@/domain/jornada'

export interface ConteudoDoNo {
  dominio: DominioDeJornada
  slug: string
  /** O id usado na store de jornadas: `abertura:italiana`. */
  jornadaId: string
  rota: string
}

/**
 * O conteúdo apontado por um alvo de jornada, ou `null` para os demais alvos.
 *
 * `null` aqui significa "este nó não é uma jornada de abertura ou final" — uma
 * lição não tem etapas para contar, e forçar uma seria inventar progresso.
 */
export function conteudoDoTarget(target: LearningTarget | null): ConteudoDoNo | null {
  if (target === null) return null

  if (target.type === 'opening-journey') {
    const curso = OPENING_COURSES.find((item) => item.id === target.openingId)
    if (!curso) return null
    return {
      dominio: 'abertura',
      slug: curso.slug,
      jornadaId: `abertura:${curso.id}`,
      rota: rotaDaJornada('abertura', curso.slug),
    }
  }

  if (target.type === 'endgame-journey') {
    const final = ENDGAME_DEFINITIONS.find((item) => item.id === target.endgameId)
    if (!final) return null
    return {
      dominio: 'final',
      slug: final.slug,
      jornadaId: `final:${final.id}`,
      rota: rotaDaJornada('final', final.slug),
    }
  }

  return null
}

/**
 * O conteúdo de um nó do Roadmap, quando ele abre uma jornada.
 *
 * `null` para lição, jornada de lições e nó ainda sem conteúdo.
 */
export function conteudoDoNo(node: Pick<RoadmapNode, 'id'>): ConteudoDoNo | null {
  return conteudoDoTarget(learningTargetOf(node))
}

/**
 * Os nós de jornada cujo conteúdo NÃO existe no catálogo.
 *
 * O portão: um id de abertura ou final errado em `LEARNING_OBJECTS` não pode
 * degradar em silêncio. Aqui ele vira número, e número reprova.
 */
export function jornadasComConteudoAusente(nodes: readonly RoadmapNode[]): string[] {
  return nodes
    .filter((node) => {
      const target = learningTargetOf(node)
      if (target === null) return false
      if (target.type !== 'opening-journey' && target.type !== 'endgame-journey') return false
      return conteudoDoTarget(target) === null
    })
    .map((node) => node.id)
}
