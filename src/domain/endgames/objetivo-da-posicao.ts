/**
 * O objetivo AVALIÁVEL de uma posição de treino.
 *
 * A PONTE QUE FALTAVA, e a falta dela é o motivo de o treino final nunca
 * terminar: o catálogo descreve a posição com `objective`, que tem SEIS valores
 * pedagógicos (`win`, `mate`, `promote`, `draw`, `defend`, `reach-target`);
 * `avaliarObjetivo` decide o desfecho a partir de `ObjetivoFinal`, que tem TRÊS
 * formas verificáveis (`mate-em`, `promocao`, `empate-defendido`). Sem tradução
 * entre os dois, `EndgameStudyJourney` rodava sem juiz — `objetivo` era sempre
 * `null`, nenhuma rodada alcançava `sucesso`, `registrarRodadaDeFinal` nunca era
 * chamado e a cobertura da etapa 10 nunca fechava. O rodapé fica escondido no
 * treino, então o aluno também não tinha por onde sair.
 *
 * `Record` EXAUSTIVO: valor novo em `EndgamePosition['objective']` sem decisão
 * aqui não compila, em vez de cair num `default` que devolve "em andamento" para
 * sempre — que é a forma exata do defeito que este arquivo existe para matar.
 *
 * PUREZA: nada aqui chama rede, relógio ou tablebase. A tradução é sintática; o
 * julgamento de técnica é de `julgarLanceDeFinal`, e o de desfecho é de
 * `avaliarObjetivo`.
 */

import type { EndgamePosition } from './catalogo'
import { contarPecas, type ObjetivoFinal } from './objetivo'
import type { Side } from '@/domain/types'

/**
 * Por que uma posição pode não ter objetivo avaliável.
 *
 * CÓDIGO e não frase: função de domínio não tem tradutor. Hoje só existe um
 * motivo, e ele é uma união de um valor de propósito — motivo novo entra aqui e
 * a tela é obrigada a decidir o que dizer.
 */
export type MotivoSemObjetivo = 'alvo-nao-declarado'

export interface ObjetivoDaPosicao {
  objetivo: ObjetivoFinal | null
  /** Por que não há objetivo, quando não há. `null` quando há. */
  motivo: MotivoSemObjetivo | null
}

/**
 * Quantas peças do tipo o aluno precisa TER para a promoção contar.
 *
 * DERIVADO DA POSIÇÃO INICIAL, e não cravado em 1: uma posição que já começa com
 * uma dama (finais de damas, conversão de material) daria a promoção por
 * cumprida no lance zero — o objetivo nasceria satisfeito e o treino aprovaria
 * quem não jogou. O alvo é sempre "uma a mais do que você já tem".
 */
function damasNecessarias(fen: string, lado: Side): number {
  return contarPecas(fen, lado).q + 1
}

/**
 * O objetivo verificável desta posição.
 *
 * As três decisões que este mapa toma, e cada uma tem um porquê:
 *
 * 1. `win` e `mate` viram `mate-em` SEM LIMITE DE LANCES. Um limite finito aqui
 *    seria um número inventado, e inventar aqui REPROVA quem jogou certo e
 *    devagar — o pior erro que um treino pode cometer. A partida não corre risco
 *    de durar para sempre: a regra dos 50 lances e a tríplice repetição fecham,
 *    e `avaliarMate` já trata empate como FALHA para quem precisava ganhar, que
 *    é a resposta correta do xadrez para quem deixou a vitória escapar.
 *
 * 2. `promote` vira `promocao` com o alvo derivado da posição (ver acima). Nos
 *    finais de peão a promoção É a conversão: exigir o mate depois dela alongaria
 *    a rodada sem ensinar nada que a lição não tenha ensinado.
 *
 * 3. `reach-target` NÃO TEM AVALIADOR, e devolve o motivo em vez de um objetivo
 *    qualquer. Nenhuma posição do catálogo o usa hoje, e um portão afirma isso.
 *    Traduzi-lo para `mate-em` "só para não ficar vazio" produziria uma rodada
 *    que pede mate onde a lição pede uma casa — impossível, e sem uma linha no
 *    console.
 */
export function objetivoDaPosicao(posicao: EndgamePosition): ObjetivoDaPosicao {
  const lado: Side = posicao.sideToTrain === 'white' ? 'w' : 'b'

  switch (posicao.objective) {
    case 'win':
    case 'mate':
      return {
        objetivo: { tipo: 'mate-em', lancesMaximos: Number.POSITIVE_INFINITY },
        motivo: null,
      }

    case 'promote':
      return {
        objetivo: {
          tipo: 'promocao',
          peca: 'q',
          quantidadeMinima: damasNecessarias(posicao.fen, lado),
        },
        motivo: null,
      }

    case 'draw':
    case 'defend':
      return { objetivo: { tipo: 'empate-defendido' }, motivo: null }

    case 'reach-target':
      return { objetivo: null, motivo: 'alvo-nao-declarado' }

    default:
      return objetivoNaoTratado(posicao.objective)
  }
}

function objetivoNaoTratado(objetivo: never): never {
  throw new Error(`Objetivo de posição sem tradução: ${JSON.stringify(objetivo)}`)
}
