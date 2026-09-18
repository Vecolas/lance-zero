/**
 * A EVIDÊNCIA QUE FALTAVA PARA CALIBRAR — e as armadilhas dela.
 *
 * CINCO ENTREGAS DESTA RODADA DECLARARAM O MESMO PONTO CEGO: a seleção do que
 * treinar é sorteio entre pendentes, porque o score adaptativo do plano §34.1
 * pede números que não existiam. Sortear com peso inventado seria falsa
 * adaptação — a tela diria "escolhido para você" sobre um `Math.random`.
 *
 * ESTE ARQUIVO GUARDA TRÊS DECISÕES QUE PARECEM DETALHE E NÃO SÃO:
 *
 *   1. conquista não se rebaixa — errar hoje não apaga o que foi demonstrado;
 *   2. ausência de dado NÃO é evidência de fraqueza;
 *   3. errar numa partida real não adia a revisão.
 *
 * Cada uma é um jeito diferente de o app mentir sem dar erro.
 */

import { describe, expect, it } from 'vitest'
import {
  acertoDePrimeira,
  aplicarEventoDoRamo,
  atencaoDoRamo,
  ehPontoResistente,
  estadoDoRamoNoProgresso,
  estadoInicialDoRamo,
  registrarEventoDeRamo,
  RESISTENTE_CONFIG,
  type EstadoDeAprendizadoDoRamo,
} from '@/domain/openings/estado-do-ramo'

const AGORA = '2026-03-01T12:00:00.000Z'
const DEPOIS = '2026-03-05T12:00:00.000Z'

const vazio = () => estadoInicialDoRamo('italiana-dois-cavalos')

describe('o estado nasce sem afirmar nada', () => {
  it('nada demonstrado, nada contado, nunca praticado', () => {
    const estado = vazio()
    expect(estado.visto).toBe(false)
    expect(estado.independenteConcluida).toBe(false)
    expect(estado.tentativas).toBe(0)
    expect(estado.praticadoEm).toBeNull()
  })

  it('sem tentativa, a taxa de acerto é NULA — e não zero', () => {
    /*
      ZERO SIGNIFICARIA "ELE ERRA SEMPRE". Ausência de dado não é evidência de
      fraqueza, e um score que lesse zero aqui priorizaria justamente os ramos
      sobre os quais nada se sabe — mandando o aluno treinar o que ele talvez já
      domine, em vez do que ele erra.
    */
    expect(acertoDePrimeira(vazio())).toBeNull()
  })
})

describe('conquista não se rebaixa', () => {
  it('errar depois de ter demonstrado NÃO apaga a demonstração', () => {
    /*
      Zerar conquista a cada erro é punição, e transforma o treino numa corrida
      de sorte: o aluno passa a evitar o difícil para não perder o que já tem.
    */
    let estado = aplicarEventoDoRamo(
      vazio(),
      { tipo: 'treino', papel: 'principal', sucesso: true },
      AGORA,
    )
    expect(estado.independenteConcluida).toBe(true)

    estado = aplicarEventoDoRamo(
      estado,
      { tipo: 'treino', papel: 'principal', sucesso: false },
      DEPOIS,
    )
    expect(estado.independenteConcluida).toBe(true)
    // Mas a dificuldade FICA registrada: é ela que o score precisa ver.
    expect(estado.tentativas).toBe(2)
    expect(estado.acertosDePrimeira).toBe(1)
  })

  it('a tentativa conta mesmo quando falha', () => {
    /*
      Contar só os sucessos apagaria a dificuldade: um ramo tentado cinco vezes e
      concluído uma é exatamente o que o score precisa enxergar.
    */
    let estado = vazio()
    for (let i = 0; i < 4; i += 1) {
      estado = aplicarEventoDoRamo(
        estado,
        { tipo: 'treino', papel: 'principal', sucesso: false },
        AGORA,
      )
    }
    expect(estado.tentativas).toBe(4)
    expect(acertoDePrimeira(estado)).toBe(0)
  })

  it('os dois papéis são contados separados', () => {
    // Jogar o repertório não demonstra saber enfrentá-lo. São duas habilidades.
    let estado = aplicarEventoDoRamo(
      vazio(),
      { tipo: 'treino', papel: 'principal', sucesso: true },
      AGORA,
    )
    expect(estado.papelPrincipalConcluido).toBe(true)
    expect(estado.papelReversoConcluido).toBe(false)

    estado = aplicarEventoDoRamo(
      estado,
      { tipo: 'treino', papel: 'reverso', sucesso: true },
      DEPOIS,
    )
    expect(estado.papelReversoConcluido).toBe(true)
  })

  it('guiada e independente são conquistas diferentes', () => {
    // Acertar COM apoio não é o mesmo que acertar sozinho — a distinção é o que
    // permite o score saber se o aluno já saiu do degrau com rede.
    const estado = aplicarEventoDoRamo(
      vazio(),
      { tipo: 'guiada', acertouDePrimeira: true, dicas: 0 },
      AGORA,
    )
    expect(estado.guiadaConcluida).toBe(true)
    expect(estado.independenteConcluida).toBe(false)
  })
})

describe('o relógio do "praticado em"', () => {
  it('abrir o ramo NÃO conta como prática', () => {
    // A mesma regra que separou "visto" de "praticado" no ADR-0022.
    const estado = aplicarEventoDoRamo(vazio(), { tipo: 'visto' }, AGORA)
    expect(estado.visto).toBe(true)
    expect(estado.praticadoEm).toBeNull()
  })

  it('errar numa PARTIDA REAL não adia a revisão', () => {
    /*
      A ARMADILHA MAIS SUTIL DO MÓDULO. Se um desvio em partida marcasse
      "praticado agora", o app adiaria a revisão justamente do que o aluno acabou
      de esquecer — e o esquecimento ficaria mais longe de ser corrigido quanto
      mais ele acontecesse.
    */
    const estado = aplicarEventoDoRamo(vazio(), { tipo: 'desvio-em-partida' }, AGORA)
    expect(estado.desviosEmPartidaReal).toBe(1)
    expect(estado.praticadoEm).toBeNull()
  })

  it('treino e revisão movem o relógio', () => {
    const treinou = aplicarEventoDoRamo(
      vazio(),
      { tipo: 'treino', papel: 'principal', sucesso: false },
      AGORA,
    )
    expect(treinou.praticadoEm).toBe(AGORA)
    const revisou = aplicarEventoDoRamo(treinou, { tipo: 'revisao', acertou: true }, DEPOIS)
    expect(revisou.praticadoEm).toBe(DEPOIS)
  })
})

describe('a leitura de atenção', () => {
  it('ramo intocado NÃO é o que mais pede atenção', () => {
    /*
      É a consequência de "ausência de dado não é fraqueza". Um ramo nunca
      tentado pede alguma atenção — ele não foi demonstrado —, mas menos que um
      que falhou em partida real.
    */
    const intocado = atencaoDoRamo(vazio(), 'core')
    const falhouNaPartida = atencaoDoRamo({ ...vazio(), desviosEmPartidaReal: 3 }, 'core')
    expect(falhouNaPartida).toBeGreaterThan(intocado)
  })

  it('erro em partida real pesa mais que qualquer outro sinal', () => {
    // É a evidência mais cara que existe: veio do tabuleiro de verdade.
    const base = vazio()
    const partida = atencaoDoRamo({ ...base, desviosEmPartidaReal: 3 }, 'core')
    const revisao = atencaoDoRamo({ ...base, falhasEmRevisao: 3 }, 'core')
    expect(partida).toBeGreaterThan(revisao)
  })

  it('a importância MODULA e não decide', () => {
    /*
      Um ramo `optional` que falhou três vezes numa partida real importa mais que
      um `core` intocado. Foi o tabuleiro real que disse isso, e ele ganha de
      qualquer classificação editorial nossa.
    */
    const opcionalQueFalha = atencaoDoRamo({ ...vazio(), desviosEmPartidaReal: 3 }, 'optional')
    const coreIntocado = atencaoDoRamo(vazio(), 'core')
    expect(opcionalQueFalha).toBeGreaterThan(coreIntocado)
  })

  it('fica sempre entre 0 e 1', () => {
    const pior: EstadoDeAprendizadoDoRamo = {
      ...vazio(),
      tentativas: 10,
      acertosDePrimeira: 0,
      falhasEmRevisao: 9,
      desviosEmPartidaReal: 9,
    }
    for (const importancia of ['core', 'secondary', 'optional'] as const) {
      const valor = atencaoDoRamo(pior, importancia)
      expect(valor).toBeGreaterThanOrEqual(0)
      expect(valor).toBeLessThanOrEqual(1)
    }
  })
})

describe('o ponto resistente', () => {
  it('não é resistente só por ter errado uma vez', () => {
    // §49 pede repetição, e não um tropeço. Chamar de "resistente" o primeiro
    // erro faria o rótulo perder o sentido no dia em que ele importasse.
    expect(ehPontoResistente({ ...vazio(), falhasEmRevisao: 1 })).toBe(false)
  })

  it('falhar repetidamente em revisão marca', () => {
    expect(
      ehPontoResistente({ ...vazio(), falhasEmRevisao: RESISTENTE_CONFIG.falhasEmRevisao }),
    ).toBe(true)
  })

  it('errar repetidamente em partida real também marca', () => {
    expect(
      ehPontoResistente({
        ...vazio(),
        desviosEmPartidaReal: RESISTENTE_CONFIG.desviosEmPartidaReal,
      }),
    ).toBe(true)
  })

  it('o critério é configurável', () => {
    // Heurística espalhada pelo código é heurística que ninguém recalibra.
    expect(
      ehPontoResistente(
        { ...vazio(), falhasEmRevisao: 1 },
        { falhasEmRevisao: 1, desviosEmPartidaReal: 9 },
      ),
    ).toBe(true)
  })
})

describe('a ponte com o progresso gravado', () => {
  it('progresso sem o campo devolve estado inicial, e não zero de desempenho', () => {
    /*
      O CAMPO É OPCIONAL para evitar migração: o store guarda o objeto inteiro, e
      um registro gravado antes dele simplesmente não o tem. Tratar a ausência
      como zero de desempenho diria "este aluno erra sempre" sobre alguém que
      nunca foi medido.
    */
    const estado = estadoDoRamoNoProgresso(undefined, 'italiana-dois-cavalos')
    expect(estado.tentativas).toBe(0)
    expect(acertoDePrimeira(estado)).toBeNull()
  })

  it('registrar não muta o progresso e não perde os outros ramos', () => {
    const antes: { ramos: Record<string, EstadoDeAprendizadoDoRamo> } = {
      ramos: { 'outro-ramo': estadoInicialDoRamo('outro-ramo') },
    }
    const depois = registrarEventoDeRamo(
      antes,
      'italiana-dois-cavalos',
      { tipo: 'treino', papel: 'principal', sucesso: true },
      AGORA,
    )

    expect(depois).not.toBe(antes)
    expect(antes.ramos['italiana-dois-cavalos']).toBeUndefined()
    // O outro ramo continua lá: escrever um apaga o vizinho é o erro clássico.
    expect(depois.ramos?.['outro-ramo']).toBeDefined()
    expect(depois.ramos?.['italiana-dois-cavalos']?.independenteConcluida).toBe(true)
  })

  it('evento que não muda nada devolve O MESMO objeto', () => {
    /*
      É o que permite chamar isto no caminho de escrita sem gravar um registro
      idêntico a cada visita — uma gravação por render encheria o IndexedDB de
      revisões sem informação nova.
    */
    const antes = registrarEventoDeRamo({}, 'r', { tipo: 'visto' }, AGORA)
    const depois = registrarEventoDeRamo(antes, 'r', { tipo: 'visto' }, AGORA)
    expect(depois).toBe(antes)
  })
})
