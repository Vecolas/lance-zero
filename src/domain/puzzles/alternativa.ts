/**
 * Julgamento de solução ALTERNATIVA num puzzle.
 *
 * O dump do Lichess guarda UMA linha de solução. `ATTEMPT_CONFIG.aceitarMate-
 * Alternativo` já resolve o caso do mate fora da linha; o que sobra é o lance
 * igualmente vencedor que NÃO dá mate e que hoje é carimbado como erro. O custo
 * disso não é só o "errou" injusto: o app ainda cria um cartão de revisão e
 * manda o jogador treinar de novo um padrão que ele já domina. O feedback
 * honesto é o diferencial do produto — errar aqui mina justamente ele.
 *
 * DECISÃO QUE ESTE ARQUIVO CARREGA: o julgamento é feito em DUAS ETAPAS, e a
 * primeira não custa nada.
 *
 * 1. `valeConsultarEngine` é pura e decide se o lance recusado merece o preço
 *    de uma análise. O caminho de erro é o caminho comum num puzzle — se todo
 *    lance errado disparasse engine, o treino ficaria lento para punir quem
 *    erra. Lance claramente quieto e sem indício de ganho não é analisado.
 * 2. `julgarAlternativa` compara as duas posições resultantes com uma função de
 *    avaliação INJETADA. O domínio não conhece worker, não instancia engine e
 *    não sabe se a avaliação veio de Stockfish, de cache ou de um duble.
 *
 * A curva que converte centipeões em pontuação esperada é a de
 * `@/domain/games/severity`, reusada e não recriada: duas curvas para a mesma
 * verdade divergem, e a divergência não dá erro.
 *
 * NA DÚVIDA, `indeterminado`. Nunca `equivalente`. Avaliação faltando, função
 * que lançou ou comparação não confiável NÃO viram "o jogador acertou" — mas
 * também não viram erro silencioso: o veredito é explícito e quem chama é
 * obrigado pela assinatura a tratar os três casos.
 *
 * PONTO CEGO DECLARADO: `captureGain` lê o material do quadrado de destino no
 * tabuleiro ANTES do lance, então captura en passant aparece como ganho zero
 * (o peão capturado não está no destino). Uma alternativa que seja en passant
 * quieto e sem ameaça não chega à segunda etapa.
 */

import { applyMove, isValidFen } from '@/lib/chess'
import { PIECE_VALUES, captureGain, parseBoard, worstHangingPiece } from '@/domain/games/board'
import { SEVERITY_CONFIG, moveLossPp, type EvalScore } from '@/domain/games/severity'
import type { AttemptState } from './attempt'
import { normalizeUci, parseUci } from './parser'

/**
 * Critérios e limiares do julgamento de alternativa.
 *
 * ATENÇÃO: são HEURÍSTICAS DE PRODUTO, nenhuma calibrada empiricamente. Estão
 * aqui, e não espalhadas pelo código, porque são exatamente os números que
 * alguém vai querer girar numa sessão de ajuste.
 */
export interface AlternativaConfig {
  /** O que faz um lance recusado valer o custo de uma análise. */
  consulta: {
    /** Xeque força a resposta e é onde mora a maioria das linhas vencedoras. */
    xeque: boolean
    /** Promoção muda o material de forma decisiva; quase nunca é lance neutro. */
    promocao: boolean
    /**
     * Ganho mínimo, em centipeões, para uma CAPTURA valer consulta.
     *
     * Zero de propósito: toda captura vale. O sacrifício correto — captura com
     * ganho aparente negativo — é justamente o caso que esta issue existe para
     * parar de recusar. Uma análise a mais custa menos que dizer "errou" para o
     * lance certo. Suba isto se o custo de engine incomodar em telemetria.
     */
    capturaGanhoMinimoCp: number
    /**
     * Ganho mínimo AMEAÇADO, em centipeões, para um lance QUIETO valer consulta.
     *
     * Medido como o quanto o lance AUMENTA o material pendurado do adversário:
     * ameaça que já existia antes não foi criada por este lance. 300 = uma peça
     * menor, o menor ganho que costuma decidir um puzzle de ~1100.
     */
    ameacaGanhoMinimoCp: number
  }
  /**
   * Perda máxima, em pontos percentuais de pontuação esperada, para chamar a
   * alternativa de equivalente. A comparação é ESTRITA: perda igual ao limiar
   * já é `pior`.
   *
   * Deriva da banda de imprecisão da severidade em vez de repetir o número:
   * "perda abaixo da banda de imprecisão" é a MESMA verdade nos dois lugares, e
   * duas cópias divergiriam na primeira recalibração.
   */
  toleranciaPp: number
}

export const ALTERNATIVA_CONFIG: AlternativaConfig = {
  consulta: {
    xeque: true,
    promocao: true,
    capturaGanhoMinimoCp: 0,
    ameacaGanhoMinimoCp: PIECE_VALUES.n,
  },
  toleranciaPp: SEVERITY_CONFIG.bandas.imprecisaoMinPp,
}

/** Por que o lance recusado merece — ou não — uma análise. */
export type MotivoConsulta =
  | 'formato-invalido'
  | 'posicao-invalida'
  | 'lance-ilegal'
  | 'lance-esperado'
  | 'sem-indicio-de-ganho'
  | 'captura'
  | 'xeque'
  | 'promocao'
  | 'ameaca-material'

export interface DecisaoDeConsulta {
  vale: boolean
  motivo: MotivoConsulta
  /**
   * Ganho material estimado, em centipeões, que motivou a decisão. Zero quando
   * o motivo não foi material. Existe para a decisão nascer MEDÍVEL: sem isto,
   * girar os limiares acima seria discutir gosto.
   */
  ganhoCp: number
}

/** Material que `lado` tem pendurado, do ponto de vista de quem pode capturar. */
function materialPenduradoCp(fen: string, lado: 'w' | 'b'): number {
  return worstHangingPiece(parseBoard(fen), lado)?.gain ?? 0
}

/**
 * Decide se um lance recusado merece o custo de uma análise. Pura: sem engine,
 * sem relógio, sem aleatoriedade.
 *
 * Só olha o tabuleiro. Um lance sem nenhum indício de ganho — sem captura, sem
 * xeque, sem promoção e sem ameaça material nova — é recusado de graça.
 */
export function valeConsultarEngine(
  state: AttemptState,
  uci: string,
  config: AlternativaConfig = ALTERNATIVA_CONFIG,
): DecisaoDeConsulta {
  const lance = normalizeUci(uci)
  const entrada = parseUci(lance)
  if (entrada === null) return { vale: false, motivo: 'formato-invalido', ganhoCp: 0 }

  // `esperado` é `undefined` quando a linha já acabou; aí nenhum lance é o
  // esperado e os critérios abaixo decidem sozinhos.
  const esperado = state.solvable.solutionUci[state.solutionIndex]
  if (esperado !== undefined && lance === normalizeUci(esperado)) {
    return { vale: false, motivo: 'lance-esperado', ganhoCp: 0 }
  }

  // Posição podre é dado quebrado, não lance ruim do jogador: dizer
  // 'lance-ilegal' aqui seria acusar o jogador de um defeito nosso.
  if (!isValidFen(state.currentFen)) return { vale: false, motivo: 'posicao-invalida', ganhoCp: 0 }

  const aplicado = applyMove(state.currentFen, entrada)
  if (aplicado === null) return { vale: false, motivo: 'lance-ilegal', ganhoCp: 0 }

  const { move, fenAfter } = aplicado
  const adversario = move.color === 'w' ? 'b' : 'w'

  if (config.consulta.promocao && move.isPromotion) {
    return { vale: true, motivo: 'promocao', ganhoCp: 0 }
  }

  if (config.consulta.xeque && move.isCheck) {
    return { vale: true, motivo: 'xeque', ganhoCp: 0 }
  }

  const tabuleiroAntes = parseBoard(state.currentFen)
  const ganhoDaCaptura = move.isCapture ? captureGain(tabuleiroAntes, move.to, move.color) : 0
  if (move.isCapture && ganhoDaCaptura >= config.consulta.capturaGanhoMinimoCp) {
    return { vale: true, motivo: 'captura', ganhoCp: ganhoDaCaptura }
  }

  // Ameaça CRIADA pelo lance: o que já estava pendurado antes não conta.
  const ameacaCriada =
    materialPenduradoCp(fenAfter, adversario) - materialPenduradoCp(state.currentFen, adversario)
  if (ameacaCriada >= config.consulta.ameacaGanhoMinimoCp) {
    return { vale: true, motivo: 'ameaca-material', ganhoCp: ameacaCriada }
  }

  return {
    vale: false,
    motivo: 'sem-indicio-de-ganho',
    ganhoCp: Math.max(ganhoDaCaptura, ameacaCriada, 0),
  }
}

export type VereditoAlternativa = 'equivalente' | 'pior' | 'indeterminado'

/** Por que não deu para comparar. Preenchido só quando o veredito é `indeterminado`. */
export type MotivoIndeterminado =
  | 'fen-invalido'
  | 'lance-do-jogador-ilegal'
  | 'lance-esperado-ilegal'
  | 'avaliacao-falhou'
  | 'avaliacao-ausente'
  | 'avaliacao-nao-confiavel'

export interface JulgamentoAlternativa {
  veredito: VereditoAlternativa
  /**
   * Perda do lance do jogador em relação à linha do dataset, em pontos
   * percentuais de pontuação esperada. Nunca negativa: alternativa MELHOR que a
   * linha é perda zero.
   *
   * `NaN` quando o veredito é `indeterminado`. É de propósito: qualquer
   * comparação com `NaN` é falsa, então quem esquecer de olhar o veredito não
   * lê "sem perda" por acidente. Zero ali seria uma mentira silenciosa.
   */
  margemPp: number
  motivo?: MotivoIndeterminado
}

/** Avaliação de uma posição, na perspectiva de quem joga nela. */
export type AvaliarPosicao = (fen: string) => Promise<EvalScore>

export interface JulgarAlternativaInput {
  /** Posição com o jogador a jogar. */
  fenAntes: string
  uciDoJogador: string
  /** Lance que o dataset esperava nesta posição. */
  uciEsperado: string
  /** Injetada. O domínio não instancia engine nem conhece worker. */
  avaliar: AvaliarPosicao
  config?: AlternativaConfig
}

function indeterminado(motivo: MotivoIndeterminado): JulgamentoAlternativa {
  return { veredito: 'indeterminado', margemPp: Number.NaN, motivo }
}

function fenDepois(fen: string, uci: string): string | null {
  const entrada = parseUci(normalizeUci(uci))
  if (entrada === null) return null
  return applyMove(fen, entrada)?.fenAfter ?? null
}

/** A avaliação diz alguma coisa? `null` nos dois campos é ausência, não empate. */
function temConteudo(score: EvalScore): boolean {
  return score.mateIn !== null || score.scoreCp !== null
}

/**
 * A avaliação é comparável?
 *
 * `mateIn: 0` não tem lado (nem positivo nem negativo) e `scoreCp` não finito
 * atravessaria a curva logística sem reclamar. Os dois viram `indeterminado`
 * em vez de virarem um número que parece resposta.
 */
function eConfiavel(score: EvalScore): boolean {
  if (score.mateIn === 0) return false
  if (score.scoreCp !== null && !Number.isFinite(score.scoreCp)) return false
  return true
}

/**
 * Espelha a perspectiva de uma avaliação.
 *
 * `expectedScoreFromEval(inverterPerspectiva(s))` é `1 - expectedScoreFrom-
 * Eval(s)`: a logística é simétrica e mate a favor vira mate contra.
 */
export function inverterPerspectiva(score: EvalScore): EvalScore {
  return {
    scoreCp: score.scoreCp === null ? null : -score.scoreCp,
    mateIn: score.mateIn === null ? null : -score.mateIn,
  }
}

/**
 * Compara a posição depois do lance do jogador com a posição depois do lance
 * esperado e diz se a alternativa é igualmente boa.
 *
 * PERSPECTIVA: as duas posições têm o ADVERSÁRIO a jogar, então as duas
 * avaliações chegam na perspectiva dele. A inversão acontece num lugar só —
 * dentro de `moveLossPp`, que já é o dono dessa conta. Passar a avaliação da
 * linha esperada invertida faz `moveLossPp` calcular exatamente
 * "pontuação do jogador com a linha do dataset menos pontuação do jogador com o
 * lance dele".
 *
 * Nunca lança: `avaliar` é código de fora e pode cair.
 */
export async function julgarAlternativa({
  fenAntes,
  uciDoJogador,
  uciEsperado,
  avaliar,
  config = ALTERNATIVA_CONFIG,
}: JulgarAlternativaInput): Promise<JulgamentoAlternativa> {
  if (!isValidFen(fenAntes)) return indeterminado('fen-invalido')

  const fenDoJogador = fenDepois(fenAntes, uciDoJogador)
  if (fenDoJogador === null) return indeterminado('lance-do-jogador-ilegal')

  const fenEsperado = fenDepois(fenAntes, uciEsperado)
  if (fenEsperado === null) return indeterminado('lance-esperado-ilegal')

  // Mesma posição resultante: não há o que comparar, e não se paga engine por isso.
  if (fenDoJogador === fenEsperado) return { veredito: 'equivalente', margemPp: 0 }

  let avaliacaoDoJogador: EvalScore
  let avaliacaoEsperada: EvalScore
  try {
    // Em série: a engine analisa uma posição por vez, e se a primeira cair a
    // segunda não chega a ser pedida.
    avaliacaoDoJogador = await avaliar(fenDoJogador)
    avaliacaoEsperada = await avaliar(fenEsperado)
  } catch {
    return indeterminado('avaliacao-falhou')
  }

  if (!temConteudo(avaliacaoDoJogador) || !temConteudo(avaliacaoEsperada)) {
    return indeterminado('avaliacao-ausente')
  }

  if (!eConfiavel(avaliacaoDoJogador) || !eConfiavel(avaliacaoEsperada)) {
    return indeterminado('avaliacao-nao-confiavel')
  }

  const margemPp = moveLossPp(inverterPerspectiva(avaliacaoEsperada), avaliacaoDoJogador)

  return {
    veredito: margemPp < config.toleranciaPp ? 'equivalente' : 'pior',
    margemPp,
  }
}
