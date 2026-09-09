/**
 * Seleção determinística de puzzles.
 *
 * Duas regras mandam aqui:
 *
 * 1. Mesma entrada e mesma seed produzem exatamente a mesma lista. Sem isso o
 *    plano do dia não é testável nem reproduzível.
 * 2. No modo misto o tema NÃO é revelado antes da resposta. A função devolve
 *    `rotulos: null` nesse modo; quem chama só recebe os rótulos depois, via
 *    `revelarRotulos`. Mostrar "garfo" antes do exercício destrói o valor de
 *    recuperação (PEDAGOGY.md).
 */

import type { Puzzle, SkillId } from '@/domain/types'
import { stableWeight } from './rng'
import { themeLabelsPt } from './themes'

/**
 * Pesos e limiares da seleção.
 *
 * São heurísticas de produto, a calibrar com dados reais. Nenhum número aqui
 * tem base empírica ainda.
 */
export const PUZZLE_SELECTION_CONFIG = {
  /** Faixa padrão em torno do rating alvo, quando nenhuma é informada. */
  janelaDeRatingPadrao: 200,
  /**
   * Quanto a distância do rating alvo pesa contra o desempate aleatório.
   * Valor alto = seleção mais previsível; valor baixo = mais variedade.
   */
  pesoDaDistanciaDeRating: 1,
  /** Peso do desempate determinístico por seed. */
  pesoDoSorteio: 120,
} as const

export type PuzzleSelectionMode = 'misto' | 'focado'

export interface PuzzleSelectionCriteria {
  /** Habilidades desejadas. Vazio ou ausente = qualquer habilidade serve. */
  skillIds?: readonly SkillId[]
  minRating?: number
  maxRating?: number
  /** Centro da faixa. Quando informado sem min/max, usa a janela padrão. */
  ratingAlvo?: number
  /** Quantos puzzles devolver. */
  quantidade: number
  /** Ids já vistos, que não podem voltar. */
  excluirIds?: readonly string[]
  /** `misto` (padrão) esconde o tema; `focado` já expõe. */
  modo?: PuzzleSelectionMode
}

export interface PuzzleCard {
  puzzle: Puzzle
  /** `false` no modo misto: o tema só aparece depois da resposta. */
  revelarTema: boolean
  /** Rótulos PT-BR dos temas, ou `null` enquanto não podem ser revelados. */
  rotulos: string[] | null
}

function faixaDeRating(criterio: PuzzleSelectionCriteria): { min: number; max: number } {
  const janela = PUZZLE_SELECTION_CONFIG.janelaDeRatingPadrao
  const alvo = criterio.ratingAlvo
  const min = criterio.minRating ?? (alvo === undefined ? Number.NEGATIVE_INFINITY : alvo - janela)
  const max = criterio.maxRating ?? (alvo === undefined ? Number.POSITIVE_INFINITY : alvo + janela)
  return { min, max }
}

/** Aplica os filtros duros do critério, mantendo a ordem original do pool. */
export function filterPool(pool: readonly Puzzle[], criterio: PuzzleSelectionCriteria): Puzzle[] {
  const { min, max } = faixaDeRating(criterio)
  const excluidos = new Set(criterio.excluirIds ?? [])
  const skills = criterio.skillIds ?? []

  return pool.filter((puzzle) => {
    if (excluidos.has(puzzle.id)) return false
    if (puzzle.rating < min || puzzle.rating > max) return false
    if (skills.length > 0 && !puzzle.skillIds.some((skill) => skills.includes(skill))) return false
    return true
  })
}

/**
 * Custo de um puzzle: quanto menor, mais cedo ele entra. Distância do rating
 * alvo mais um desempate estável por seed — nunca `Math.random`.
 */
function custo(puzzle: Puzzle, criterio: PuzzleSelectionCriteria, seed: number | string): number {
  const alvo = criterio.ratingAlvo
  const distancia = alvo === undefined ? 0 : Math.abs(puzzle.rating - alvo)
  const sorteio = stableWeight(seed, puzzle.id)
  return (
    distancia * PUZZLE_SELECTION_CONFIG.pesoDaDistanciaDeRating +
    sorteio * PUZZLE_SELECTION_CONFIG.pesoDoSorteio
  )
}

/**
 * Intercala os puzzles por habilidade, em rodízio, para que o modo misto não
 * entregue cinco garfos seguidos — o que entregaria o tema sem dizer o nome.
 */
function intercalarPorSkill(ordenados: readonly Puzzle[], skills: readonly SkillId[]): Puzzle[] {
  if (skills.length < 2) return [...ordenados]

  const baldes = new Map<string, Puzzle[]>()
  const semSkill: Puzzle[] = []

  for (const puzzle of ordenados) {
    const skill = skills.find((candidata) => puzzle.skillIds.includes(candidata))
    if (skill === undefined) {
      semSkill.push(puzzle)
      continue
    }
    const balde = baldes.get(skill)
    if (balde === undefined) baldes.set(skill, [puzzle])
    else balde.push(puzzle)
  }

  const resultado: Puzzle[] = []
  let restam = true
  while (restam) {
    restam = false
    for (const skill of skills) {
      const balde = baldes.get(skill)
      const proximo = balde?.shift()
      if (proximo !== undefined) {
        resultado.push(proximo)
        restam = true
      }
    }
  }

  return [...resultado, ...semSkill]
}

/**
 * Escolhe `quantidade` puzzles do pool.
 *
 * Determinístico: mesmo pool, mesmo critério e mesma seed sempre devolvem a
 * mesma lista, na mesma ordem.
 */
export function selectPuzzles(
  pool: readonly Puzzle[],
  criterio: PuzzleSelectionCriteria,
  seed: number | string,
): PuzzleCard[] {
  const modo = criterio.modo ?? 'misto'
  const quantidade = Math.max(0, Math.trunc(criterio.quantidade))
  if (quantidade === 0) return []

  const elegiveis = filterPool(pool, criterio)

  const ordenados = [...elegiveis].sort((a, b) => {
    const diferenca = custo(a, criterio, seed) - custo(b, criterio, seed)
    // Desempate final pelo id: dois puzzles com o mesmo custo nunca podem
    // depender da ordem em que o pool foi carregado.
    return diferenca !== 0 ? diferenca : a.id.localeCompare(b.id)
  })

  const skills = criterio.skillIds ?? []
  const arranjados = modo === 'misto' ? intercalarPorSkill(ordenados, skills) : ordenados

  return arranjados.slice(0, quantidade).map((puzzle) => toCard(puzzle, modo))
}

function toCard(puzzle: Puzzle, modo: PuzzleSelectionMode): PuzzleCard {
  const revelarTema = modo === 'focado'
  return {
    puzzle,
    revelarTema,
    rotulos: revelarTema ? themeLabelsPt(puzzle.themes) : null,
  }
}

/**
 * Abre os rótulos de um card. Só pode ser chamado DEPOIS da resposta —
 * é o passo "explicação" do loop, nunca o passo "recuperação".
 */
export function revelarRotulos(card: PuzzleCard): PuzzleCard {
  return { ...card, revelarTema: true, rotulos: themeLabelsPt(card.puzzle.themes) }
}
