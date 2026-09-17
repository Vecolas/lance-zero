/**
 * O PORTÃO DA TRADUÇÃO: todo objetivo do catálogo vira um objetivo AVALIÁVEL.
 *
 * `EndgamePosition['objective']` tem seis valores pedagógicos; `ObjetivoFinal`
 * tem três formas verificáveis. A ponte entre os dois é `objetivoDaPosicao`, e um
 * buraco nela não aparece como erro: aparece como uma rodada que fica em
 * `em-andamento` para sempre — o treino sem fim que esta entrega veio matar.
 *
 * O CASO QUE JUSTIFICA O SEGUNDO BLOCO é sutil e já mordeu neste projeto
 * (`endgames-curriculo.test.ts` tem o equivalente): um objetivo que nasce
 * CUMPRIDO aprova qualquer lance, e um que nasce FALHADO reprova o aluno antes
 * de ele jogar. Os dois passam despercebidos porque a tela parece normal.
 *
 * O QUE ELE NÃO PROVA: que o objetivo declarado é VERDADEIRO na posição — que a
 * vitória prometida existe mesmo. Isso só a tablebase responde, e a resposta
 * mora em `tests/contrato/biblioteca-vs-tablebase.test.ts`.
 */

import { describe, expect, it } from 'vitest'
import { ENDGAME_POSITION_SETS } from '@/content/endgames/biblioteca'
import {
  avaliarObjetivo,
  contextoInicial,
  objetivoDaPosicao,
  type EndgamePosition,
} from '@/domain/endgames'
import type { Side } from '@/domain/types'

const POSICOES = ENDGAME_POSITION_SETS.flatMap((conjunto) => conjunto.positions)

/**
 * Os objetivos SEM avaliador, nomeados.
 *
 * `reach-target` é o único, e a lista existe para a ausência ser uma decisão
 * escrita em vez de um esquecimento. MORDE DOS DOIS LADOS: valor que ganhar
 * avaliador e continuar aqui reprova, e valor que sair daqui sem ganhar um
 * também.
 */
const SEM_AVALIADOR: readonly EndgamePosition['objective'][] = ['reach-target']

const TODOS_OS_OBJETIVOS: readonly EndgamePosition['objective'][] = [
  'win',
  'mate',
  'promote',
  'draw',
  'defend',
  'reach-target',
]

function posicaoCom(objective: EndgamePosition['objective']): EndgamePosition {
  return {
    id: `x-${objective}`,
    fen: '8/8/3K4/3P4/3k4/8/8/8 w - - 0 1',
    sideToTrain: 'white',
    objective,
    conceptIds: ['x'],
    validationSource: 'curated',
    difficulty: 1,
  }
}

describe('a tradução cobre todos os objetivos do catálogo', () => {
  it.each(TODOS_OS_OBJETIVOS.map((o) => [o] as const))('%s', (objective) => {
    const { objetivo, motivo } = objetivoDaPosicao(posicaoCom(objective))
    if (SEM_AVALIADOR.includes(objective)) {
      expect(objetivo, `${objective} não devia ter avaliador`).toBeNull()
      expect(motivo).toBe('alvo-nao-declarado')
      return
    }
    expect(objetivo, `${objective} ficou sem avaliador: a rodada nunca terminaria`).not.toBeNull()
    expect(motivo).toBeNull()
  })

  it('nenhuma posição do catálogo usa um objetivo sem avaliador', () => {
    // O outro lado: a lista de dívida só vale se ninguém depender do que está
    // nela. No dia em que uma posição `reach-target` entrar no catálogo, este
    // caso reprova — em vez de o aluno achar um treino que não acaba.
    const orfas = POSICOES.filter((posicao) => SEM_AVALIADOR.includes(posicao.objective))
    expect(orfas.map((p) => p.id)).toEqual([])
  })
})

describe('nenhum objetivo nasce resolvido', () => {
  /*
    O canário do currículo, aplicado à biblioteca. Um objetivo já cumprido na
    posição inicial aprova o primeiro lance qualquer que seja; um já falhado
    reprova antes do primeiro clique. Nenhum dos dois erra em lugar nenhum.
  */
  it('há posição para conferir', () => {
    expect(POSICOES.length).toBeGreaterThanOrEqual(30)
  })

  it.each(POSICOES.map((p) => [p.id, p] as const))('%s', (_id, posicao) => {
    const { objetivo } = objetivoDaPosicao(posicao)
    expect(objetivo, `${posicao.id} sem avaliador`).not.toBeNull()
    if (!objetivo) return

    const lado: Side = posicao.sideToTrain === 'white' ? 'w' : 'b'
    const resultado = avaliarObjetivo(posicao.fen, objetivo, contextoInicial(lado))

    expect(
      resultado.estado,
      `${posicao.id} (${posicao.fen}) nasce "${resultado.estado}" por "${resultado.motivo}"`,
    ).toBe('em-andamento')
  })
})

describe('a promoção não nasce cumprida quando já há uma dama', () => {
  it('o alvo é UMA A MAIS do que o aluno já tem', () => {
    // Cravar `quantidadeMinima: 1` daria a promoção por cumprida no lance zero
    // num final de damas — e o treino aprovaria quem não jogou.
    const comDama: EndgamePosition = {
      ...posicaoCom('promote'),
      fen: '8/3P4/3K4/8/8/8/8/Q5k1 w - - 0 1',
    }
    const { objetivo } = objetivoDaPosicao(comDama)
    expect(objetivo).toEqual({ tipo: 'promocao', peca: 'q', quantidadeMinima: 2 })
  })
})
