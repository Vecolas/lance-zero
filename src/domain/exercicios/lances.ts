/**
 * COMO DUAS GRAFIAS DO MESMO LANCE SE RECONHECEM.
 *
 * Mora sozinho porque duas coisas precisam da mesma regra e não podem ter cada
 * uma a sua: o julgamento de um lance solto (`resposta-no-tabuleiro.ts`) e o
 * caminhar de uma linha (`sequencia.ts`). Duas cópias divergiriam na primeira
 * vez que alguém corrigisse só uma — e a divergência apareceria como "o app
 * recusou o lance certo", que o aluno não tem como entender.
 */

import { normalizeUci } from '@/lib/chess'
import type { PromotionPiece } from '@/lib/chess'

/**
 * O sufixo de promoção implícito.
 *
 * Dama, porque é o que 99% das promoções são e porque o tabuleiro já abre o
 * seletor quando a promoção é possível — este valor só existe para o caso em
 * que o chamador não passou nenhum. Sub-promoção continua alcançável pelo
 * seletor; o que não pode é o aluno arrastar até a última fileira e o lance
 * simplesmente não acontecer.
 */
export const PROMOCAO_PADRAO: PromotionPiece = 'q'

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
export function formasDoLance(uci: string): string[] {
  const canonico = normalizeUci(uci)
  if (canonico.length === 5) return [canonico]
  return [canonico, `${canonico}${PROMOCAO_PADRAO}`]
}

/** Duas grafias do mesmo lance? */
export function ehOMesmoLance(a: string, b: string): boolean {
  const deA = new Set(formasDoLance(a))
  return formasDoLance(b).some((forma) => deA.has(forma))
}
