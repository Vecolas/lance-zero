/**
 * Leitura do dump de puzzles do Lichess (CC0).
 *
 * O ponto que mais dá bug neste dataset está em `toSolvable`. Leia o comentário
 * de lá antes de mexer em qualquer coisa aqui.
 *
 * Colunas oficiais, nesta ordem:
 * `PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags`
 */

import { applyMove, isValidFen, positionStatus } from '@/lib/chess'
import type { Puzzle, SolvablePuzzle } from '@/domain/types'
import { skillIdsForThemes } from './themes'

/** Erro de leitura de uma linha do dump. Carrega o `PuzzleId` quando existe. */
export class PuzzleParseError extends Error {
  readonly puzzleId: string | null
  readonly linha: number | null

  constructor(message: string, opcoes: { puzzleId?: string | null; linha?: number | null } = {}) {
    super(message)
    this.name = 'PuzzleParseError'
    this.puzzleId = opcoes.puzzleId ?? null
    this.linha = opcoes.linha ?? null
  }
}

export const PUZZLE_CSV_HEADER =
  'PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags'

/** O dump não usa aspas nem vírgula dentro de campo: são sempre 10 colunas. */
export const PUZZLE_CSV_COLUMNS = 10

const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][nbrq]?$/

export interface UciMove {
  from: string
  to: string
  promotion?: 'n' | 'b' | 'r' | 'q'
}

/** Normaliza um lance UCI: sem espaços, minúsculo. */
export function normalizeUci(uci: string): string {
  return uci.trim().toLowerCase()
}

export function isUci(uci: string): boolean {
  return UCI_PATTERN.test(normalizeUci(uci))
}

/**
 * Quebra `e7e8q` em `{ from, to, promotion }`. Devolve `null` para entrada que
 * nem sequer tem forma de UCI — cabe ao chamador decidir se isso é erro de
 * dados ou lance digitado errado pelo usuário.
 */
export function parseUci(uci: string): UciMove | null {
  const limpo = normalizeUci(uci)
  if (!UCI_PATTERN.test(limpo)) return null
  const promotion = limpo.length === 5 ? (limpo[4] as 'n' | 'b' | 'r' | 'q') : undefined
  return { from: limpo.slice(0, 2), to: limpo.slice(2, 4), promotion }
}

function campoNumerico(
  valor: string,
  nome: string,
  puzzleId: string,
  linha: number | null,
  obrigatorio: boolean,
): number | undefined {
  const bruto = valor.trim()
  if (bruto === '') {
    if (!obrigatorio) return undefined
    throw new PuzzleParseError(`Puzzle ${puzzleId}: coluna ${nome} vazia.`, { puzzleId, linha })
  }
  const numero = Number(bruto)
  if (!Number.isFinite(numero)) {
    throw new PuzzleParseError(`Puzzle ${puzzleId}: coluna ${nome} não é numérica ("${bruto}").`, {
      puzzleId,
      linha,
    })
  }
  return numero
}

function listaSeparadaPorEspaco(valor: string): string[] {
  return valor
    .trim()
    .split(/\s+/)
    .filter((item) => item.length > 0)
}

/**
 * Lê uma linha do dump. Lança `PuzzleParseError` — com o `PuzzleId` no texto
 * sempre que ele puder ser lido — em vez de devolver um puzzle meia-boca.
 */
export function parsePuzzleCsvLine(linha: string, numeroDaLinha: number | null = null): Puzzle {
  const conteudo = linha.replace(/\r$/, '').trim()
  if (conteudo === '') {
    throw new PuzzleParseError('Linha vazia.', { linha: numeroDaLinha })
  }

  const colunas = conteudo.split(',')
  // O `PuzzleId` é lido antes de qualquer validação para poder aparecer no erro.
  const puzzleId = (colunas[0] ?? '').trim()

  if (colunas.length !== PUZZLE_CSV_COLUMNS) {
    throw new PuzzleParseError(
      `Puzzle ${puzzleId || '(sem id)'}: esperava ${PUZZLE_CSV_COLUMNS} colunas, encontrei ${colunas.length}.`,
      { puzzleId: puzzleId || null, linha: numeroDaLinha },
    )
  }

  if (puzzleId === '') {
    throw new PuzzleParseError('Linha sem PuzzleId.', { linha: numeroDaLinha })
  }

  const fen = (colunas[1] ?? '').trim()
  if (!isValidFen(fen)) {
    throw new PuzzleParseError(`Puzzle ${puzzleId}: FEN inválido ("${fen}").`, {
      puzzleId,
      linha: numeroDaLinha,
    })
  }

  const moves = listaSeparadaPorEspaco(colunas[2] ?? '').map(normalizeUci)
  if (moves.length < 2) {
    throw new PuzzleParseError(
      `Puzzle ${puzzleId}: precisa do lance preparatório mais pelo menos um lance de solução, encontrei ${moves.length}.`,
      { puzzleId, linha: numeroDaLinha },
    )
  }
  const invalido = moves.find((move) => !UCI_PATTERN.test(move))
  if (invalido !== undefined) {
    throw new PuzzleParseError(`Puzzle ${puzzleId}: lance fora do formato UCI ("${invalido}").`, {
      puzzleId,
      linha: numeroDaLinha,
    })
  }

  const rating = campoNumerico(colunas[3] ?? '', 'Rating', puzzleId, numeroDaLinha, true) ?? 0
  const ratingDeviation = campoNumerico(
    colunas[4] ?? '',
    'RatingDeviation',
    puzzleId,
    numeroDaLinha,
    false,
  )
  const popularity = campoNumerico(colunas[5] ?? '', 'Popularity', puzzleId, numeroDaLinha, false)
  const nbPlays = campoNumerico(colunas[6] ?? '', 'NbPlays', puzzleId, numeroDaLinha, false)

  const themes = listaSeparadaPorEspaco(colunas[7] ?? '')
  const gameUrl = (colunas[8] ?? '').trim()
  const openingTags = listaSeparadaPorEspaco(colunas[9] ?? '')

  return {
    id: puzzleId,
    fen,
    moves,
    rating,
    ...(ratingDeviation === undefined ? {} : { ratingDeviation }),
    ...(popularity === undefined ? {} : { popularity }),
    ...(nbPlays === undefined ? {} : { nbPlays }),
    themes,
    skillIds: skillIdsForThemes(themes),
    ...(gameUrl === '' ? {} : { gameUrl }),
    ...(openingTags.length === 0 ? {} : { openingTags }),
  }
}

export interface ParsePuzzleCsvOptions {
  /**
   * `true` pula a primeira linha, `false` nunca pula. Quando omitido, a
   * primeira linha é pulada só se começar com `PuzzleId`.
   */
  pularCabecalho?: boolean
}

export interface PuzzleCsvResult {
  puzzles: Puzzle[]
  /** Uma entrada por linha recusada. O lote inteiro nunca é perdido. */
  erros: PuzzleParseError[]
}

/**
 * Lê o CSV inteiro. Nunca lança no meio: linha ruim vira erro acumulado e a
 * leitura continua. Um dump de centenas de milhares de linhas sempre tem
 * sujeira, e derrubar o lote por causa de uma linha é o pior comportamento
 * possível para o pipeline de ingestão.
 */
export function parsePuzzleCsv(texto: string, opcoes: ParsePuzzleCsvOptions = {}): PuzzleCsvResult {
  const linhas = texto.split('\n')
  const puzzles: Puzzle[] = []
  const erros: PuzzleParseError[] = []

  const primeira = (linhas[0] ?? '').trim()
  const pular = opcoes.pularCabecalho ?? primeira.startsWith('PuzzleId')

  linhas.forEach((linha, indice) => {
    if (indice === 0 && pular) return
    if (linha.replace(/\r$/, '').trim() === '') return
    try {
      puzzles.push(parsePuzzleCsvLine(linha, indice + 1))
    } catch (error) {
      erros.push(
        error instanceof PuzzleParseError
          ? error
          : new PuzzleParseError(
              `Linha ${indice + 1}: ${error instanceof Error ? error.message : String(error)}`,
              { linha: indice + 1 },
            ),
      )
    }
  })

  return { puzzles, erros }
}

/**
 * Aplica o lance preparatório e devolve o puzzle do jeito que o jogador vai ver.
 *
 * ESTA É A FUNÇÃO QUE TODO MUNDO ERRA. No dump do Lichess, `fen` é a posição
 * ANTES de um lance do ADVERSÁRIO, e `moves[0]` é esse lance. O jogador só
 * começa a resolver a partir de `moves[1]`.
 *
 * Consequência: `playerColor` é o lado que joga DEPOIS de `moves[0]`, ou seja o
 * OPOSTO do lado indicado no FEN cru. Usar o lado do FEN inverte o tabuleiro
 * inteiro e faz o app pedir o lance para quem não é para jogar.
 */
export function toSolvable(puzzle: Puzzle): SolvablePuzzle {
  const setupMoveUci = puzzle.moves[0]
  if (setupMoveUci === undefined) {
    throw new PuzzleParseError(`Puzzle ${puzzle.id}: sem lance preparatório.`, {
      puzzleId: puzzle.id,
    })
  }

  const entrada = parseUci(setupMoveUci)
  if (entrada === null) {
    throw new PuzzleParseError(
      `Puzzle ${puzzle.id}: lance preparatório fora do formato UCI ("${setupMoveUci}").`,
      { puzzleId: puzzle.id },
    )
  }

  const aplicado = applyMove(puzzle.fen, entrada)
  if (aplicado === null) {
    throw new PuzzleParseError(
      `Puzzle ${puzzle.id}: lance preparatório "${setupMoveUci}" é ilegal na FEN do dump.`,
      { puzzleId: puzzle.id },
    )
  }

  const solutionUci = puzzle.moves.slice(1)
  if (solutionUci.length === 0) {
    throw new PuzzleParseError(`Puzzle ${puzzle.id}: solução vazia depois do lance preparatório.`, {
      puzzleId: puzzle.id,
    })
  }

  return {
    puzzle,
    startFen: aplicado.fenAfter,
    // O lado a jogar na posição resultante — nunca o lado do FEN cru.
    playerColor: positionStatus(aplicado.fenAfter).turn,
    setupMoveUci,
    solutionUci,
  }
}
