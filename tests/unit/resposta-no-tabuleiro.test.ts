/**
 * O lance jogado no tabuleiro vira resposta pedagógica.
 *
 * O CASO QUE JUSTIFICA O ARQUIVO é `lance ilegal NÃO é erro conceitual`. Ele
 * separa as duas perguntas que a lição faz a cada arraste — "isto é um lance?" e
 * "este lance responde ao que estou ensinando?" — e é a separação que impede o
 * defeito clássico: um arraste torto virar "você errou o conceito", a escada de
 * dicas avançar sozinha, e o aluno ser punido por um tremor no mouse.
 */

import { describe, expect, it } from 'vitest'
import { julgarLanceDaLicao, lanceResponde } from '@/domain/exercicios'
import type { ExercicioPosicional } from '@/domain/exercicios'

/**
 * Torre branca em c1, cavalo preto indefeso em c6, peão preto em d5 defendido
 * pelo peão em e6. A captura correta é a do cavalo: `c1c6`.
 */
const PECA_INDEFESA: ExercicioPosicional = {
  id: 'teste-peca-indefesa',
  fen: '4k3/8/2n1p3/3p4/8/8/8/2R1K3 w - - 0 1',
  ladoDoAluno: 'w',
  objetivo: { tipo: 'ganha-material', saldoMinimo: 3 },
  lancesAceitos: ['c1c6'],
  alternativas: ['c1c5', 'c1c4'],
}

describe('legalidade e pedagogia são perguntas separadas', () => {
  it('o lance certo é correto', () => {
    expect(julgarLanceDaLicao(PECA_INDEFESA, 'c1', 'c6')).toEqual({
      tipo: 'correto',
      uci: 'c1c6',
    })
  })

  it('lance LEGAL mas errado é erro conceitual', () => {
    // A torre pode ir a c5. Não é o que a lição cobra — e isso é erro de ideia.
    expect(julgarLanceDaLicao(PECA_INDEFESA, 'c1', 'c5')).toEqual({
      tipo: 'incorreto',
      uci: 'c1c5',
    })
  })

  it('lance ILEGAL não é erro conceitual — é arraste torto', () => {
    /*
      O CASO MAIS IMPORTANTE DO ARQUIVO.

      A torre em c1 não vai para b3. Se isto voltasse como `incorreto`, um
      arraste impossível contaria como erro de conceito: a escada de dicas
      avançaria, o registro de tentativa subiria, e o aluno seria corrigido por
      algo que ele nem chegou a afirmar.
    */
    expect(julgarLanceDaLicao(PECA_INDEFESA, 'c1', 'b3')).toEqual({ tipo: 'ilegal' })
  })

  it('mexer a peça do adversário é ilegal, não errado', () => {
    // É a vez das brancas. Arrastar o cavalo preto não é uma opinião sobre a
    // posição — é um gesto sem lance por trás.
    expect(julgarLanceDaLicao(PECA_INDEFESA, 'c6', 'd4')).toEqual({ tipo: 'ilegal' })
  })

  it('casa inexistente é ilegal, e não explode', () => {
    expect(julgarLanceDaLicao(PECA_INDEFESA, 'c1' as never, 'z9' as never)).toEqual({
      tipo: 'ilegal',
    })
  })
})

describe('múltiplos lances válidos', () => {
  /*
    A REGRA DO PLANO: fora do repertório de abertura, um lance alternativo que
    satisfaz o conceito NÃO é erro. Insistir numa sequência única quando o
    objetivo admite duas ensina que existe uma resposta decorada.
  */
  const DUAS_CAPTURAS: ExercicioPosicional = {
    ...PECA_INDEFESA,
    id: 'teste-duas-capturas',
    lancesAceitos: ['c1c6', 'c1c5'],
  }

  it('aceita qualquer um dos lances da chave', () => {
    expect(julgarLanceDaLicao(DUAS_CAPTURAS, 'c1', 'c6').tipo).toBe('correto')
    expect(julgarLanceDaLicao(DUAS_CAPTURAS, 'c1', 'c5').tipo).toBe('correto')
  })

  it('e continua recusando o que não está nela', () => {
    expect(julgarLanceDaLicao(DUAS_CAPTURAS, 'c1', 'c4').tipo).toBe('incorreto')
  })
})

describe('promoção', () => {
  /** Peão branco em a7, pronto para promover. Rei preto longe. */
  const PROMOVER: ExercicioPosicional = {
    id: 'teste-promocao',
    fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
    ladoDoAluno: 'w',
    objetivo: { tipo: 'ganha-material', saldoMinimo: 8 },
    lancesAceitos: ['a7a8q'],
    alternativas: ['e1e2'],
  }

  it('arrastar até a última fileira SEM sufixo promove a dama', () => {
    /*
      Sem esta segunda chance o aluno arrasta o peão até a oitava, nada
      acontece, e a tela não explica nada — o pior tipo de silêncio, porque o
      gesto estava certo e o app é que não entendeu.
    */
    expect(julgarLanceDaLicao(PROMOVER, 'a7', 'a8')).toEqual({ tipo: 'correto', uci: 'a7a8q' })
  })

  it('a peça escolhida no seletor é respeitada', () => {
    // Sub-promoção continua alcançável: promover a cavalo não é o que a chave
    // pede, então é erro conceitual — e não um lance que some.
    expect(julgarLanceDaLicao(PROMOVER, 'a7', 'a8', 'n')).toEqual({
      tipo: 'incorreto',
      uci: 'a7a8n',
    })
  })

  it('a chave escrita sem sufixo casa com a promoção a dama', () => {
    // O conteúdo pode escrever `a7a8` ou `a7a8q`: as duas dizem a mesma coisa,
    // e recusar o lance certo por causa de um sufixo é erro que ninguém vê.
    const semSufixo: ExercicioPosicional = { ...PROMOVER, lancesAceitos: ['a7a8'] }
    expect(lanceResponde(semSufixo, 'a7a8q')).toBe(true)
  })
})
