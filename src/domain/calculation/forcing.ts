import type { Side } from '@/domain/types'
import { legalMoves, positionStatus, type LegalMove } from '@/lib/chess'

/**
 * Lances forçantes de uma posição.
 *
 * A rotina "xeques, capturas e ameaças" é o hábito que o produto quer instalar:
 * antes de calcular qualquer coisa, olhe o que é forçante. Xeque e captura são
 * calculáveis com exatidão pelas regras do jogo — não precisam de engine e não
 * admitem opinião, o que torna o exercício verificável.
 *
 * "Ameaça" fica de fora nesta versão de propósito: depende de avaliação e
 * viraria palpite. Melhor um exercício menor e correto do que um maior e vago.
 */

export type ForcingKind = 'xeque' | 'captura' | 'xeque-e-captura'

export interface ForcingMove {
  move: LegalMove
  kind: ForcingKind
}

export interface ForcingSummary {
  /** Lado que está no lance. */
  side: Side
  todos: LegalMove[]
  forcantes: ForcingMove[]
  xeques: LegalMove[]
  capturas: LegalMove[]
}

function classify(move: LegalMove): ForcingKind | null {
  if (move.isCheck && move.isCapture) return 'xeque-e-captura'
  if (move.isCheck) return 'xeque'
  if (move.isCapture) return 'captura'
  return null
}

export function forcingMoves(fen: string): ForcingSummary {
  const todos = legalMoves(fen)
  const forcantes: ForcingMove[] = []
  for (const move of todos) {
    const kind = classify(move)
    if (kind) forcantes.push({ move, kind })
  }
  return {
    side: positionStatus(fen).turn as Side,
    todos,
    forcantes,
    xeques: todos.filter((m) => m.isCheck),
    capturas: todos.filter((m) => m.isCapture),
  }
}

export interface ForcingScore {
  /** Forçantes que o aluno achou. */
  acertos: ForcingMove[]
  /** Lances que o aluno marcou e não são forçantes. */
  falsosPositivos: LegalMove[]
  /** Forçantes que passaram batido. */
  esquecidos: ForcingMove[]
  /** 0..1. Acertos sobre o total de forçantes, penalizado por falso positivo. */
  precisao: number
  completo: boolean
}

/** Configuração do exercício. Heurística de produto, a calibrar com uso real. */
export const FORCING_CONFIG = {
  /** Quanto cada falso positivo desconta da precisão, em fração do total. */
  pesoDoFalsoPositivo: 0.5,
} as const

/**
 * Confere a seleção do aluno contra a lista real.
 *
 * A seleção chega em UCI porque é o que o tabuleiro produz; casar por UCI evita
 * ambiguidade de SAN entre lances diferentes com a mesma notação abreviada.
 */
export function scoreForcingSelection(
  summary: ForcingSummary,
  selecionadosUci: readonly string[],
  config = FORCING_CONFIG,
): ForcingScore {
  const selecionados = new Set(selecionadosUci)
  const forcantesPorUci = new Map(summary.forcantes.map((f) => [f.move.uci, f]))

  const acertos: ForcingMove[] = []
  const falsosPositivos: LegalMove[] = []

  for (const uci of selecionados) {
    const forcante = forcantesPorUci.get(uci)
    if (forcante) {
      acertos.push(forcante)
      continue
    }
    const legal = summary.todos.find((m) => m.uci === uci)
    if (legal) falsosPositivos.push(legal)
  }

  const esquecidos = summary.forcantes.filter((f) => !selecionados.has(f.move.uci))
  const total = summary.forcantes.length

  // Sem lance forçante nenhum, acertar é justamente não marcar nada.
  const precisao =
    total === 0
      ? falsosPositivos.length === 0
        ? 1
        : 0
      : Math.max(0, (acertos.length - config.pesoDoFalsoPositivo * falsosPositivos.length) / total)

  return {
    acertos,
    falsosPositivos,
    esquecidos,
    precisao: Math.min(1, precisao),
    completo: esquecidos.length === 0 && falsosPositivos.length === 0,
  }
}
