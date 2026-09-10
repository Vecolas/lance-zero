/**
 * As três dicas de um puzzle, na escada do PEDAGOGY.md.
 *
 * 1. categoria de pensamento — NUNCA revela peça nem casa;
 * 2. peça ou casa relevante;
 * 3. primeiro lance.
 *
 * A regra do nível 1 é literal: o texto não pode conter notação algébrica. Se
 * a dica já diz "o cavalo em e4", ela virou nível 2 e o jogador perdeu a chance
 * de fazer a varredura sozinho. Existe teste de regressão para isso.
 */

import { applyMove, parseUci } from '@/lib/chess'
import type { SkillId, SolvablePuzzle } from '@/domain/types'

export type HintLevel = 1 | 2 | 3

export interface Hint {
  level: HintLevel
  text: string
}

const NOMES_DE_PECA: Readonly<Record<string, string>> = {
  p: 'peão',
  n: 'cavalo',
  b: 'bispo',
  r: 'torre',
  q: 'dama',
  k: 'rei',
}

/**
 * Dica de nível 1 por habilidade. Fala do TIPO de coisa a procurar, nunca de
 * onde ela está. Sem letra de coluna seguida de número de fileira.
 */
const CATEGORIA_POR_SKILL: Readonly<Record<SkillId, string>> = {
  'tactics.hanging-piece': 'Alguma peça do adversário está sem defensor. Procure o que está solto.',
  'tactics.fork': 'Existe um lance que ataca duas coisas ao mesmo tempo.',
  'tactics.pin': 'Uma peça do adversário não pode sair do lugar sem expor algo mais valioso atrás.',
  'tactics.skewer':
    'Duas peças do adversário estão na mesma linha, e a mais valiosa está na frente.',
  'tactics.discovered-attack': 'Mover uma peça sua libera o ataque de outra que está atrás dela.',
  'tactics.removal-of-defender':
    'Algo importante do adversário depende de um único defensor. Pense em tirar esse defensor.',
  'tactics.deflection':
    'Uma peça do adversário está ocupada defendendo. Pense em obrigá-la a sair de lá.',
  'tactics.overloaded-piece':
    'Uma peça do adversário está defendendo mais coisas do que consegue dar conta.',
  'tactics.back-rank': 'O rei adversário pode não ter casa de fuga na última fileira.',
  'tactics.mating-net': 'Há mate. Comece pelos lances forçados e conte as casas de fuga do rei.',
  'calculation.checks-captures-threats':
    'Liste primeiro os xeques, depois as capturas, depois as ameaças diretas.',
  'calculation.candidate-moves': 'Escolha dois ou três lances candidatos antes de calcular.',
  'calculation.opponent-best-response':
    'Pense no melhor lance do adversário depois do seu, não no que você gostaria que ele jogasse.',
  'endgame.basic-mates': 'Empurre o rei adversário para a borda com as suas peças pesadas.',
  'endgame.king-pawn-opposition': 'A posição dos reis decide. Pense em quem fica com a oposição.',
  'endgame.key-squares': 'O peão sozinho não decide. Pense nas casas que o seu rei precisa ocupar.',
  'endgame.rule-of-square':
    'Antes de mover, pergunte se o rei alcança o peão. Dá para saber sem contar casa por casa.',
  'endgame.passed-pawn':
    'Um dos peões pode virar passado. Às vezes o caminho passa por entregar outro.',
  'endgame.rook-endgames':
    'Onde está a sua torre em relação ao peão? A resposta costuma decidir o final.',
  'opening.development': 'Olhe para as peças que ainda não entraram no jogo.',
  'opening.center': 'Olhe para o centro antes de olhar para as laterais.',
  'opening.king-safety': 'Olhe para a segurança do rei antes de partir para o ataque.',
}

/** Fallback quando o puzzle não tem nenhuma habilidade mapeada. */
export const CATEGORIA_PADRAO =
  'Comece pelos lances forçados: xeques, capturas e ameaças diretas, nessa ordem.'

/**
 * Ordem de preferência quando o puzzle tem mais de uma habilidade. A dica sai
 * da habilidade mais concreta, porque ela dá a varredura mais útil.
 *
 * Heurística de produto, a calibrar com dados reais de uso das dicas.
 */
const PRIORIDADE_DE_CATEGORIA: readonly SkillId[] = [
  'tactics.back-rank',
  'tactics.mating-net',
  'tactics.fork',
  'tactics.pin',
  'tactics.skewer',
  'tactics.discovered-attack',
  'tactics.deflection',
  'tactics.removal-of-defender',
  'tactics.overloaded-piece',
  'tactics.hanging-piece',
]

function escolherCategoria(skillIds: readonly SkillId[]): string {
  for (const skill of PRIORIDADE_DE_CATEGORIA) {
    if (skillIds.includes(skill)) return CATEGORIA_POR_SKILL[skill]
  }
  const primeira = skillIds[0]
  return primeira === undefined ? CATEGORIA_PADRAO : CATEGORIA_POR_SKILL[primeira]
}

/** Nível 1: categoria de pensamento. Sem peça, sem casa, sem notação. */
export function hintCategoria(solvable: SolvablePuzzle): Hint {
  return { level: 1, text: escolherCategoria(solvable.puzzle.skillIds) }
}

interface PrimeiroLance {
  from: string
  to: string
  san: string
  uci: string
  peca: string
}

function descreverPrimeiroLance(solvable: SolvablePuzzle): PrimeiroLance | null {
  const uci = solvable.solutionUci[0]
  if (uci === undefined) return null
  const entrada = parseUci(uci)
  if (entrada === null) return null
  const aplicado = applyMove(solvable.startFen, entrada)
  if (aplicado === null) return null
  return {
    from: aplicado.move.from,
    to: aplicado.move.to,
    san: aplicado.move.san,
    uci: aplicado.move.uci,
    peca: NOMES_DE_PECA[aplicado.move.piece] ?? 'peça',
  }
}

/** Nível 2: a peça relevante e de onde ela sai. Ainda não diz para onde vai. */
export function hintPeca(solvable: SolvablePuzzle): Hint {
  const lance = descreverPrimeiroLance(solvable)
  if (lance === null) {
    return { level: 2, text: 'Procure a peça sua que muda a avaliação da posição.' }
  }
  if (lance.peca === 'peão') {
    return { level: 2, text: `O lance-chave é com o peão de ${lance.from}.` }
  }
  return { level: 2, text: `O lance-chave é com o seu ${lance.peca} de ${lance.from}.` }
}

/** Nível 3: o primeiro lance, em SAN e em UCI. */
export function hintPrimeiroLance(solvable: SolvablePuzzle): Hint {
  const lance = descreverPrimeiroLance(solvable)
  if (lance === null) {
    const uci = solvable.solutionUci[0] ?? ''
    return { level: 3, text: `O primeiro lance é ${uci}.` }
  }
  return { level: 3, text: `O primeiro lance é ${lance.san} (${lance.uci}).` }
}

/** As três dicas, sempre nesta ordem. */
export function buildHints(solvable: SolvablePuzzle): [Hint, Hint, Hint] {
  return [hintCategoria(solvable), hintPeca(solvable), hintPrimeiroLance(solvable)]
}

/** A dica de um nível específico. */
export function hintAt(solvable: SolvablePuzzle, level: HintLevel): Hint {
  switch (level) {
    case 1:
      return hintCategoria(solvable)
    case 2:
      return hintPeca(solvable)
    case 3:
      return hintPrimeiroLance(solvable)
  }
}

export const MAX_HINT_LEVEL: HintLevel = 3
