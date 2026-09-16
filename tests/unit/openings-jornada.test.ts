/**
 * As invariantes da jornada de abertura.
 *
 * O QUE ESTE ARQUIVO PROVA, e é uma coisa só dita de sete maneiras: uma rodada
 * que termina mal NÃO conclui etapa nenhuma. O bug que ele existe para impedir
 * já aconteceu — o teste de fim de rodada era `!result.nextNodeId`, que é
 * exatamente o caso fora do repertório, e o único caminho de ERRO gravava
 * "atividade concluída".
 *
 * A abertura de teste é autorada aqui, e não importada do catálogo, porque as
 * invariantes são sobre a MECÂNICA e não sobre a Italiana: amarrar o teste ao
 * conteúdo de produção faria uma revisão editorial de texto quebrar a prova da
 * trava. Ela tem, de propósito, uma transposição real e ramos que divergem em
 * plies diferentes.
 */
import { describe, expect, it } from 'vitest'

import { applyMove, identidadeDePosicao, START_FEN } from '@/lib/chess'
import {
  concluirEtapa,
  criarJornada,
  etapaCumprida,
  jornadaConcluida,
  registrarItem,
  registrarRodada,
  type StudyJourney,
  type StudyStage,
} from '@/domain/jornada'
import {
  buildOpeningDefinition,
  emptyOpeningProgress,
  type OpeningDefinition,
  type OpeningMoveLesson,
  type OpeningSide,
} from '@/domain/openings'
import {
  ABERTURA_TREINO_CONFIG,
  ALVO_MAINLINE,
  ALVO_PERSPECTIVA_REVERSA,
  alvosDeTreinoFinal,
  aplicarRespostaDoComputador,
  coberturaDaAbertura,
  construirJornadaDeAbertura,
  ETAPA_DE_TREINO_DE_ABERTURA,
  iniciarRodadaDeAbertura,
  itensDePraticaGuiada,
  jogarNaRodada,
  ladoDoAlvo,
  plyAlvoDaRodada,
  proximoAlvoDeCobertura,
  registrarAlvoRecente,
  respostaDoComputador,
  vezDe,
  type OpeningTrainingRound,
} from '@/domain/openings/jornada'

const AGORA = new Date('2026-01-01T12:00:00.000Z')

const lesson = (ply: number, san: string, comment: string): OpeningMoveLesson => ({
  ply,
  san,
  uci: '',
  comment,
})

const linha = (sans: readonly string[]): OpeningMoveLesson[] =>
  sans.map((san, indice) => lesson(indice + 1, san, `Lance ${san}.`))

/**
 * Abertura de teste.
 *
 * `variacao-transposta` chega por outra ordem de lances à mesma posição do fim
 * da linha principal — é ela que prova que o repertório é um GRAFO e não uma
 * lista de SAN.
 */
const ABERTURA: OpeningDefinition = buildOpeningDefinition({
  id: 'teste',
  slug: 'teste',
  name: 'Abertura de Teste',
  side: 'white',
  ecoCodes: ['C50'],
  description: 'Abertura sintética para provar a mecânica da jornada.',
  philosophy: 'Desenvolver e ocupar o centro.',
  difficulty: 1,
  prerequisites: [],
  tags: ['open'],
  transitionToMiddlegame: 'A partir daqui vale o plano, não a memória.',
  mainline: linha(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']),
  variations: [
    {
      id: 'variacao-a',
      name: 'Dois Cavalos',
      description: 'As pretas atacam e4 de imediato.',
      rootNodeId: '',
      line: linha(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3']),
    },
    {
      id: 'variacao-b',
      name: 'Bispo em b5',
      description: 'As brancas pressionam o cavalo de c6.',
      rootNodeId: '',
      line: linha(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']),
    },
    {
      id: 'variacao-c',
      name: 'Defesa sólida',
      description: 'As pretas sustentam e5 com o peão.',
      rootNodeId: '',
      line: linha(['e4', 'e5', 'Nf3', 'd6', 'Bc4']),
    },
    {
      id: 'variacao-transposta',
      name: 'Ordem invertida',
      description: 'A mesma posição por outra ordem de lances.',
      rootNodeId: '',
      line: linha(['e4', 'e5', 'Bc4', 'Nc6', 'Nf3', 'Bc5']),
    },
  ],
  plans: [
    {
      id: 'plano-d4',
      name: 'Ruptura d4',
      positionNodeId: 'root',
      objective: 'Abrir o centro com as peças desenvolvidas.',
      when: 'Depois do roque.',
      risk: 'Abrir o centro com o rei no meio.',
    },
  ],
  structures: [
    {
      name: 'Centro aberto',
      description: 'Peças ativas e linhas abertas.',
      pawnBreaks: ['d4'],
      weakSquares: ['f7'],
      openFiles: ['e'],
    },
  ],
  mistakes: [
    {
      id: 'erro-dama',
      nodeId: 'root',
      moveSan: 'Qh5',
      explanation: 'A dama cedo vira alvo.',
      principle: 'Desenvolva peças menores primeiro.',
    },
  ],
  version: 1,
})

const ETAPAS = construirJornadaDeAbertura(ABERTURA)
const ALVOS = alvosDeTreinoFinal(ABERTURA)

function etapaDeTreino(): StudyStage {
  const stage = ETAPAS.find((item) => item.id === ETAPA_DE_TREINO_DE_ABERTURA)
  if (!stage) throw new Error('etapa de treino ausente')
  return stage
}

/** Gerador determinístico. A semente é o teste; `Math.random` não entra aqui. */
function semente(valor: number): () => number {
  let estado = valor >>> 0
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0
    return estado / 0x1_0000_0000
  }
}

/** Identidade da posição alcançada por uma sequência de SAN a partir do início. */
function noApos(sans: readonly string[]): string {
  let fen = START_FEN
  for (const san of sans) {
    const aplicado = applyMove(fen, san)
    if (!aplicado) throw new Error(`lance ilegal na fixture: ${san}`)
    fen = aplicado.fenAfter
  }
  return identidadeDePosicao(fen)
}

/** Leva a jornada até a etapa de treino final, cumprindo as regras do caminho. */
function jornadaNoTreino(): StudyJourney {
  let jornada = criarJornada('jornada-teste', ABERTURA.id, 'abertura', ETAPAS)
  for (const stage of ETAPAS) {
    if (stage.id === ETAPA_DE_TREINO_DE_ABERTURA) break
    if (stage.regra.tipo === 'itens') {
      for (let indice = 0; indice < stage.regra.total; indice += 1) {
        jornada = registrarItem(jornada, stage.id, `item-${indice}`)
      }
    }
    jornada = concluirEtapa(jornada, ETAPAS, AGORA)
  }
  return jornada
}

/** Joga uma rodada inteira alternando aluno e computador, sem relógio nem rede. */
function jogarRodada(
  round: OpeningTrainingRound,
  lancesDoAluno: readonly string[],
  rng: () => number,
): OpeningTrainingRound {
  const progresso = emptyOpeningProgress(ABERTURA.id)
  let atual = round
  let proximo = 0
  for (let passo = 0; passo < 60 && atual.desfecho === 'ativa'; passo += 1) {
    if (vezDe(atual.currentFen) === atual.userSide) {
      const uci = lancesDoAluno[proximo]
      proximo += 1
      if (!uci) break
      atual = jogarNaRodada(ABERTURA, atual, uci).round
    } else {
      const resposta = respostaDoComputador(ABERTURA, atual, progresso, rng)
      atual = aplicarRespostaDoComputador(ABERTURA, atual, resposta)
    }
  }
  return atual
}

/** Os lances do aluno que levam cada alvo até o fim da própria linha. */
const LANCES_DO_ALUNO: Record<string, string[]> = {
  [ALVO_MAINLINE]: ['e2e4', 'g1f3', 'f1c4'],
  'variacao-a': ['d2d3'],
  'variacao-b': ['f1b5'],
  'variacao-c': ['f1c4'],
  'variacao-transposta': ['f1c4', 'g1f3'],
  [ALVO_PERSPECTIVA_REVERSA]: ['e7e5', 'b8c6', 'f8c5'],
}

function cobrirAlvo(jornada: StudyJourney, alvo: string, rng: () => number): StudyJourney {
  const lado: OpeningSide = ladoDoAlvo(ABERTURA, alvo)
  const round = jogarRodada(
    iniciarRodadaDeAbertura(ABERTURA, alvo, lado),
    LANCES_DO_ALUNO[alvo] ?? [],
    rng,
  )
  expect(round.desfecho).toBe('sucesso')
  return registrarRodada(jornada, ETAPA_DE_TREINO_DE_ABERTURA, alvo, round.desfecho)
}

describe('currículo da jornada de abertura', () => {
  it('tem as nove etapas na ordem em que se aprende, com o treino marcado', () => {
    expect(ETAPAS.map((stage) => stage.id)).toEqual([
      'visao',
      'ideias',
      'linha-principal',
      'respostas',
      'variacoes',
      'planos',
      'dois-lados',
      'pratica-guiada',
      'treino-final',
    ])
    expect(ETAPAS.filter((stage) => stage.ehTreinoFinal === true).map((stage) => stage.id)).toEqual(
      ['treino-final'],
    )
    expect(ETAPAS.at(-1)?.titulo).toBe('Treino final')
  })

  it('usa rótulos curtos o bastante para o trilho de 360px', () => {
    for (const stage of ETAPAS) {
      expect(stage.rotuloCurto.length).toBeLessThanOrEqual(10)
      expect(stage.rotuloCurto.trim()).toBe(stage.rotuloCurto)
    }
  })

  it('deriva os alvos do conteúdo, sem lista fixa de variações', () => {
    expect(ALVOS).toEqual([
      ALVO_MAINLINE,
      'variacao-a',
      'variacao-b',
      'variacao-c',
      'variacao-transposta',
      ALVO_PERSPECTIVA_REVERSA,
    ])
    const treino = etapaDeTreino()
    expect(treino.regra).toEqual({ tipo: 'cobertura', alvosExigidos: ALVOS })
  })

  it('deriva os itens da prática guiada das decisões do aluno na linha', () => {
    const guiada = ETAPAS.find((stage) => stage.id === 'pratica-guiada')
    expect(guiada?.regra).toEqual({ tipo: 'itens', total: itensDePraticaGuiada(ABERTURA) })
    expect(itensDePraticaGuiada(ABERTURA)).toBe(3)
  })

  it('não usa um limite global: cada alvo herda a profundidade da própria linha', () => {
    expect(plyAlvoDaRodada(ABERTURA, ALVO_MAINLINE)).toBe(6)
    expect(plyAlvoDaRodada(ABERTURA, 'variacao-a')).toBe(7)
    expect(plyAlvoDaRodada(ABERTURA, 'variacao-c')).toBe(5)
    expect(plyAlvoDaRodada(ABERTURA, ALVO_MAINLINE)).toBeLessThanOrEqual(
      ABERTURA_TREINO_CONFIG.plyMaximoDaRodada,
    )
  })

  it('inverte o lado apenas na perspectiva reversa', () => {
    expect(ladoDoAlvo(ABERTURA, ALVO_MAINLINE)).toBe('white')
    expect(ladoDoAlvo(ABERTURA, 'variacao-b')).toBe('white')
    expect(ladoDoAlvo(ABERTURA, ALVO_PERSPECTIVA_REVERSA)).toBe('black')
  })
})

describe('a trava: rodada encerrada não é atividade concluída', () => {
  it('lance legal fora do repertório falha a rodada e não conclui a etapa de treino', () => {
    const round = iniciarRodadaDeAbertura(ABERTURA, ALVO_MAINLINE, 'white')
    // d2d4 é perfeitamente legal e não pertence ao repertório treinado.
    const { round: depois, resultado, aceito } = jogarNaRodada(ABERTURA, round, 'd2d4')

    expect(aceito).toBe(false)
    expect(depois.desfecho).toBe('falhou')
    expect(depois.failureReason).toBe('out_of_repertoire')
    expect(resultado?.classification).toBe('out_of_repertoire')
    expect(depois.playedMoves).toEqual([])

    const jornada = jornadaNoTreino()
    const aposRodada = registrarRodada(
      jornada,
      ETAPA_DE_TREINO_DE_ABERTURA,
      depois.branchScopeId,
      depois.desfecho,
    )
    const aposTentarConcluir = concluirEtapa(aposRodada, ETAPAS, AGORA)

    expect(etapaCumprida(aposRodada, etapaDeTreino())).toBe(false)
    expect(aposTentarConcluir.completedStageIds).not.toContain(ETAPA_DE_TREINO_DE_ABERTURA)
    expect(aposTentarConcluir.status).not.toBe('concluida')
    expect(aposTentarConcluir.completedAt).toBeNull()
    expect(jornadaConcluida(aposTentarConcluir, ETAPAS)).toBe(false)
  })

  it('registrarRodada com desfecho falhou não acrescenta alvo nenhum', () => {
    const jornada = jornadaNoTreino()
    const depois = registrarRodada(jornada, ETAPA_DE_TREINO_DE_ABERTURA, ALVO_MAINLINE, 'falhou')
    expect(depois.alvosCobertos[ETAPA_DE_TREINO_DE_ABERTURA] ?? []).toEqual([])
    expect(coberturaDaAbertura(depois, ETAPA_DE_TREINO_DE_ABERTURA, ALVOS).cobertos).toEqual([])
  })

  it('lance ilegal encerra a rodada com motivo próprio, e não avança cobertura', () => {
    const round = iniciarRodadaDeAbertura(ABERTURA, ALVO_MAINLINE, 'white')
    const { round: depois, aceito } = jogarNaRodada(ABERTURA, round, 'e2e5')
    expect(aceito).toBe(false)
    expect(depois.desfecho).toBe('falhou')
    expect(depois.failureReason).toBe('illegal')

    const jornada = registrarRodada(
      jornadaNoTreino(),
      ETAPA_DE_TREINO_DE_ABERTURA,
      ALVO_MAINLINE,
      depois.desfecho,
    )
    expect(etapaCumprida(jornada, etapaDeTreino())).toBe(false)
  })

  it('não julga lance nenhum depois que a rodada terminou', () => {
    const round = iniciarRodadaDeAbertura(ABERTURA, ALVO_MAINLINE, 'white')
    const falha = jogarNaRodada(ABERTURA, round, 'd2d4').round
    const depois = jogarNaRodada(ABERTURA, falha, 'e2e4')
    expect(depois.resultado).toBeNull()
    expect(depois.round).toBe(falha)
  })

  it('errar a variação B depois de cobrir a principal e a A não apaga as duas', () => {
    const rng = semente(7)
    let jornada = jornadaNoTreino()
    jornada = cobrirAlvo(jornada, ALVO_MAINLINE, rng)
    jornada = cobrirAlvo(jornada, 'variacao-a', rng)

    const antes = coberturaDaAbertura(jornada, ETAPA_DE_TREINO_DE_ABERTURA, ALVOS)
    expect(antes.cobertos).toEqual([ALVO_MAINLINE, 'variacao-a'])

    // A rodada da variação B sai do repertório logo no primeiro lance do aluno.
    const roundB = iniciarRodadaDeAbertura(ABERTURA, 'variacao-b', 'white')
    const falhaB = jogarNaRodada(ABERTURA, roundB, 'b1c3').round
    expect(falhaB.desfecho).toBe('falhou')
    expect(falhaB.failureReason).toBe('out_of_repertoire')

    const depois = registrarRodada(
      jornada,
      ETAPA_DE_TREINO_DE_ABERTURA,
      falhaB.branchScopeId,
      falhaB.desfecho,
    )
    const cobertura = coberturaDaAbertura(depois, ETAPA_DE_TREINO_DE_ABERTURA, ALVOS)
    expect(cobertura.cobertos).toEqual([ALVO_MAINLINE, 'variacao-a'])
    expect(cobertura.faltando).toContain('variacao-b')
    expect(cobertura.completa).toBe(false)
  })
})

describe('rodada bem-sucedida', () => {
  it('atingir o alvo devolve sucesso e o alvo entra na cobertura', () => {
    const round = jogarRodada(
      iniciarRodadaDeAbertura(ABERTURA, ALVO_MAINLINE, 'white'),
      LANCES_DO_ALUNO[ALVO_MAINLINE] ?? [],
      semente(1),
    )
    expect(round.desfecho).toBe('sucesso')
    expect(round.failureReason).toBeUndefined()
    expect(round.ply).toBe(round.targetPly)

    const jornada = registrarRodada(
      jornadaNoTreino(),
      ETAPA_DE_TREINO_DE_ABERTURA,
      round.branchScopeId,
      round.desfecho,
    )
    expect(coberturaDaAbertura(jornada, ETAPA_DE_TREINO_DE_ABERTURA, ALVOS).cobertos).toEqual([
      ALVO_MAINLINE,
    ])
  })

  it('a etapa de treino só conclui com todos os alvos, inclusive a perspectiva reversa', () => {
    const rng = semente(42)
    let jornada = jornadaNoTreino()
    for (const alvo of ALVOS.filter((item) => item !== ALVO_PERSPECTIVA_REVERSA)) {
      jornada = cobrirAlvo(jornada, alvo, rng)
    }

    const parcial = coberturaDaAbertura(jornada, ETAPA_DE_TREINO_DE_ABERTURA, ALVOS)
    expect(parcial.faltando).toEqual([ALVO_PERSPECTIVA_REVERSA])
    expect(parcial.completa).toBe(false)
    expect(etapaCumprida(jornada, etapaDeTreino())).toBe(false)
    expect(concluirEtapa(jornada, ETAPAS, AGORA).status).not.toBe('concluida')

    jornada = cobrirAlvo(jornada, ALVO_PERSPECTIVA_REVERSA, rng)

    const completa = coberturaDaAbertura(jornada, ETAPA_DE_TREINO_DE_ABERTURA, ALVOS)
    expect(completa.faltando).toEqual([])
    expect(completa.completa).toBe(true)
    expect(etapaCumprida(jornada, etapaDeTreino())).toBe(true)

    const concluida = concluirEtapa(jornada, ETAPAS, AGORA)
    expect(concluida.status).toBe('concluida')
    expect(jornadaConcluida(concluida, ETAPAS)).toBe(true)
  })

  it('a perspectiva reversa é jogada pelo outro lado', () => {
    const round = iniciarRodadaDeAbertura(ABERTURA, ALVO_PERSPECTIVA_REVERSA, 'black')
    expect(round.userSide).toBe('black')
    // É a vez das brancas na posição inicial: quem abre é o computador.
    expect(vezDe(round.currentFen)).toBe('white')
    const jogada = respostaDoComputador(
      ABERTURA,
      round,
      emptyOpeningProgress(ABERTURA.id),
      semente(3),
    )
    expect(jogada?.uci).toBe('e2e4')
  })
})

describe('transposição', () => {
  it('chegar por outra ordem de lances cai no mesmo nó do repertório', () => {
    const noDaPrincipal = noApos(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])
    const round = iniciarRodadaDeAbertura(ABERTURA, 'variacao-transposta', 'white')

    // 1.e4 e5 já está na raiz do ramo; o aluno joga 2.Bc4 e depois 3.Cf3.
    const aposBispo = jogarNaRodada(ABERTURA, round, 'f1c4')
    expect(aposBispo.aceito).toBe(true)
    const aposResposta = aplicarRespostaDoComputador(
      ABERTURA,
      aposBispo.round,
      respostaDoComputador(
        ABERTURA,
        aposBispo.round,
        emptyOpeningProgress(ABERTURA.id),
        semente(5),
      ),
    )
    const aposCavalo = jogarNaRodada(ABERTURA, aposResposta, 'g1f3')

    expect(aposCavalo.aceito).toBe(true)
    expect(aposCavalo.round.desfecho).toBe('ativa')
    expect(aposCavalo.round.currentNodeId).toBe(noDaPrincipal)
  })
})

describe('seleção de ramo entre rodadas', () => {
  it('prefere alvo ainda não coberto e evita o recente dentro da mesma prioridade', () => {
    const escolhido = proximoAlvoDeCobertura(
      [ALVO_MAINLINE, 'variacao-a', 'variacao-b'],
      [ALVO_MAINLINE],
      ['variacao-a'],
      () => 0,
    )
    expect(escolhido).toBe('variacao-b')

    const comOutroSorteio = proximoAlvoDeCobertura(
      [ALVO_MAINLINE, 'variacao-a', 'variacao-b'],
      [ALVO_MAINLINE],
      ['variacao-a'],
      () => 0.99,
    )
    expect(comOutroSorteio).toBe('variacao-b')
  })

  it('nunca troca um alvo pendente por um já coberto só para variar', () => {
    const escolhido = proximoAlvoDeCobertura(
      [ALVO_MAINLINE, 'variacao-a', 'variacao-b'],
      ['variacao-a', 'variacao-b'],
      [ALVO_MAINLINE],
      () => 0.5,
    )
    expect(escolhido).toBe(ALVO_MAINLINE)
  })

  it('com tudo coberto, revisa sem repetir o último', () => {
    const escolhido = proximoAlvoDeCobertura(
      [ALVO_MAINLINE, 'variacao-a'],
      [ALVO_MAINLINE, 'variacao-a'],
      [ALVO_MAINLINE],
      () => 0,
    )
    expect(escolhido).toBe('variacao-a')
  })

  it('a janela de anti-repetição tem o tamanho do config', () => {
    let recentes: string[] = []
    for (const alvo of [ALVO_MAINLINE, 'variacao-a', 'variacao-b', 'variacao-c']) {
      recentes = registrarAlvoRecente(recentes, alvo)
    }
    expect(recentes).toHaveLength(ABERTURA_TREINO_CONFIG.recentesLembrados)
    expect(recentes.at(-1)).toBe('variacao-c')
  })

  it('devolve string vazia quando não há alvo exigido, em vez de inventar um', () => {
    expect(proximoAlvoDeCobertura([], [], [], () => 0)).toBe('')
  })
})

describe('determinismo', () => {
  it('a mesma semente produz a mesma sequência de ramos', () => {
    const sortear = (valor: number) => {
      const rng = semente(valor)
      const escolhas: string[] = []
      let recentes: string[] = []
      for (let volta = 0; volta < 8; volta += 1) {
        const alvo = proximoAlvoDeCobertura(ALVOS, [], recentes, rng)
        escolhas.push(alvo)
        recentes = registrarAlvoRecente(recentes, alvo)
      }
      return escolhas
    }
    expect(sortear(11)).toEqual(sortear(11))
    expect(sortear(11)).not.toEqual(sortear(99))
  })

  it('a mesma semente produz a mesma resposta do computador fora da linha do ramo', () => {
    // Sai da linha da variação transposta jogando 3.Cf3 antes do bispo: daí em
    // diante o oponente volta a ser sorteado, e é o sorteio que se prova estável.
    const partida = jogarNaRodada(
      ABERTURA,
      iniciarRodadaDeAbertura(ABERTURA, 'variacao-transposta', 'white'),
      'g1f3',
    ).round
    const progresso = emptyOpeningProgress(ABERTURA.id)

    const comSementeBaixa = respostaDoComputador(ABERTURA, partida, progresso, () => 0.01)
    const comSementeAlta = respostaDoComputador(ABERTURA, partida, progresso, () => 0.99)
    expect(comSementeBaixa?.uci).toBe('b8c6')
    expect(comSementeAlta?.uci).toBe('d7d6')
    expect(respostaDoComputador(ABERTURA, partida, progresso, () => 0.01)?.uci).toBe(
      comSementeBaixa?.uci,
    )
  })

  it('a mesma semente joga a mesma rodada inteira', () => {
    const jogar = (valor: number) =>
      jogarRodada(
        iniciarRodadaDeAbertura(ABERTURA, ALVO_MAINLINE, 'white'),
        LANCES_DO_ALUNO[ALVO_MAINLINE] ?? [],
        semente(valor),
      )
    expect(jogar(2024)).toEqual(jogar(2024))
  })
})

describe('pureza', () => {
  it('jogar não muta a rodada recebida', () => {
    const round = iniciarRodadaDeAbertura(ABERTURA, ALVO_MAINLINE, 'white')
    const copia = structuredClone(round)
    jogarNaRodada(ABERTURA, round, 'e2e4')
    jogarNaRodada(ABERTURA, round, 'd2d4')
    expect(round).toEqual(copia)
  })

  it('registrar cobertura não muta a jornada recebida', () => {
    const jornada = jornadaNoTreino()
    const copia = structuredClone(jornada)
    registrarRodada(jornada, ETAPA_DE_TREINO_DE_ABERTURA, ALVO_MAINLINE, 'sucesso')
    expect(jornada).toEqual(copia)
  })
})
