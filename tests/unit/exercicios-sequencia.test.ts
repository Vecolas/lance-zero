/**
 * O MOTOR DE SEQUÊNCIA — jogar, o computador responder, e a linha continuar.
 *
 * O MODO DE FALHA QUE ESTE ARQUIVO COBRE é o que a lição tinha: o aluno acerta e
 * a peça volta. A posição nunca andava, o adversário não existia, e nada na tela
 * dizia que aquilo era o comportamento esperado — o app simplesmente parecia não
 * ter registrado o lance certo.
 *
 * O SEGUNDO MODO é o oposto, e nasce junto com a correção: responder sozinho
 * virar "jogar um lance a mais SEMPRE", inclusive quando a linha tem um lance só
 * e não há resposta nenhuma a dar. Os dois casos estão aqui, lado a lado, de
 * propósito.
 */

import { describe, expect, it } from 'vitest'
import { positionStatus } from '@/lib/chess'
import {
  iniciarSequencia,
  jogarNaSequencia,
  lanceEsperado,
  type LinhaTreinavel,
} from '@/domain/exercicios/sequencia'

/** Torre de f1 come o bispo indefeso de f5. Um lance resolve, e acabou. */
const UM_LANCE: LinhaTreinavel = {
  fenInicial: '4k3/1p6/2n5/5b2/8/8/8/2R1KR2 w - - 0 1',
  ladoDoAluno: 'w',
  lances: ['f1f5'],
}

/** A mesma posição, com a recaptura e a continuação — três lances. */
const COM_RESPOSTA: LinhaTreinavel = {
  fenInicial: '4k3/1p6/2n5/5b2/8/8/8/2R1KR2 w - - 0 1',
  ladoDoAluno: 'w',
  lances: ['f1f5', 'c6e7', 'f5f7'],
}

/** A linha abre com o lance do adversário, como um puzzle do dump. */
const COMPUTADOR_ABRE: LinhaTreinavel = {
  fenInicial: '6k1/5ppp/8/8/8/8/5PPP/R5K1 b - - 0 1',
  ladoDoAluno: 'w',
  lances: ['g8h8', 'a1a8'],
}

describe('abrir a sequência', () => {
  it('quando é a vez do aluno, nada é jogado por ele', () => {
    const estado = iniciarSequencia(UM_LANCE)

    expect(estado.fen).toBe(UM_LANCE.fenInicial)
    expect(estado.jogados).toEqual([])
    expect(estado.status).toBe('em-andamento')
    expect(lanceEsperado(UM_LANCE, estado)).toBe('f1f5')
  })

  it('quando NÃO é a vez do aluno, o computador abre sozinho', () => {
    /*
      É ISTO que faz "treinando de brancas, o computador joga de pretas" ser
      verdade desde o primeiro instante. Sem este laço, a tela abriria pedindo um
      lance a quem não é de jogar — e o aluno tentaria mover peça do adversário.
    */
    const estado = iniciarSequencia(COMPUTADOR_ABRE)

    expect(estado.jogados).toEqual(['g8h8'])
    expect(positionStatus(estado.fen).turn).toBe('w')
    expect(lanceEsperado(COMPUTADOR_ABRE, estado)).toBe('a1a8')
  })
})

describe('o lance certo faz a partida continuar', () => {
  it('com continuação autorada, o aluno joga UM lance e o tabuleiro anda DOIS', () => {
    const inicial = iniciarSequencia(COM_RESPOSTA)
    const resultado = jogarNaSequencia(COM_RESPOSTA, inicial, 'f1f5')

    expect(resultado.tipo).toBe('seguiu')
    if (resultado.tipo !== 'seguiu') return

    // O lance do aluno E a resposta do computador, na MESMA transição. Não
    // existe estado intermediário em que é a vez dele e a tela está parada.
    expect(resultado.respostaDoAdversario).toBe('c6e7')
    expect(resultado.estado.jogados).toEqual(['f1f5', 'c6e7'])
    expect(positionStatus(resultado.estado.fen).turn).toBe('w')
    expect(resultado.estado.status).toBe('em-andamento')
  })

  it('a linha inteira se percorre sem nenhum passo intermediário', () => {
    let estado = iniciarSequencia(COM_RESPOSTA)
    for (const meu of ['f1f5', 'f5f7']) {
      const resultado = jogarNaSequencia(COM_RESPOSTA, estado, meu)
      expect(resultado.tipo, `${meu} deveria seguir a linha`).toBe('seguiu')
      if (resultado.tipo !== 'seguiu') return
      estado = resultado.estado
    }

    expect(estado.status).toBe('concluida')
    expect(estado.jogados).toEqual(['f1f5', 'c6e7', 'f5f7'])
    expect(lanceEsperado(COM_RESPOSTA, estado)).toBeNull()
  })

  it('com linha de UM lance, o computador não responde nada', () => {
    /*
      O PAR DO TESTE ACIMA, e a razão de ele existir: "o computador responde
      sozinho" não pode virar "sempre sobra um lance". Quando um lance resolve, o
      exercício acaba nele — e inventar uma resposta aqui seria inventar
      continuação que o conteúdo não tem.
    */
    const resultado = jogarNaSequencia(UM_LANCE, iniciarSequencia(UM_LANCE), 'f1f5')

    expect(resultado.tipo).toBe('seguiu')
    if (resultado.tipo !== 'seguiu') return
    expect(resultado.respostaDoAdversario).toBeNull()
    expect(resultado.estado.jogados).toEqual(['f1f5'])
    expect(resultado.estado.status).toBe('concluida')
  })
})

describe('o lance errado NÃO anda a posição', () => {
  it('lance legal fora da linha devolve a posição intacta e conta a tentativa', () => {
    const inicial = iniciarSequencia(UM_LANCE)
    const resultado = jogarNaSequencia(UM_LANCE, inicial, 'c1c6')

    expect(resultado.tipo).toBe('fora-da-linha')
    if (resultado.tipo !== 'fora-da-linha') return

    // O SNAPBACK, medido onde ele de fato mora: no FEN. É o que mantém o aluno
    // NA posição até resolvê-la, em vez de levá-lo para a seguinte sem entender.
    expect(resultado.estado.fen).toBe(inicial.fen)
    expect(resultado.estado.jogados).toEqual([])
    expect(resultado.estado.indice).toBe(inicial.indice)
    expect(resultado.estado.errosNoLance).toBe(1)
  })

  it('errar duas vezes conta duas, e acertar depois zera o contador', () => {
    let estado = iniciarSequencia(COM_RESPOSTA)
    for (const errado of ['c1c6', 'e1e2']) {
      const tentativa = jogarNaSequencia(COM_RESPOSTA, estado, errado)
      if (tentativa.tipo !== 'fora-da-linha') throw new Error(`${errado} deveria ser recusado`)
      estado = tentativa.estado
    }
    expect(estado.errosNoLance).toBe(2)

    const certo = jogarNaSequencia(COM_RESPOSTA, estado, 'f1f5')
    if (certo.tipo !== 'seguiu') throw new Error('f1f5 deveria seguir a linha')

    // O contador é DO LANCE, e não do exercício: a escada de dicas pergunta
    // "quantas vezes ele errou ISTO", e um acumulado responderia outra coisa.
    expect(certo.estado.errosNoLance).toBe(0)
  })

  it('lance impossível é `ilegal`, e não erro conceitual', () => {
    /*
      A SEPARAÇÃO MAIS IMPORTANTE DO ARQUIVO, herdada de `resposta-no-tabuleiro`:
      um arraste torto não é uma afirmação sobre a posição. Contá-lo como erro
      puniria o aluno por um tremor no mouse e faria a escada de dicas avançar
      sozinha.
    */
    const inicial = iniciarSequencia(UM_LANCE)
    const resultado = jogarNaSequencia(UM_LANCE, inicial, 'c1b3')

    expect(resultado.tipo).toBe('ilegal')
  })

  it('mexer peça do adversário é ilegal, não é "lance errado"', () => {
    const resultado = jogarNaSequencia(UM_LANCE, iniciarSequencia(UM_LANCE), 'c6d4')
    expect(resultado.tipo).toBe('ilegal')
  })
})

describe('promoção', () => {
  const PROMOVER: LinhaTreinavel = {
    fenInicial: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
    ladoDoAluno: 'w',
    lances: ['a7a8q'],
  }

  it('arrastar até a última fileira sem sufixo vale como promoção a dama', () => {
    const resultado = jogarNaSequencia(PROMOVER, iniciarSequencia(PROMOVER), 'a7a8')

    expect(resultado.tipo).toBe('seguiu')
    if (resultado.tipo !== 'seguiu') return
    expect(resultado.estado.jogados).toEqual(['a7a8q'])
  })

  it('promover a cavalo é outro lance, e é recusado quando a linha pede dama', () => {
    const resultado = jogarNaSequencia(PROMOVER, iniciarSequencia(PROMOVER), 'a7a8n')
    expect(resultado.tipo).toBe('fora-da-linha')
  })
})

describe('sequência concluída', () => {
  it('não aceita mais lance nenhum', () => {
    const fim = jogarNaSequencia(UM_LANCE, iniciarSequencia(UM_LANCE), 'f1f5')
    if (fim.tipo !== 'seguiu') throw new Error('f1f5 deveria seguir a linha')

    expect(jogarNaSequencia(UM_LANCE, fim.estado, 'c1c6').tipo).toBe('ilegal')
  })
})
