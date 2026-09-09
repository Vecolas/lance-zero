/**
 * Detectores determinísticos de motivo tático.
 *
 * Cada detector recebe a posição antes do lance, o lance do usuário e o melhor
 * lance da engine, e devolve um código com confiança — ou `null`. Nenhum deles
 * chama a engine: a avaliação já foi feita, aqui só olhamos o tabuleiro.
 *
 * Regra do produto, não preferência de implementação: abaixo do limiar de
 * confiança o resultado é DESCARTADO. `unknown` é melhor que um tema inventado.
 *
 * Toda pergunta de regra (lance legal, lance aplicado, xeque-mate) vai para
 * `@/lib/chess`. A geometria de ataque fica em `./board`.
 */

import { applyMove, legalMoves, type LegalMove, type PieceColor } from '@/lib/chess'
import {
  PIECE_VALUES,
  attacksFrom,
  attackersOf,
  captureGain,
  findPins,
  kingSquare,
  kingZone,
  parseBoard,
  pieceName,
  piecesOf,
  squareCoords,
  worstHangingPiece,
  type Board,
  type PinInfo,
} from './board'

export const DETECTOR_CODES = [
  'hanging-piece',
  'missed-capture',
  'fork',
  'pin',
  'back-rank',
  'missed-mate',
  'king-safety',
] as const

export type DetectorCode = (typeof DETECTOR_CODES)[number]

export interface DetectorResult {
  code: DetectorCode
  /** 0..1. Já passou pelo limiar do detector. */
  confidence: number
  /** Trecho curto em PT-BR com a peça ou casa envolvida, para os templates. */
  detalhe?: string
}

/**
 * Limiares e pesos dos detectores.
 *
 * ATENÇÃO: HEURÍSTICAS DE PRODUTO. Os limiares foram escolhidos para errar
 * para o lado de `unknown` — é preferível não explicar a explicar errado. A
 * taxa de `unknown` é medida (`unknownRate`) e é ela que deve guiar qualquer
 * recalibração destes números.
 */
export interface DetectorConfig {
  hangingPiece: {
    limiarConfianca: number
    /** Centipeões que o adversário precisa ganhar para valer a pena falar. */
    ganhoMinimoCp: number
  }
  missedCapture: {
    limiarConfianca: number
    ganhoMinimoCp: number
  }
  fork: {
    limiarConfianca: number
    /** Alvos simultâneos necessários para chamar de ataque duplo. */
    alvosMinimos: number
  }
  pin: { limiarConfianca: number }
  backRank: { limiarConfianca: number }
  missedMate: {
    limiarConfianca: number
    /** Lances de profundidade da busca de mate. 1 ou 2; acima disso fica caro. */
    profundidadeMax: number
  }
  kingSafety: { limiarConfianca: number }
}

export const DETECTOR_CONFIG: DetectorConfig = {
  hangingPiece: { limiarConfianca: 0.55, ganhoMinimoCp: 100 },
  missedCapture: { limiarConfianca: 0.6, ganhoMinimoCp: 150 },
  fork: { limiarConfianca: 0.6, alvosMinimos: 2 },
  pin: { limiarConfianca: 0.6 },
  backRank: { limiarConfianca: 0.65 },
  missedMate: { limiarConfianca: 0.8, profundidadeMax: 2 },
  kingSafety: { limiarConfianca: 0.7 },
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100
}

function limitar(valor: number, teto = 0.95): number {
  return arredondar(Math.min(valor, teto))
}

/** Descarta o resultado quando a confiança fica abaixo do limiar do detector. */
function acimaDoLimiar(resultado: DetectorResult, limiar: number): DetectorResult | null {
  return resultado.confidence >= limiar ? resultado : null
}

interface Contexto {
  usuario: PieceColor
  adversario: PieceColor
  antes: Board
  lanceUsuario: LegalMove
  depoisUsuario: Board
  lanceMelhor: LegalMove | null
  depoisMelhor: Board | null
}

/** Prepara as três posições que todo detector precisa. `null` se algo é ilegal. */
function preparar(fenBefore: string, userMoveUci: string, bestMoveUci: string): Contexto | null {
  const usuarioAplicado = applyMove(fenBefore, userMoveUci)
  if (!usuarioAplicado) return null

  const melhorAplicado = bestMoveUci ? applyMove(fenBefore, bestMoveUci) : null
  const usuario = usuarioAplicado.move.color
  const adversario: PieceColor = usuario === 'w' ? 'b' : 'w'

  return {
    usuario,
    adversario,
    antes: parseBoard(fenBefore),
    lanceUsuario: usuarioAplicado.move,
    depoisUsuario: parseBoard(usuarioAplicado.fenAfter),
    lanceMelhor: melhorAplicado?.move ?? null,
    depoisMelhor: melhorAplicado ? parseBoard(melhorAplicado.fenAfter) : null,
  }
}

// ------------------------------------------------------------- peça pendurada

/** Depois do lance, uma peça do usuário fica sem defesa suficiente. */
export function detectHangingPiece(
  fenBefore: string,
  userMoveUci: string,
  bestMoveUci: string,
  config: DetectorConfig = DETECTOR_CONFIG,
): DetectorResult | null {
  const ctx = preparar(fenBefore, userMoveUci, bestMoveUci)
  if (!ctx) return null

  const pendurada = worstHangingPiece(ctx.depoisUsuario, ctx.usuario)
  if (!pendurada || pendurada.gain < config.hangingPiece.ganhoMinimoCp) return null

  // Se o próprio lance capturou mais do que deixa pendurado, não é o motivo.
  const ganhoDoLance = ctx.lanceUsuario.captured ? PIECE_VALUES[ctx.lanceUsuario.captured] : 0
  if (pendurada.gain <= ganhoDoLance) return null

  // Se o melhor lance deixasse a mesma peça igualmente exposta, o erro é outro.
  const noMelhor = ctx.depoisMelhor ? worstHangingPiece(ctx.depoisMelhor, ctx.usuario) : null
  if (pendurada.gain <= (noMelhor?.gain ?? 0)) return null

  const moveuAPeca = pendurada.piece.square === ctx.lanceUsuario.to
  const confianca = 0.45 + Math.min(pendurada.gain, 600) / 1000 + (moveuAPeca ? 0.05 : 0)

  return acimaDoLimiar(
    {
      code: 'hanging-piece',
      confidence: limitar(confianca),
      detalhe: `${pieceName(pendurada.piece.type)} em ${pendurada.piece.square}`,
    },
    config.hangingPiece.limiarConfianca,
  )
}

// ------------------------------------------------------------ captura perdida

interface CapturaAvaliada {
  move: LegalMove
  /** Material líquido em centipeões, já descontada a recaptura mais barata. */
  liquido: number
}

function avaliarCapturas(fen: string, adversario: PieceColor): CapturaAvaliada[] {
  const avaliadas: CapturaAvaliada[] = []

  for (const move of legalMoves(fen)) {
    if (!move.isCapture || !move.captured) continue
    const aplicado = applyMove(fen, move.uci)
    if (!aplicado) continue
    const recaptura = captureGain(parseBoard(aplicado.fenAfter), move.to, adversario)
    avaliadas.push({ move, liquido: PIECE_VALUES[move.captured] - Math.max(0, recaptura) })
  }

  return avaliadas.sort((a, b) => b.liquido - a.liquido || a.move.uci.localeCompare(b.move.uci))
}

/** Havia uma captura limpa que ganhava material e ela não foi jogada. */
export function detectMissedCapture(
  fenBefore: string,
  userMoveUci: string,
  bestMoveUci: string,
  config: DetectorConfig = DETECTOR_CONFIG,
): DetectorResult | null {
  const ctx = preparar(fenBefore, userMoveUci, bestMoveUci)
  if (!ctx) return null

  const capturas = avaliarCapturas(fenBefore, ctx.adversario)
  const melhorCaptura = capturas[0]
  if (!melhorCaptura || melhorCaptura.liquido < config.missedCapture.ganhoMinimoCp) return null
  if (melhorCaptura.move.uci === userMoveUci) return null

  const doUsuario = capturas.find((item) => item.move.uci === userMoveUci)?.liquido ?? 0
  if (doUsuario >= melhorCaptura.liquido) return null

  const eraOMelhorLance = melhorCaptura.move.uci === bestMoveUci
  const confianca = 0.5 + Math.min(melhorCaptura.liquido, 600) / 1200 + (eraOMelhorLance ? 0.1 : 0)

  return acimaDoLimiar(
    {
      code: 'missed-capture',
      confidence: limitar(confianca),
      detalhe: `${melhorCaptura.move.san} em ${melhorCaptura.move.to}`,
    },
    config.missedCapture.limiarConfianca,
  )
}

// ----------------------------------------------------------------- garfo

/** O melhor lance criava um ataque duplo que o lance jogado desperdiçou. */
export function detectFork(
  fenBefore: string,
  userMoveUci: string,
  bestMoveUci: string,
  config: DetectorConfig = DETECTOR_CONFIG,
): DetectorResult | null {
  if (userMoveUci === bestMoveUci) return null
  const ctx = preparar(fenBefore, userMoveUci, bestMoveUci)
  if (!ctx) return null

  const lanceMelhor = ctx.lanceMelhor
  const depoisMelhor = ctx.depoisMelhor
  if (!lanceMelhor || !depoisMelhor) return null

  const casa = lanceMelhor.to
  const atacante = depoisMelhor.get(casa)
  if (!atacante) return null

  const alvos = attacksFrom(depoisMelhor, casa)
    .map((alvo) => ({ square: alvo, peca: depoisMelhor.get(alvo) }))
    .filter((item) => item.peca?.color === ctx.adversario)
    .filter((item) => {
      const peca = item.peca
      if (!peca) return false
      if (peca.type === 'k') return true
      if (PIECE_VALUES[peca.type] >= PIECE_VALUES[atacante.type]) return true
      return captureGain(depoisMelhor, item.square, ctx.usuario) > 0
    })

  if (alvos.length < config.fork.alvosMinimos) return null

  const pegaORei = alvos.some((item) => item.peca?.type === 'k')
  const confianca = 0.55 + 0.1 * (alvos.length - config.fork.alvosMinimos) + (pegaORei ? 0.15 : 0)
  const casas = alvos.map((item) => item.square).join(' e ')

  return acimaDoLimiar(
    {
      code: 'fork',
      confidence: limitar(confianca, 0.9),
      detalhe: `${lanceMelhor.san} atacava ${casas} ao mesmo tempo`,
    },
    config.fork.limiarConfianca,
  )
}

// ----------------------------------------------------------------- cravada

function chaveDaCravada(pin: PinInfo): string {
  return `${pin.pinner.square}>${pin.pinned.square}>${pin.target.square}`
}

function cravadasNovas(antes: Board, depois: Board, cor: PieceColor): PinInfo[] {
  const existentes = new Set(findPins(antes, cor).map(chaveDaCravada))
  return findPins(depois, cor).filter((pin) => !existentes.has(chaveDaCravada(pin)))
}

function confiancaDaCravada(pin: PinInfo): number {
  const contraORei = pin.target.type === 'k' ? 0.15 : 0
  const pesada = PIECE_VALUES[pin.pinned.type] >= 300 ? 0.1 : 0
  return 0.6 + contraORei + pesada
}

/** Havia cravada disponível para o usuário, ou o lance jogado entrou em uma. */
export function detectPin(
  fenBefore: string,
  userMoveUci: string,
  bestMoveUci: string,
  config: DetectorConfig = DETECTOR_CONFIG,
): DetectorResult | null {
  const ctx = preparar(fenBefore, userMoveUci, bestMoveUci)
  if (!ctx) return null

  const candidatos: DetectorResult[] = []

  if (ctx.depoisMelhor && userMoveUci !== bestMoveUci) {
    for (const pin of cravadasNovas(ctx.antes, ctx.depoisMelhor, ctx.usuario)) {
      candidatos.push({
        code: 'pin',
        confidence: limitar(confiancaDaCravada(pin), 0.9),
        detalhe: `${ctx.lanceMelhor?.san ?? bestMoveUci} cravava ${pieceName(pin.pinned.type)} em ${pin.pinned.square}`,
      })
    }
  }

  for (const pin of cravadasNovas(ctx.antes, ctx.depoisUsuario, ctx.adversario)) {
    candidatos.push({
      code: 'pin',
      confidence: limitar(confiancaDaCravada(pin), 0.9),
      detalhe: `${pieceName(pin.pinned.type)} em ${pin.pinned.square} ficou cravada por ${pin.pinner.square}`,
    })
  }

  const melhor = candidatos.sort(
    (a, b) => b.confidence - a.confidence || (a.detalhe ?? '').localeCompare(b.detalhe ?? ''),
  )[0]

  return melhor ? acimaDoLimiar(melhor, config.pin.limiarConfianca) : null
}

// ---------------------------------------------------------------- corredor

interface CorredorInfo {
  fechado: boolean
  /** Casa vazia da última fileira em que uma peça pesada adversária pode entrar. */
  entrada: string | null
}

function analisarCorredor(board: Board, usuario: PieceColor, adversario: PieceColor): CorredorInfo {
  const rei = kingSquare(board, usuario)
  const origem = rei ? squareCoords(rei) : null
  const ultimaFileira = usuario === 'w' ? 0 : 7
  if (!origem || origem.rank !== ultimaFileira) return { fechado: false, entrada: null }

  const frente = usuario === 'w' ? 1 : -1
  let existentes = 0
  let bloqueadas = 0

  for (let df = -1; df <= 1; df += 1) {
    const file = origem.file + df
    if (file < 0 || file > 7) continue
    const casa = `${'abcdefgh'[file]}${origem.rank + frente + 1}`
    existentes += 1
    const ocupante = board.get(casa)
    if (ocupante && ocupante.color === usuario) bloqueadas += 1
  }

  const fechado = existentes > 0 && bloqueadas === existentes
  if (!fechado) return { fechado: false, entrada: null }

  const pesadas = piecesOf(board, adversario).filter(
    (peca) => peca.type === 'r' || peca.type === 'q',
  )
  if (pesadas.length === 0) return { fechado: true, entrada: null }

  for (const file of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const casa = `${'abcdefgh'[file]}${ultimaFileira + 1}`
    if (board.has(casa)) continue
    const alcanca = pesadas.some((peca) => attacksFrom(board, peca.square).includes(casa))
    if (!alcanca) continue
    if (attackersOf(board, casa, usuario).length > 0) continue
    return { fechado: true, entrada: casa }
  }

  return { fechado: true, entrada: null }
}

/** Fraqueza de última fileira criada ou ignorada pelo lance jogado. */
export function detectBackRank(
  fenBefore: string,
  userMoveUci: string,
  bestMoveUci: string,
  config: DetectorConfig = DETECTOR_CONFIG,
): DetectorResult | null {
  const ctx = preparar(fenBefore, userMoveUci, bestMoveUci)
  if (!ctx) return null

  const depois = analisarCorredor(ctx.depoisUsuario, ctx.usuario, ctx.adversario)
  if (!depois.fechado) return null

  const antes = analisarCorredor(ctx.antes, ctx.usuario, ctx.adversario)
  const criadaAgora = depois.entrada !== null && antes.entrada === null

  const confianca = 0.5 + (depois.entrada ? 0.25 : 0) + (criadaAgora ? 0.1 : 0)
  const detalhe = depois.entrada
    ? `a última fileira ficou aberta em ${depois.entrada}`
    : 'o rei segue sem casa de fuga na última fileira'

  return acimaDoLimiar(
    { code: 'back-rank', confidence: limitar(confianca, 0.9), detalhe },
    config.backRank.limiarConfianca,
  )
}

// ------------------------------------------------------------- mate perdido

/** Primeiro mate em um lance encontrado na posição, em UCI. */
function mateEmUm(fen: string): string | null {
  for (const move of legalMoves(fen)) {
    if (move.isCheckmate) return move.uci
  }
  return null
}

/** Mate em dois: um xeque nosso a que toda resposta permite mate em um. */
function mateEmDois(fen: string): string | null {
  for (const move of legalMoves(fen)) {
    if (!move.isCheck || move.isCheckmate) continue
    const aplicado = applyMove(fen, move.uci)
    if (!aplicado) continue
    const respostas = legalMoves(aplicado.fenAfter)
    if (respostas.length === 0) continue
    const sempreMate = respostas.every((resposta) => {
      const depois = applyMove(aplicado.fenAfter, resposta.uci)
      return depois ? mateEmUm(depois.fenAfter) !== null : false
    })
    if (sempreMate) return move.uci
  }
  return null
}

/** Havia mate forçado curto e ele não foi jogado. */
export function detectMissedMate(
  fenBefore: string,
  userMoveUci: string,
  bestMoveUci: string,
  config: DetectorConfig = DETECTOR_CONFIG,
): DetectorResult | null {
  const ctx = preparar(fenBefore, userMoveUci, bestMoveUci)
  if (!ctx) return null
  if (ctx.lanceUsuario.isCheckmate) return null

  const emUm = mateEmUm(fenBefore)
  if (emUm) {
    return acimaDoLimiar(
      { code: 'missed-mate', confidence: 0.95, detalhe: `havia mate em um lance com ${emUm}` },
      config.missedMate.limiarConfianca,
    )
  }

  if (config.missedMate.profundidadeMax < 2) return null

  const emDois = mateEmDois(fenBefore)
  if (!emDois) return null

  return acimaDoLimiar(
    { code: 'missed-mate', confidence: 0.85, detalhe: `havia mate em dois lances com ${emDois}` },
    config.missedMate.limiarConfianca,
  )
}

// ------------------------------------------------------- segurança do rei

/** Ataques adversários menos defesas próprias sobre a zona do rei. */
function exposicao(board: Board, zona: string[], usuario: PieceColor, adversario: PieceColor) {
  const conta = (cor: PieceColor): number =>
    piecesOf(board, cor).reduce(
      (total, peca) =>
        total + attacksFrom(board, peca.square).filter((casa) => zona.includes(casa)).length,
      0,
    )

  const atacantes = piecesOf(board, adversario).filter((peca) =>
    attacksFrom(board, peca.square).some((casa) => zona.includes(casa)),
  )

  return { valor: conta(adversario) - conta(usuario), atacantes: atacantes.length }
}

/** O lance abriu o próprio rei de forma taticamente explorável. */
export function detectKingSafety(
  fenBefore: string,
  userMoveUci: string,
  bestMoveUci: string,
  config: DetectorConfig = DETECTOR_CONFIG,
): DetectorResult | null {
  const ctx = preparar(fenBefore, userMoveUci, bestMoveUci)
  if (!ctx) return null
  // Se o próprio rei se mexeu, a zona muda de lugar e a comparação perde sentido.
  if (ctx.lanceUsuario.piece === 'k') return null

  const zona = kingZone(ctx.depoisUsuario, ctx.usuario)
  if (zona.length === 0) return null

  const antes = exposicao(ctx.antes, zona, ctx.usuario, ctx.adversario)
  const depois = exposicao(ctx.depoisUsuario, zona, ctx.usuario, ctx.adversario)
  const delta = depois.valor - antes.valor
  if (delta <= 0 || depois.atacantes === 0) return null

  const abrigoAberto = ctx.lanceUsuario.piece === 'p' && zona.includes(ctx.lanceUsuario.from)
  const confianca =
    0.45 + 0.1 * delta + (abrigoAberto ? 0.15 : 0) + (depois.atacantes >= 2 ? 0.1 : 0)

  return acimaDoLimiar(
    {
      code: 'king-safety',
      confidence: limitar(confianca, 0.9),
      detalhe: `a zona do rei em ${kingSquare(ctx.depoisUsuario, ctx.usuario) ?? '?'} ficou mais exposta`,
    },
    config.kingSafety.limiarConfianca,
  )
}

// ------------------------------------------------------------------ conjunto

const DETECTORES = [
  detectMissedMate,
  detectHangingPiece,
  detectMissedCapture,
  detectFork,
  detectPin,
  detectBackRank,
  detectKingSafety,
] as const

/**
 * Roda todos os detectores e devolve o que sobreviveu ao limiar, ordenado por
 * confiança decrescente. Ordem estável: empate desempata pelo código.
 */
export function runDetectors(
  fenBefore: string,
  userMoveUci: string,
  bestMoveUci: string,
  config: DetectorConfig = DETECTOR_CONFIG,
): DetectorResult[] {
  const resultados: DetectorResult[] = []

  for (const detector of DETECTORES) {
    const resultado = detector(fenBefore, userMoveUci, bestMoveUci, config)
    if (resultado) resultados.push(resultado)
  }

  return resultados.sort((a, b) => b.confidence - a.confidence || a.code.localeCompare(b.code))
}
