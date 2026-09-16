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

/**
 * O que aconteceu quando o aluno soltou a peça.
 *
 * `ilegal` é deliberadamente o PRIMEIRO caso e o único sem consequência
 * pedagógica. Ele não carrega o lance porque não houve lance: nada foi jogado.
 */
export type RespostaNoTabuleiro =
  { tipo: 'ilegal' } | { tipo: 'correto'; uci: string } | { tipo: 'incorreto'; uci: string }

/**
 * O sufixo de promoção implícito.
 *
 * Dama, porque é o que 99% das promoções são e porque o tabuleiro já abre o
 * seletor quando a promoção é possível — este valor só existe para o caso em
 * que o chamador não passou nenhum. Sub-promoção continua alcançável pelo
 * seletor; o que não pode é o aluno arrastar até a última fileira e o lance
 * simplesmente não acontecer.
 */
const PROMOCAO_PADRAO: PromotionPiece = 'q'

/**
 * Todas as grafias com que um lance pode chegar, para comparar com a chave.
 *
 * A REGRA É ASSIMÉTRICA, e a assimetria é o ponto:
 *
 * - SEM sufixo (`e7e8`) significa "promova, e a dama está implícita". Vale
 *   pelas duas grafias, porque o conteúdo escreve das duas formas e recusar o
 *   lance certo por causa de um sufixo é erro que o aluno não entende e o autor
 *   não vê.
 * - COM sufixo (`e7e8n`) significa AQUELA peça, e só ela. Promover a cavalo é
 *   um lance DIFERENTE de promover a dama — às vezes o único que não afoga o
 *   rei adversário. A primeira versão desta função expandia os dois lados e
 *   dava `a7a8n` como certo numa lição que pedia dama; o teste pegou.
 */
function formasDoLance(uci: string): string[] {
  const canonico = normalizeUci(uci)
  if (canonico.length === 5) return [canonico]
  return [canonico, `${canonico}${PROMOCAO_PADRAO}`]
}

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
