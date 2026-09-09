/**
 * Gerador do conjunto inicial de puzzles do LanceZero.
 *
 * Rode com: node scripts/content/gen-starter-puzzles.mjs
 * A saída em CSV vai para src/content/puzzles/starter.ts.
 *
 * POR QUE ESTE SCRIPT EXISTE: o dump oficial do Lichess tem milhões de linhas e
 * não pode ser baixado no navegador nem versionado aqui. Até o pipeline de
 * ingestão da Fase 3 rodar, o app precisa de um punhado de puzzles corretos
 * para a tela funcionar. Este script GERA e VERIFICA cada um com chess.js, em
 * vez de escrever posições à mão e torcer para estarem certas.
 *
 * O formato de saída é o mesmo do dump do Lichess, de propósito: assim o app
 * exercita o parser de verdade, e trocar este conjunto pelo dataset real é só
 * trocar a fonte do texto.
 */

import { Chess } from 'chess.js'

/**
 * Gera puzzles no formato do dump do Lichess a partir de posições base.
 * Para cada FEN base (adversário no lance), procura um lance do adversário
 * depois do qual EXISTE mate em 1 ou ganho de material limpo para o jogador.
 * Assim a semântica sai correta por construção: FEN é antes do lance
 * preparatório, moves[0] é esse lance.
 */

const VALOR = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

function uci(m) {
  return `${m.from}${m.to}${m.promotion ?? ''}`
}

function mateEm1(fen) {
  const c = new Chess(fen)
  for (const m of c.moves({ verbose: true })) {
    const p = new Chess(fen)
    p.move({ from: m.from, to: m.to, promotion: m.promotion })
    if (p.isCheckmate()) return uci(m)
  }
  return null
}

/** Captura que ganha material e não é recapturada com lucro para o adversário. */
function ganhoLimpo(fen, minimo = 3) {
  const c = new Chess(fen)
  let melhor = null
  for (const m of c.moves({ verbose: true })) {
    if (!m.captured) continue
    const ganho = VALOR[m.captured]
    if (ganho < minimo) continue
    const p = new Chess(fen)
    p.move({ from: m.from, to: m.to, promotion: m.promotion })
    // A peça que capturou pode ser recapturada?
    const recaptura = p
      .moves({ verbose: true })
      .filter((r) => r.to === m.to)
      .map((r) => VALOR[r.captured ?? 'p'])
    const perda = recaptura.length > 0 ? VALOR[m.piece] : 0
    const saldo = ganho - perda
    if (saldo >= minimo && (melhor === null || saldo > melhor.saldo)) {
      melhor = { uci: uci(m), saldo }
    }
  }
  return melhor
}

const BASES = [
  { fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1', temas: ['backRankMate', 'mateIn1'], rating: 800 },
  { fen: '7k/6pp/8/8/8/8/6PP/3R2K1 b - - 0 1', temas: ['backRankMate', 'mateIn1'], rating: 850 },
  { fen: 'r5k1/5ppp/8/8/8/7Q/5PPP/6K1 b - - 0 1', temas: ['mateIn1'], rating: 900 },
  { fen: '2r3k1/5ppp/8/8/8/8/5PPP/2R3K1 b - - 0 1', temas: ['hangingPiece'], rating: 1000 },
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 2',
    temas: ['hangingPiece'],
    rating: 1050,
  },
  {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 0 3',
    temas: ['mateIn1'],
    rating: 950,
  },
  { fen: '5rk1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1', temas: ['hangingPiece'], rating: 1100 },
  {
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 5',
    temas: ['hangingPiece', 'fork'],
    rating: 1150,
  },
  { fen: '8/8/8/8/8/5K1k/8/6RQ b - - 0 1', temas: ['mateIn1'], rating: 750 },
  { fen: 'r4rk1/ppp2ppp/8/8/8/8/PPP2PPP/R4RK1 b - - 0 1', temas: ['hangingPiece'], rating: 1200 },
  {
    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 0 3',
    temas: [],
    rating: 900,
  },
  { fen: '6k1/5p1p/6p1/8/8/6P1/5P1P/1R4K1 b - - 0 1', temas: [], rating: 1000 },
  {
    fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 b - - 0 6',
    temas: [],
    rating: 1250,
  },
  { fen: '4r1k1/5ppp/8/8/8/8/5PPP/2R3K1 b - - 0 1', temas: [], rating: 1050 },
  { fen: '2kr3r/ppp2ppp/8/8/8/8/PPP2PPP/2KR3R b - - 0 1', temas: [], rating: 1150 },
]

const saida = []
for (const base of BASES) {
  const c = new Chess(base.fen)
  for (const setup of c.moves({ verbose: true })) {
    const p = new Chess(base.fen)
    p.move({ from: setup.from, to: setup.to, promotion: setup.promotion })
    const depois = p.fen()
    if (p.isGameOver()) continue

    const mate = mateEm1(depois)
    const ganho = mate ? null : ganhoLimpo(depois)
    const solucao = mate ?? ganho?.uci
    if (!solucao) continue

    // O tema sai do que foi DETECTADO, não do palpite da base.
    const temas = new Set(base.temas)
    if (mate) {
      temas.add('mateIn1')
      temas.delete('hangingPiece')
      const linha = depois.split(' ')[0].split('/')
      const oitava = p.turn() === 'w' ? linha[0] : linha[7]
      if (/[rq]/i.test(oitava)) temas.add('backRankMate')
    } else {
      temas.add('hangingPiece')
      temas.delete('mateIn1')
      temas.delete('backRankMate')
    }

    saida.push({
      fen: base.fen,
      setup: uci(setup),
      solucao,
      tipo: mate ? 'mate' : `ganho+${ganho.saldo}`,
      ladoQueResolve: p.turn(),
      temas: [...temas],
      rating: base.rating,
    })
    break
  }
}

console.log(JSON.stringify(saida, null, 1))
console.log('gerados:', saida.length, 'de', BASES.length, 'bases')

// Emite no formato exato do dump do Lichess, para o app usar o mesmo parser.
const csv = saida.map((p, i) => {
  const id = `LZ${String(i + 1).padStart(4, '0')}`
  const moves = `${p.setup} ${p.solucao}`
  return [id, p.fen, moves, p.rating, 75, 90, 500, p.temas.join(' '), '', ''].join(',')
})
console.log('--- CSV ---')
console.log(csv.join('\n'))
