/**
 * Busca de mate FORÇADO, pura e limitada em profundidade.
 *
 * POR QUE EXISTE: a linha modelo de uma posição prova que o objetivo é
 * alcançável com a defesa que o autor escolheu. Para um objetivo "mate em N"
 * isso é fraco demais — mate em 2 contra uma defesa complacente não é mate em
 * 2. Esta busca fecha a lacuna: ela exige que TODA resposta do adversário caia
 * no mate dentro do prazo.
 *
 * QUEM CHAMA: hoje, apenas o portão do currículo de finais. Está declarado de
 * propósito — subsistema testado e nunca chamado é uma armadilha conhecida, e
 * conhecer o único consumidor é o que permite mudar esta função sem medo.
 *
 * LIMITE DE DESIGN (não é botão de ajuste): a busca é exponencial e roda dentro
 * de um teste unitário. Ela é honesta em qualquer profundidade, mas fica lenta
 * rápido; o teto que o currículo aceita mora em `CURRICULO_CONFIG`, junto do
 * conteúdo que o paga.
 */

import { applyMove, legalMoves, positionStatus, type LegalMove } from '@/lib/chess'
import type { Side } from '@/domain/types'
import { posicaoEhJogavel } from './legalidade'

/**
 * Existe mate forçado para `lado` em no máximo `lancesMaximos` lances dele?
 *
 * LANÇA, com mensagem própria, quando não é a vez de `lado` ou quando a posição
 * é impossível (o lado sem a vez em xeque). Os dois são erro de quem chama, e
 * devolver `false` para eles seria o desenho em que um currículo com posição
 * quebrada aparece apenas como "não tem mate" — a causa some.
 *
 * Sem esta guarda o sintoma é pior ainda: o gerador de lances devolve a captura
 * do rei e a exceção sai lá dentro do adapter, dizendo "missing black king".
 */
export function existeMateForcadoEm(fen: string, lado: Side, lancesMaximos: number): boolean {
  if (!posicaoEhJogavel(fen)) {
    throw new Error(`Posição impossível ou FEN inválido: ${fen}`)
  }
  if (positionStatus(fen).turn !== lado) {
    throw new Error(`Não é a vez de ${lado} em ${fen}`)
  }
  if (lancesMaximos < 1) {
    return false
  }
  return atacanteForcaMate(fen, lancesMaximos, new Map())
}

type Memo = Map<string, boolean>

/** Chave de memoização: a mesma posição com o mesmo prazo dá o mesmo resultado. */
function chave(fen: string, lancesRestantes: number): string {
  return `${lancesRestantes}|${fen}`
}

function atacanteForcaMate(fen: string, lancesRestantes: number, memo: Memo): boolean {
  if (lancesRestantes < 1) {
    return false
  }
  const memorizado = memo.get(chave(fen, lancesRestantes))
  if (memorizado !== undefined) {
    return memorizado
  }

  let forca = false
  for (const lance of ordenadosPorPromessa(legalMoves(fen))) {
    if (lance.isCheckmate) {
      forca = true
      break
    }
    const depois = aplicar(fen, lance)
    // Afogamento e material insuficiente não são mate: o ramo morre aqui.
    if (depois === null) {
      continue
    }
    if (!defensorEscapa(depois, lancesRestantes - 1, memo)) {
      forca = true
      break
    }
  }

  memo.set(chave(fen, lancesRestantes), forca)
  return forca
}

function defensorEscapa(fen: string, lancesRestantes: number, memo: Memo): boolean {
  const respostas = legalMoves(fen)
  if (respostas.length === 0) {
    // Invariante: `aplicar` só devolve FEN de posição NÃO terminada, então aqui
    // sempre há resposta. Devolver `true` "por segurança" deixaria uma regra
    // falsa armada para o dia em que a invariante quebrasse.
    throw new Error(`Posição sem lances chegou à busca de defesa: ${fen}`)
  }
  for (const resposta of respostas) {
    const depois = aplicar(fen, resposta)
    if (depois === null) {
      return true
    }
    if (!atacanteForcaMate(depois, lancesRestantes, memo)) {
      return true
    }
  }
  return false
}

/**
 * Aplica o lance e devolve o FEN, ou `null` se a partida terminou sem mate.
 *
 * Reaplicar um lance que `legalMoves` acabou de declarar legal é desperdício,
 * mas `@/lib/chess` ainda não devolve o FEN junto do lance e esta frente não
 * pode editá-lo — dívida declarada no relatório da entrega.
 */
function aplicar(fen: string, lance: LegalMove): string | null {
  const resultado = applyMove(fen, {
    from: lance.from,
    to: lance.to,
    promotion: lance.promotion,
  })
  if (resultado === null) {
    throw new Error(`Lance legal virou ilegal ao ser reaplicado: ${lance.uci} em ${fen}`)
  }
  return positionStatus(resultado.fenAfter).isGameOver ? null : resultado.fenAfter
}

/**
 * Xeques primeiro. Não muda o RESULTADO da busca — ela é exaustiva — só a
 * ordem em que ela encontra o mate, e encontrar cedo corta o ramo.
 */
function ordenadosPorPromessa(lances: readonly LegalMove[]): LegalMove[] {
  return [...lances].sort((a, b) => Number(b.isCheck) - Number(a.isCheck))
}
