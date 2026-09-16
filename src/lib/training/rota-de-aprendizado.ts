/**
 * O roteador de aprendizado do app: UM lugar onde o destino vira endereço.
 *
 * `resolveLearningTarget` é puro e não lê catálogo — ele recebe a tradução de id
 * para slug por parâmetro. Este arquivo é onde essa tradução é ligada aos
 * catálogos de verdade, e é o único que as telas importam.
 *
 * POR QUE A SEPARAÇÃO. `opposition` vira `oposicao` no endereço, e quem sabe
 * disso é `@/content/endgames`. Se o domínio importasse conteúdo, testar a
 * resolução exigiria carregar catorze finais e seis aberturas para conferir uma
 * string. Com a tradução injetada, o domínio se testa com uma tabela de mentira
 * e este arquivo se testa contra o catálogo real.
 *
 * E POR QUE UM SÓ. A tela montava `href` por conta própria — e foi assim que
 * nasceu o `/lessons` genérico: cada card decidia sozinho, e o card que decidia
 * mal não aparecia em lugar nenhum. Um portão em
 * `roadmap-learning-target.test.ts` proíbe as telas de voltar a montar rota de
 * aprendizado à mão.
 */

import { ENDGAME_DEFINITIONS } from '@/content/endgames/biblioteca'
import { OPENING_COURSES } from '@/content/openings/course'
import {
  resolveLearningTarget,
  type LearningTarget,
  type OpcoesDeRota,
  type ResolucaoDeConteudo,
} from '@/domain/roadmap/learning-target'

/** Os catálogos reais, atrás da interface que o domínio pede. */
export const CONTEUDO_REAL: ResolucaoDeConteudo = {
  slugDaAbertura: (openingId) =>
    OPENING_COURSES.find((curso) => curso.id === openingId)?.slug ?? null,
  slugDoFinal: (endgameId) =>
    ENDGAME_DEFINITIONS.find((definicao) => definicao.id === endgameId)?.slug ?? null,
}

/**
 * O endereço de um destino pedagógico.
 *
 * LANÇA quando o alvo aponta para conteúdo inexistente, e isso é deliberado: um
 * id de abertura errado é erro de configuração, e devolver `/lessons` para
 * disfarçar é o defeito que este trabalho inteiro veio apagar.
 */
export function rotaDeAprendizado(target: LearningTarget, opcoes: OpcoesDeRota = {}): string {
  return resolveLearningTarget(target, CONTEUDO_REAL, opcoes)
}
