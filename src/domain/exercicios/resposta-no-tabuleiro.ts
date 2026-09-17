/**
 * COMO UM LANCE JOGADO NO TABULEIRO VIRA UMA RESPOSTA PEDAGÓGICA.
 *
 * A REGRA CENTRAL DO PLANO: se a pergunta pode ser respondida com um lance, a
 * resposta acontece no tabuleiro. Nunca por botão com notação.
 *
 * O que estava errado não era só a interface. A lição perguntava "qual peça
 * você deve capturar?" e oferecia `[Rxc6] [Rxd5] [Qxd4]` — e aí o aluno não
 * resolve a posição: ele lê três strings e escolhe uma. Dá para acertar sem
 * localizar a peça no tabuleiro, sem ver de onde ela é atacada, e sem nunca
 * executar o movimento. A evidência de aprendizado vira "clicou no botão certo".
 *
 * AS DUAS PERGUNTAS SÃO SEPARADAS, e essa separação é o arquivo inteiro:
 *
 *   1. LEGALIDADE — "este lance pode ser jogado nesta posição?" É `chess.js`,
 *      é objetivo, e não tem nada de pedagógico. Lance ilegal volta atrás
 *      (snapback) e NÃO conta como erro conceitual: o aluno arrastou para o
 *      lugar errado, não entendeu errado.
 *
 *   2. PEDAGOGIA — "este lance responde ao que a lição está ensinando?" É a
 *      chave de correção do exercício.
 *
 * Misturar as duas é o defeito clássico: um arraste torto vira "você errou o
 * conceito", a escada de dicas avança sozinha, e o aluno é punido por um
 * tremor no mouse.
 *
 * MÚLTIPLOS LANCES VÁLIDOS. `lancesAceitos` já é uma lista, e continua sendo:
 * se duas capturas ganham a mesma peça, as duas respondem ao conceito. Marcar a
 * segunda como erro seria ensinar que existe uma sequência decorada quando o
 * objetivo admite alternativas.
 */

import { applyMove, normalizeUci, parseUci } from '@/lib/chess'
import type { PromotionPiece, SquareName } from '@/lib/chess'
import type { ExercicioPosicional } from './exercicio'
import { formasDoLance, PROMOCAO_PADRAO } from './lances'

/**
 * O que aconteceu quando o aluno soltou a peça.
 *
 * `ilegal` é deliberadamente o PRIMEIRO caso e o único sem consequência
 * pedagógica. Ele não carrega o lance porque não houve lance: nada foi jogado.
 */
export type RespostaNoTabuleiro =
  { tipo: 'ilegal' } | { tipo: 'correto'; uci: string } | { tipo: 'incorreto'; uci: string }

/*
  `PROMOCAO_PADRAO` E `formasDoLance` MUDARAM-SE PARA `./lances`.

  A regra da promoção passou a ter dois donos — o julgamento de um lance solto,
  aqui, e o caminhar de uma linha, em `./sequencia` — e duas cópias dela
  divergiriam na primeira correção que só uma recebesse.
*/

/** O lance responde ao que o exercício cobra? */
export function lanceResponde(exercicio: ExercicioPosicional, uci: string): boolean {
  const tentado = new Set(formasDoLance(uci))
  return exercicio.lancesAceitos.some((aceito) =>
    formasDoLance(aceito).some((forma) => tentado.has(forma)),
  )
}

/**
 * Julga um arraste.
 *
 * A ORDEM IMPORTA E É A DO PLANO: legalidade primeiro, pedagogia depois. Nunca o
 * contrário — perguntar "é o lance certo?" antes de "é um lance?" faria um
 * arraste impossível entrar na contagem de erros conceituais.
 */
export function julgarLanceDaLicao(
  exercicio: ExercicioPosicional,
  origem: SquareName,
  destino: SquareName,
  promocao?: PromotionPiece,
): RespostaNoTabuleiro {
  const uci = `${origem}${destino}${promocao ?? ''}`
  const lance = parseUci(uci)
  if (!lance) return { tipo: 'ilegal' }

  // `applyMove` é a autoridade de legalidade. Se ela recusa, não houve lance.
  const depois = applyMove(exercicio.fen, lance)
  if (!depois) {
    /*
      SEGUNDA CHANCE PARA A PROMOÇÃO.

      Um peão arrastado até a última fileira sem sufixo é ilegal como UCI e
      legal como intenção. Sem esta tentativa, o aluno arrasta, nada acontece, e
      a tela não explica nada — o pior tipo de silêncio.
    */
    if (!promocao) {
      const comDama = parseUci(`${origem}${destino}${PROMOCAO_PADRAO}`)
      if (comDama && applyMove(exercicio.fen, comDama)) {
        return julgarLanceDaLicao(exercicio, origem, destino, PROMOCAO_PADRAO)
      }
    }
    return { tipo: 'ilegal' }
  }

  const canonico = normalizeUci(uci)
  return lanceResponde(exercicio, canonico)
    ? { tipo: 'correto', uci: canonico }
    : { tipo: 'incorreto', uci: canonico }
}
