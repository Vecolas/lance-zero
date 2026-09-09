/**
 * Parser puro do protocolo UCI.
 *
 * Sem worker, sem DOM, sem estado global: entra string, sai objeto. Toda a
 * lógica de interpretação da engine vive aqui para poder ser testada sozinha.
 *
 * Convenção de perspectiva (importante e fácil de errar):
 * o UCI reporta `score cp` e `score mate` **na perspectiva do lado que joga**.
 * `+34` significa "melhor para quem tem a vez", não "melhor para as brancas".
 * Use `normalizeScoreToWhite` antes de comparar posições com lados diferentes.
 */

import type { EngineTurn, EngineWdl } from './types'

/** Dados extraídos de uma linha `info` da engine. Campos ausentes ficam `null`. */
export interface UciInfo {
  depth: number | null
  seldepth: number | null
  multiPv: number | null
  /** Centipeões na perspectiva de quem joga. `null` quando o score é mate. */
  scoreCp: number | null
  /** Lances até o mate, na perspectiva de quem joga. Negativo = mate sofrido. */
  mateIn: number | null
  /** A engine marcou o score como limite inferior/superior da janela de busca. */
  bound: 'lower' | 'upper' | null
  nodes: number | null
  nps: number | null
  timeMs: number | null
  hashfull: number | null
  /** Partes por mil. Calibrado por auto-jogo da engine, não por humanos. */
  wdl: EngineWdl | null
  /** Variação em UCI longo. Vazio quando a linha não traz `pv`. */
  pv: string[]
  /** Lance sendo examinado agora (`currmove`), quando informado. */
  currMove: string | null
  /** Texto livre de uma linha `info string ...`. */
  text: string | null
}

export interface UciBestMove {
  /** `null` quando a engine responde `bestmove (none)`. */
  bestMove: string | null
  ponder: string | null
}

/** Mensagem reconhecida vinda da engine. */
export type UciMessage =
  | { type: 'uciok' }
  | { type: 'readyok' }
  | { type: 'info'; info: UciInfo }
  | { type: 'bestmove'; bestMove: string | null; ponder: string | null }
  | { type: 'id'; field: string; value: string }
  | { type: 'option'; raw: string }
  | { type: 'unknown'; raw: string }

const EMPTY_INFO: UciInfo = {
  depth: null,
  seldepth: null,
  multiPv: null,
  scoreCp: null,
  mateIn: null,
  bound: null,
  nodes: null,
  nps: null,
  timeMs: null,
  hashfull: null,
  wdl: null,
  pv: [],
  currMove: null,
  text: null,
}

/** Acesso indexado explícito: o tsconfig não liga `noUncheckedIndexedAccess`. */
function at(tokens: string[], index: number): string | undefined {
  return index >= 0 && index < tokens.length ? tokens[index] : undefined
}

function toInt(token: string | undefined): number | null {
  if (token === undefined) return null
  const value = Number.parseInt(token, 10)
  return Number.isNaN(value) ? null : value
}

function tokenize(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean)
}

/**
 * Interpreta uma linha `info`. Retorna `null` se a linha não for `info`.
 *
 * Aceita as variações reais do Stockfish: com ou sem `multipv`, `wdl` dentro ou
 * fora do bloco `score`, `lowerbound`/`upperbound`, e `info string`.
 */
export function parseInfoLine(line: string): UciInfo | null {
  const tokens = tokenize(line)
  if (tokens[0] !== 'info') return null

  const info: UciInfo = { ...EMPTY_INFO, pv: [] }
  let i = 1

  while (i < tokens.length) {
    const token = at(tokens, i)
    switch (token) {
      case 'depth':
        info.depth = toInt(at(tokens, i + 1))
        i += 2
        break
      case 'seldepth':
        info.seldepth = toInt(at(tokens, i + 1))
        i += 2
        break
      case 'multipv':
        info.multiPv = toInt(at(tokens, i + 1))
        i += 2
        break
      case 'nodes':
        info.nodes = toInt(at(tokens, i + 1))
        i += 2
        break
      case 'nps':
        info.nps = toInt(at(tokens, i + 1))
        i += 2
        break
      case 'time':
        info.timeMs = toInt(at(tokens, i + 1))
        i += 2
        break
      case 'hashfull':
        info.hashfull = toInt(at(tokens, i + 1))
        i += 2
        break
      case 'currmove':
        info.currMove = at(tokens, i + 1) ?? null
        i += 2
        break
      case 'score': {
        const kind = at(tokens, i + 1)
        const value = toInt(at(tokens, i + 2))
        if (kind === 'cp') info.scoreCp = value
        else if (kind === 'mate') info.mateIn = value
        i += 3
        if (at(tokens, i) === 'lowerbound') {
          info.bound = 'lower'
          i += 1
        } else if (at(tokens, i) === 'upperbound') {
          info.bound = 'upper'
          i += 1
        }
        break
      }
      case 'wdl': {
        const win = toInt(at(tokens, i + 1))
        const draw = toInt(at(tokens, i + 2))
        const loss = toInt(at(tokens, i + 3))
        if (win !== null && draw !== null && loss !== null) info.wdl = { win, draw, loss }
        i += 4
        break
      }
      case 'pv':
        info.pv = tokens.slice(i + 1)
        i = tokens.length
        break
      case 'string':
        info.text = tokens.slice(i + 1).join(' ')
        i = tokens.length
        break
      default:
        // Token desconhecido (`tbhits`, `cpuload`, ...): ignora e segue.
        i += 1
        break
    }
  }

  return info
}

/** Interpreta `bestmove <lance> [ponder <lance>]`. Retorna `null` se não for. */
export function parseBestMove(line: string): UciBestMove | null {
  const tokens = tokenize(line)
  if (tokens[0] !== 'bestmove') return null

  const raw = at(tokens, 1)
  const bestMove = raw === undefined || raw === '(none)' || raw === '0000' ? null : raw
  const ponderIndex = tokens.indexOf('ponder')
  const ponder = ponderIndex === -1 ? null : (at(tokens, ponderIndex + 1) ?? null)

  return { bestMove, ponder }
}

/** Classifica uma linha qualquer vinda da engine. */
export function parseUciLine(line: string): UciMessage {
  const raw = line.trim()
  if (raw === 'uciok') return { type: 'uciok' }
  if (raw === 'readyok') return { type: 'readyok' }

  if (raw.startsWith('info')) {
    const info = parseInfoLine(raw)
    if (info) return { type: 'info', info }
  }

  if (raw.startsWith('bestmove')) {
    const best = parseBestMove(raw)
    if (best) return { type: 'bestmove', bestMove: best.bestMove, ponder: best.ponder }
  }

  if (raw.startsWith('id ')) {
    const tokens = tokenize(raw)
    return { type: 'id', field: at(tokens, 1) ?? '', value: tokens.slice(2).join(' ') }
  }

  if (raw.startsWith('option ')) return { type: 'option', raw }

  return { type: 'unknown', raw }
}

/**
 * Converte um score do UCI para a perspectiva das brancas.
 *
 * O UCI sempre reporta na perspectiva de quem tem a vez. Para comparar lances
 * de brancas e pretas na mesma escala (severidade, gráficos, cards de erro),
 * tudo é guardado na perspectiva das brancas.
 *
 * Serve tanto para centipeões quanto para distância de mate: o sinal segue a
 * mesma regra.
 */
export function normalizeScoreToWhite(score: number, turn: EngineTurn): number {
  return turn === 'w' ? score : -score
}

/**
 * Converte um WDL do UCI para a perspectiva das brancas.
 *
 * Como o score, o WDL do UCI é do lado que joga: com as pretas na vez, `win` é
 * a chance das pretas. Inverter é trocar `win` com `loss`.
 */
export function normalizeWdlToWhite(wdl: EngineWdl, turn: EngineTurn): EngineWdl {
  if (turn === 'w') return { ...wdl }
  return { win: wdl.loss, draw: wdl.draw, loss: wdl.win }
}

/** Lê o lado que joga a partir do FEN. Assume brancas se o campo faltar. */
export function turnFromFen(fen: string): EngineTurn {
  return at(tokenize(fen), 1) === 'b' ? 'b' : 'w'
}
