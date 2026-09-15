import type { TablebaseResult } from '@/domain/types'
import { applyMove, legalMoves, parseUci } from '@/lib/chess'

export interface TrainingContext { moves: readonly string[]; targetResult?: 'win' | 'draw' | 'loss' }
export interface EndgameTrainingMove { uci: string; source: 'tablebase' | 'stockfish' | 'scripted' | 'legal'; explanation?: string }
export interface EndgameTrainingOpponent { getMove(position: string, context: TrainingContext): Promise<EndgameTrainingMove | null> }
export type TablebaseProbe = (fen: string) => Promise<TablebaseResult | null>

/** Oponente objetivo: usa o primeiro lance legal recomendado pela tablebase. */
export class TablebaseOpponent implements EndgameTrainingOpponent {
  constructor(private readonly probe: TablebaseProbe) {}
  async getMove(position: string): Promise<EndgameTrainingMove | null> {
    const result = await this.probe(position)
    const move = result?.lances.find((candidate) => parseUci(candidate.uci) !== null && legalMoves(position).some((legal) => legal.uci === candidate.uci))
    return move ? { uci: move.uci, source: 'tablebase', explanation: 'Defesa escolhida pela tablebase.' } : null
  }
}

/** Roteiro determinístico para lições que precisam demonstrar uma técnica. */
export class ScriptedTechniqueOpponent implements EndgameTrainingOpponent {
  constructor(private readonly script: readonly string[]) {}
  async getMove(position: string, context: TrainingContext): Promise<EndgameTrainingMove | null> {
    const candidate = this.script[context.moves.length]
    if (candidate && legalMoves(position).some((move) => move.uci === candidate)) return { uci: candidate, source: 'scripted' }
    const fallback = legalMoves(position).map((move) => move.uci).sort()[0]
    return fallback ? { uci: fallback, source: 'legal' } : null
  }
}

export function aplicarMovimentoDoOponente(position: string, move: EndgameTrainingMove): string | null {
  const parsed = parseUci(move.uci)
  return parsed === null ? null : applyMove(position, parsed)?.fenAfter ?? null
}
