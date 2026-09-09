/**
 * Catálogo das habilidades treináveis.
 *
 * Taxonomia deliberadamente pequena: 22 habilidades cobrindo tática, cálculo,
 * finais e aberturas. Só cresce quando telemetria real mostrar necessidade.
 *
 * `baseDifficulty` e `pedagogicalValue` são heurísticas de produto para um
 * jogador de ~1100. Não são constantes científicas e devem ser recalibradas
 * quando houver dados de uso.
 */

import { SKILL_IDS, type SkillArea, type SkillId } from '@/domain/types'

export interface SkillDefinition {
  id: SkillId
  area: SkillArea
  /** Rótulo curto em PT-BR, usado em títulos e listas. */
  label: string
  /** Uma linha explicando o que a habilidade cobre. */
  description: string
  /** Dificuldade base de 1 (trivial) a 5 (avançado) para o público-alvo. */
  baseDifficulty: number
  /** Valor pedagógico de 1 (marginal) a 5 (destrava pontos rápido) em ~1100. */
  pedagogicalValue: number
}

export const SKILL_CATALOG: readonly SkillDefinition[] = [
  {
    id: 'tactics.hanging-piece',
    area: 'tactics',
    label: 'Peça pendurada',
    description: 'Perceber peças sem defesa, suas e do adversário, antes de qualquer cálculo.',
    baseDifficulty: 1,
    pedagogicalValue: 5,
  },
  {
    id: 'tactics.fork',
    area: 'tactics',
    label: 'Garfo',
    description: 'Atacar dois alvos com um único lance, normalmente com cavalo, peão ou dama.',
    baseDifficulty: 2,
    pedagogicalValue: 5,
  },
  {
    id: 'tactics.pin',
    area: 'tactics',
    label: 'Cravada',
    description: 'Imobilizar uma peça que protege um alvo mais valioso atrás dela.',
    baseDifficulty: 2,
    pedagogicalValue: 4,
  },
  {
    id: 'tactics.skewer',
    area: 'tactics',
    label: 'Raio X',
    description: 'Atacar uma peça valiosa que, ao sair, expõe outra peça na mesma linha.',
    baseDifficulty: 3,
    pedagogicalValue: 3,
  },
  {
    id: 'tactics.discovered-attack',
    area: 'tactics',
    label: 'Ataque descoberto',
    description: 'Mover uma peça para liberar o ataque de outra que estava atrás dela.',
    baseDifficulty: 3,
    pedagogicalValue: 3,
  },
  {
    id: 'tactics.removal-of-defender',
    area: 'tactics',
    label: 'Remoção do defensor',
    description: 'Capturar, expulsar ou desviar a peça que sustenta a defesa do adversário.',
    baseDifficulty: 4,
    pedagogicalValue: 3,
  },
  {
    id: 'tactics.deflection',
    area: 'tactics',
    label: 'Desvio',
    description: 'Forçar uma peça a abandonar a casa ou a linha onde ela era indispensável.',
    baseDifficulty: 4,
    pedagogicalValue: 2,
  },
  {
    id: 'tactics.overloaded-piece',
    area: 'tactics',
    label: 'Peça sobrecarregada',
    description: 'Explorar uma peça que tenta cumprir duas funções defensivas ao mesmo tempo.',
    baseDifficulty: 4,
    pedagogicalValue: 2,
  },
  {
    id: 'tactics.back-rank',
    area: 'tactics',
    label: 'Última fileira',
    description: 'Mate ou ganho material na fileira do rei preso pelos próprios peões.',
    baseDifficulty: 2,
    pedagogicalValue: 4,
  },
  {
    id: 'tactics.mating-net',
    area: 'tactics',
    label: 'Rede de mate',
    description: 'Fechar as casas de fuga do rei adversário e converter o ataque em mate.',
    baseDifficulty: 3,
    pedagogicalValue: 3,
  },
  {
    id: 'calculation.checks-captures-threats',
    area: 'calculation',
    label: 'Xeques, capturas e ameaças',
    description: 'Varrer sistematicamente os lances forçantes antes de decidir.',
    baseDifficulty: 2,
    pedagogicalValue: 5,
  },
  {
    id: 'calculation.candidate-moves',
    area: 'calculation',
    label: 'Lances candidatos',
    description: 'Listar dois ou três lances plausíveis em vez de calcular só o primeiro impulso.',
    baseDifficulty: 3,
    pedagogicalValue: 4,
  },
  {
    id: 'calculation.opponent-best-response',
    area: 'calculation',
    label: 'Melhor resposta do adversário',
    description: 'Perguntar o que o adversário quer jogar antes de assumir que o plano funciona.',
    baseDifficulty: 3,
    pedagogicalValue: 5,
  },
  {
    id: 'endgame.basic-mates',
    area: 'endgame',
    label: 'Mates básicos',
    description: 'Dar mate com dama ou torre contra rei sem hesitar e sem afogar.',
    baseDifficulty: 1,
    pedagogicalValue: 5,
  },
  {
    id: 'endgame.king-pawn-opposition',
    area: 'endgame',
    label: 'Oposição',
    description: 'Usar a oposição de reis para ganhar ou segurar finais de rei e peão.',
    baseDifficulty: 2,
    pedagogicalValue: 4,
  },
  {
    id: 'endgame.key-squares',
    area: 'endgame',
    label: 'Casas-chave',
    description: 'Reconhecer as casas que decidem a promoção do peão e disputá-las a tempo.',
    baseDifficulty: 3,
    pedagogicalValue: 3,
  },
  {
    id: 'endgame.rule-of-square',
    area: 'endgame',
    label: 'Regra do quadrado',
    description: 'Saber de olho se o rei alcança o peão passado, sem contar casa por casa.',
    baseDifficulty: 2,
    pedagogicalValue: 4,
  },
  {
    id: 'endgame.passed-pawn',
    area: 'endgame',
    label: 'Peão passado',
    description: 'Criar e conduzir o peão que ninguém para, e frear o do adversário a tempo.',
    baseDifficulty: 3,
    pedagogicalValue: 4,
  },
  {
    id: 'endgame.rook-endgames',
    area: 'endgame',
    label: 'Finais de torre',
    description: 'Os poucos padrões que decidem o final mais comum: torre atrás do peão e a ponte.',
    baseDifficulty: 4,
    pedagogicalValue: 3,
  },
  {
    id: 'opening.development',
    area: 'opening',
    label: 'Desenvolvimento',
    description: 'Tirar as peças menores do lugar rápido em vez de mover a mesma peça duas vezes.',
    baseDifficulty: 1,
    pedagogicalValue: 4,
  },
  {
    id: 'opening.center',
    area: 'opening',
    label: 'Centro',
    description: 'Disputar e sustentar as casas centrais desde os primeiros lances.',
    baseDifficulty: 1,
    pedagogicalValue: 4,
  },
  {
    id: 'opening.king-safety',
    area: 'opening',
    label: 'Segurança do rei',
    description: 'Rocar cedo e evitar aberturas de coluna contra o próprio rei.',
    baseDifficulty: 2,
    pedagogicalValue: 5,
  },
]

const CATALOG_BY_ID = new Map<SkillId, SkillDefinition>(
  SKILL_CATALOG.map((skill) => [skill.id, skill]),
)

/** Escala máxima de `pedagogicalValue` e `baseDifficulty`. */
export const SKILL_SCALE_MAX = 5

/** Retorna a definição da habilidade. Lança se o id não existir no catálogo. */
export function getSkill(id: SkillId): SkillDefinition {
  const skill = CATALOG_BY_ID.get(id)
  if (!skill) {
    throw new Error(`Habilidade desconhecida no catálogo: ${id}`)
  }
  return skill
}

/** Habilidades de uma área, na ordem canônica de `SKILL_IDS`. */
export function skillsByArea(area: SkillArea): SkillDefinition[] {
  return SKILL_CATALOG.filter((skill) => skill.area === area)
}

/** Índice canônico da habilidade, usado como desempate determinístico. */
export function skillOrder(id: SkillId): number {
  return SKILL_IDS.indexOf(id)
}
