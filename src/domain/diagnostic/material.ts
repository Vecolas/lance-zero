/**
 * Saldo de material FORÇADO depois de um lance, com resolução de capturas.
 *
 * POR QUE EXISTE: o diagnóstico afirma "este lance ganha material". Sem código
 * que saiba conferir isso, a afirmação é opinião de quem escreveu o conteúdo, e
 * um item com resposta errada não aparece em lugar nenhum — ele só mede errado,
 * em silêncio, e o aluno recebe uma primeira semana montada sobre um número
 * inventado. Esta busca é o que torna o item CONFERÍVEL pelo portão.
 *
 * O QUE ELA PROVA: depois do lance do aluno, para TODA resposta do adversário,
 * e resolvidas as capturas seguintes, o saldo material do aluno subiu pelo
 * menos X. Ou seja, o ganho não depende de o adversário colaborar.
 *
 * O QUE ELA NÃO PROVA, declarado para ninguém supor o contrário:
 *
 * - que o lance é o MELHOR da posição — só que ele cumpre o objetivo;
 * - ganho que só aparece depois de um lance QUIETO (não-captura) do aluno. A
 *   resolução só olha capturas depois da resposta do adversário. Uma cravada
 *   que se cobra com um avanço de peão no lance seguinte é invisível aqui — e
 *   por isso o banco de posições não usa este objetivo para esse tipo de tema;
 * - valor de empate. Empate no meio da linha é avaliado pelo material que está
 *   no tabuleiro, e não como "meio ponto".
 *
 * A resolução de capturas usa `standPat` dos dois lados: cada lado pode PARAR
 * de capturar quando parar for melhor. É a aproximação padrão de quiescência, e
 * ela pode superestimar o ganho em posições onde a melhor continuação é uma
 * ameaça quieta. Limitação aceita e declarada.
 *
 * `PIECE_VALUES` vem de `@/domain/games/board` de propósito: uma segunda tabela
 * de valores aqui seria a segunda fonte da mesma verdade, e as duas divergiriam
 * no dia em que alguém recalibrasse uma delas.
 */

import { PIECE_VALUES, attacksFrom, parseBoard, piecesOf } from '@/domain/games/board'
import { applyMove, legalMoves, normalizeUci, parseUci, positionStatus } from '@/lib/chess'
import type { Side } from '@/domain/types'

/**
 * Limites da busca.
 *
 * `profundidadeDeCapturas` é LIMITE DE DESIGN, não botão de ajuste: a busca
 * roda dentro de um portão de teste e é exponencial no número de capturas
 * disponíveis. Três meios-lances cobrem o que o banco precisa — a captura do
 * aluno, a recaptura do adversário e a re-recaptura — e foram MEDIDOS: com
 * oito, um item de abertura levava minutos e o portão virava algo que ninguém
 * roda. Subir isto exige medir o tempo do portão antes, não depois.
 *
 * `saldoDeMate` é o valor atribuído ao mate. Precisa ser maior que qualquer
 * saldo material possível para que dar mate nunca perca para ganhar uma dama.
 */
export const MATERIAL_CONFIG = {
  profundidadeDeCapturas: 3,
  saldoDeMate: 1_000_000,
} as const

export type MaterialConfig = Record<keyof typeof MATERIAL_CONFIG, number>

const OUTRO_LADO: Record<Side, Side> = { w: 'b', b: 'w' }

/**
 * Material do lado informado, em centipeões, contando a diferença.
 *
 * O rei fica de fora: os dois lados sempre têm um, então ele só somaria e
 * subtrairia o mesmo número — e o valor artificialmente alto de `PIECE_VALUES.k`
 * pouparia trocas que aqui não existem.
 */
export function saldoMaterial(fen: string, lado: Side): number {
  let total = 0
  for (const peca of parseBoard(fen).values()) {
    if (peca.type === 'k') continue
    total += peca.color === lado ? PIECE_VALUES[peca.type] : -PIECE_VALUES[peca.type]
  }
  return total
}

/**
 * Quanto material o aluno ganha, no mínimo, jogando `uci`.
 *
 * Devolve `null` quando o lance é ilegal na posição — erro de quem escreveu o
 * conteúdo, e o portão quer relatar TODOS os itens quebrados em vez de parar no
 * primeiro. Por isso é valor de retorno e não exceção.
 *
 * O número é a VARIAÇÃO em relação à posição inicial: 0 significa "nada mudou",
 * positivo significa ganho do aluno.
 */
export function saldoForcadoApos(
  fen: string,
  ladoDoAluno: Side,
  uci: string,
  config: MaterialConfig = MATERIAL_CONFIG,
): number | null {
  const entrada = parseUci(normalizeUci(uci))
  if (entrada === null) return null
  const aplicado = applyMove(fen, entrada)
  if (aplicado === null) return null
  if (aplicado.move.color !== ladoDoAluno) return null

  const base = saldoMaterial(fen, ladoDoAluno)
  const depois = aplicado.fenAfter
  const estado = positionStatus(depois)

  if (estado.isCheckmate) return config.saldoDeMate
  // Empate imediato não é ganho de material, mesmo que o lance tenha capturado
  // algo no caminho. Sem esta linha, um lance que come a dama e afoga o rei
  // adversário passaria como "ganha 900".
  if (estado.isGameOver) return 0

  let pior = Number.POSITIVE_INFINITY
  for (const resposta of legalMoves(depois)) {
    const aplicada = applyMove(depois, {
      from: resposta.from,
      to: resposta.to,
      promotion: resposta.promotion,
    })
    if (aplicada === null) {
      throw new Error(`Lance legal virou ilegal ao ser reaplicado: ${resposta.uci} em ${depois}`)
    }
    // ALFA-BETA já a partir daqui: o valor deste nó é o MENOR entre as
    // respostas, então qualquer ramo que já prove valer `pior` ou mais não
    // muda o resultado e pode ser abandonado. A poda não altera o número
    // devolvido — só o tempo — e sem ela o portão do banco levava minutos por
    // item de abertura.
    const valor = resolverCapturas(
      aplicada.fenAfter,
      ladoDoAluno,
      config.profundidadeDeCapturas,
      config,
      Number.NEGATIVE_INFINITY,
      pior,
    )
    if (valor < pior) pior = valor
  }

  // Posição sem resposta legal já foi tratada acima por `isGameOver`.
  if (!Number.isFinite(pior)) {
    throw new Error(`Posição sem lances legais escapou da checagem de fim de jogo: ${depois}`)
  }

  return pior - base
}

/**
 * Valor material do aluno depois de resolvidas as capturas pendentes.
 *
 * Devolve o material ABSOLUTO (não a variação) porque a recursão precisa
 * comparar posições entre si, e a variação depende de uma origem que muda a
 * cada nó.
 *
 * `alfa` e `beta` são a janela de alfa-beta, sempre na perspectiva do ALUNO.
 * Com a janela completa (`-Infinity`, `+Infinity`) o resultado é exato; a poda
 * só descarta ramos que não podem mudar o valor do nó pai.
 */
function resolverCapturas(
  fen: string,
  ladoDoAluno: Side,
  profundidade: number,
  config: MaterialConfig,
  alfa: number,
  beta: number,
): number {
  const parado = saldoMaterial(fen, ladoDoAluno)

  // ATALHO BARATO, e ele precisa ser CONSERVADOR: só pula a geração de lances
  // quando NENHUMA captura é geometricamente possível. Ataque geométrico é um
  // superconjunto de captura legal (cravada e xeque só tiram lances), então
  // "não há captura possível" aqui implica "não há captura legal" lá — a
  // exceção é o en passant, tratada dentro de `podeHaverCaptura`.
  if (profundidade <= 0 || !podeHaverCaptura(fen)) return parado

  const estado = positionStatus(fen)
  if (estado.isCheckmate) {
    return estado.turn === ladoDoAluno ? -config.saldoDeMate : config.saldoDeMate
  }
  if (estado.isGameOver) return parado

  const maximiza = estado.turn === ladoDoAluno

  // `standPat`: cada lado pode PARAR de capturar quando parar for melhor. É a
  // aproximação padrão de quiescência e está declarada no cabeçalho.
  let melhor = parado
  let a = alfa
  let b = beta
  if (maximiza) {
    if (melhor >= b) return melhor
    if (melhor > a) a = melhor
  } else {
    if (melhor <= a) return melhor
    if (melhor < b) b = melhor
  }

  for (const lance of capturasOrdenadas(fen)) {
    const aplicado = applyMove(fen, {
      from: lance.from,
      to: lance.to,
      promotion: lance.promotion,
    })
    if (aplicado === null) {
      throw new Error(`Lance legal virou ilegal ao ser reaplicado: ${lance.uci} em ${fen}`)
    }
    const valor = resolverCapturas(aplicado.fenAfter, ladoDoAluno, profundidade - 1, config, a, b)
    if (maximiza) {
      if (valor > melhor) melhor = valor
      if (melhor >= b) break
      if (melhor > a) a = melhor
    } else {
      if (valor < melhor) melhor = valor
      if (melhor <= a) break
      if (melhor < b) b = melhor
    }
  }

  return melhor
}

/**
 * Capturas da posição, da presa mais valiosa para a menos valiosa.
 *
 * A ordem NÃO muda o resultado — a busca é exaustiva dentro da janela — só a
 * velocidade com que a poda encontra o corte.
 */
function capturasOrdenadas(fen: string) {
  return legalMoves(fen)
    .filter((lance) => lance.isCapture)
    .sort(
      (x, y) =>
        (y.captured ? PIECE_VALUES[y.captured] : 0) - (x.captured ? PIECE_VALUES[x.captured] : 0) ||
        x.uci.localeCompare(y.uci),
    )
}

/**
 * Existe alguma captura geometricamente possível para quem tem a vez?
 *
 * Filtro barato: lê o tabuleiro do FEN e pergunta se alguma peça do lado que
 * joga alcança uma peça adversária. Não olha legalidade — de propósito, porque
 * ele só precisa ser um SUPERCONJUNTO das capturas legais para o atalho ser
 * seguro.
 *
 * O en passant é a única captura que não aparece na geometria das peças, então
 * a presença da casa de en passant no FEN já devolve `true` sem olhar mais nada.
 */
function podeHaverCaptura(fen: string): boolean {
  const campos = fen.trim().split(/\s+/)
  const vez = campos[1] === 'b' ? 'b' : 'w'
  if (campos[3] !== undefined && campos[3] !== '-') return true

  const board = parseBoard(fen)
  for (const peca of piecesOf(board, vez)) {
    for (const casa of attacksFrom(board, peca.square)) {
      const alvo = board.get(casa)
      if (alvo !== undefined && alvo.color !== vez) return true
    }
  }
  return false
}

/** O lado que não é `lado`. Existe para ninguém escrever o ternário duas vezes. */
export function adversarioDe(lado: Side): Side {
  return OUTRO_LADO[lado]
}
