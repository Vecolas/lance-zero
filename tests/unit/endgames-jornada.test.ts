/**
 * Portão da JORNADA DE FINAIS.
 *
 * O que ele mede, e por que cada caso existe:
 *
 * 1. A REGRA QUE DEFINE O DOMÍNIO — lance DIFERENTE do exemplo que preserva a
 *    vitória é ACEITO. É o caso mais importante do arquivo: se ele cair, o
 *    treino de finais virou decoreba de FEN e o produto está ensinando errado.
 * 2. A TRAVA CONTRA O BUG — rodada que termina em erro não acrescenta alvo, e a
 *    etapa de treino continua incompleta. "Rodada encerrada" nunca vira
 *    "atividade concluída".
 * 3. A COBERTURA EXIGE TRANSFERÊNCIA — uma posição só não fecha o treino final.
 * 4. O COMPUTADOR ESCOLHE COM CRITÉRIO — e nunca escolhe um lance que joga fora
 *    o resultado, por mais que ele pontue bem nos outros critérios.
 *
 * O julgamento e a avaliação de objetivo são os DE PRODUÇÃO (`julgarLanceDeFinal`
 * e `avaliarObjetivo`): o teste fixa a resposta da tablebase, não o veredito. Um
 * veredito escrito à mão provaria que este arquivo obedece a um objeto literal,
 * e não que ele obedece à regra do xadrez que o outro módulo implementa.
 */

import { describe, expect, it } from 'vitest'
import { normalizeFen } from '@/lib/chess'
import { criarJornada, etapaCumprida, registrarItem, type StudyJourney } from '@/domain/jornada'
import type { EndgameDefinition, EndgamePosition } from '@/domain/endgames/catalogo'
import { julgarLanceDeFinal } from '@/domain/endgames/julgamento'
import { avaliarObjetivo } from '@/domain/endgames/objetivo'
import type { TablebaseResult } from '@/domain/types'
import {
  admiteDefesa,
  alvoDeCobertura,
  alvosDoTreinoFinal,
  coberturaDoFinal,
  construirJornadaDeFinal,
  escolherLancePratico,
  ETAPAS_DA_JORNADA_DE_FINAL,
  iniciarRodadaDeFinal,
  jogarNaRodadaDeFinal,
  pontuarLancePratico,
  problemasDoConteudoDeFinal,
  registrarRodadaDeFinal,
  treinoFinalCumprido,
  type CandidatoPratico,
  type ConteudoDoFinal,
  type ContextoDoLancePratico,
  type VereditoDeLanceDeFinal,
} from '@/domain/endgames/jornada'

// ------------------------------------------------------------------ fixtures

/** Rei e torre contra rei: final SEM defesa. O lado fraco não tem o que segurar. */
const TORRE_BASE: EndgamePosition = {
  id: 'torre-base',
  fen: '7k/8/6K1/8/8/8/8/R7 w - - 0 1',
  sideToTrain: 'white',
  objective: 'win',
  conceptIds: ['rook-mate'],
  expectedResult: 'win',
  validationSource: 'curated',
  difficulty: 2,
}

/** Mesma família, outra FEN: é ela que prova transferência. */
const TORRE_ESPELHO: EndgamePosition = {
  id: 'torre-espelho',
  fen: 'k7/8/2K5/8/8/8/8/7R w - - 0 1',
  sideToTrain: 'white',
  objective: 'win',
  conceptIds: ['rook-mate'],
  expectedResult: 'win',
  validationSource: 'curated',
  difficulty: 2,
}

/** Oposição pelo lado fraco: final COM defesa. */
const OPOSICAO_DEFESA: EndgamePosition = {
  id: 'oposicao-defesa',
  fen: '4k3/8/8/4K3/4P3/8/8/8 b - - 0 1',
  sideToTrain: 'black',
  objective: 'defend',
  conceptIds: ['opposition'],
  expectedResult: 'draw',
  validationSource: 'curated',
  difficulty: 1,
}

const OPOSICAO_CONVERSAO: EndgamePosition = {
  id: 'oposicao-conversao',
  fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
  sideToTrain: 'white',
  objective: 'promote',
  conceptIds: ['opposition', 'key-squares'],
  expectedResult: 'win',
  validationSource: 'curated',
  difficulty: 2,
}

function definicao(id: string): EndgameDefinition {
  return {
    id,
    slug: id,
    name: id,
    category: 'rook',
    description: 'fixture',
    previewFen: TORRE_BASE.fen,
    training: {
      fen: TORRE_BASE.fen,
      sideToTrain: 'white',
      objective: 'win',
      expectedResult: 'win',
    },
    difficulty: 2,
    prerequisiteIds: [],
    lessonIds: [],
    drillIds: [`${id}-set`],
    tags: [],
    level: 'essential',
    version: 1,
  }
}

const MATE_DE_TORRE = definicao('rook-mate')
const SEM_DEFESA: ConteudoDoFinal = { posicoes: [TORRE_BASE, TORRE_ESPELHO] }
const COM_DEFESA: ConteudoDoFinal = { posicoes: [OPOSICAO_CONVERSAO, OPOSICAO_DEFESA] }

/**
 * Resposta da tablebase numa posição GANHA pelo aluno.
 *
 * Quatro lances de propósito, um para cada degrau que o domínio precisa saber
 * distinguir: o melhor, um indistinguível dele, um que ganha por caminho mais
 * longo e um que devolve o empate.
 */
const TABLEBASE_VITORIA: TablebaseResult = {
  fen: normalizeFen(TORRE_BASE.fen),
  categoria: 'win',
  resultado: 'vitoria',
  dtz: 5,
  dtm: 11,
  xequeMate: false,
  afogamento: false,
  doCache: true,
  lances: [
    { uci: 'a1a8', san: 'Ta8+', categoria: 'loss', resultado: 'derrota', dtz: -4, dtm: -10 },
    { uci: 'a1a7', san: 'Ta7', categoria: 'loss', resultado: 'derrota', dtz: -4, dtm: -10 },
    { uci: 'a1h1', san: 'Th1', categoria: 'loss', resultado: 'derrota', dtz: -8, dtm: -24 },
    { uci: 'a1a6', san: 'Ta6', categoria: 'draw', resultado: 'empate', dtz: 0, dtm: null },
  ],
}

/** Resposta da tablebase numa posição EMPATADA que o aluno defende. */
const TABLEBASE_EMPATE: TablebaseResult = {
  fen: normalizeFen(OPOSICAO_DEFESA.fen),
  categoria: 'draw',
  resultado: 'empate',
  dtz: 0,
  dtm: null,
  xequeMate: false,
  afogamento: false,
  doCache: true,
  lances: [
    { uci: 'e8e7', san: 'Re7', categoria: 'draw', resultado: 'empate', dtz: 0, dtm: null },
    { uci: 'e8d7', san: 'Rd7', categoria: 'win', resultado: 'vitoria', dtz: 12, dtm: 26 },
  ],
}

function vereditoDaVitoria(uci: string): VereditoDeLanceDeFinal {
  return {
    legal: true,
    fenDepois: TORRE_BASE.fen,
    julgamento: julgarLanceDeFinal({
      fenAntes: TORRE_BASE.fen,
      uciDoAluno: uci,
      antes: TABLEBASE_VITORIA,
    }),
    objetivo: null,
    alvoTecnico: null,
  }
}

function vereditoDaDefesa(uci: string): VereditoDeLanceDeFinal {
  return {
    legal: true,
    fenDepois: OPOSICAO_DEFESA.fen,
    julgamento: julgarLanceDeFinal({
      fenAntes: OPOSICAO_DEFESA.fen,
      uciDoAluno: uci,
      antes: TABLEBASE_EMPATE,
    }),
    objetivo: null,
    alvoTecnico: null,
  }
}

function rodadaDeConversao() {
  return iniciarRodadaDeFinal({
    id: `${MATE_DE_TORRE.id}:${TORRE_BASE.id}`,
    endgameId: MATE_DE_TORRE.id,
    positionFamilyId: MATE_DE_TORRE.drillIds[0] ?? MATE_DE_TORRE.id,
    posicao: TORRE_BASE,
  })
}

function jornadaDe(stages: readonly { id: string }[]): StudyJourney {
  return criarJornada(
    'jornada-1',
    MATE_DE_TORRE.id,
    'final',
    stages as Parameters<typeof criarJornada>[3],
  )
}

// ------------------------------------------------------------- as dez etapas

describe('construção da jornada de um final', () => {
  it('monta as dez etapas na ordem declarada, com o treino final marcado', () => {
    const stages = construirJornadaDeFinal(MATE_DE_TORRE, SEM_DEFESA)

    expect(stages.map((stage) => stage.id)).toEqual([...ETAPAS_DA_JORNADA_DE_FINAL])
    expect(stages.filter((stage) => stage.ehTreinoFinal === true)).toHaveLength(1)
    expect(stages.at(-1)?.ehTreinoFinal).toBe(true)
    expect(stages.at(-1)?.regra.tipo).toBe('cobertura')
  })

  it('o rótulo curto cabe no trilho de 360px', () => {
    for (const stage of construirJornadaDeFinal(MATE_DE_TORRE, SEM_DEFESA)) {
      expect(stage.rotuloCurto.length, stage.id).toBeLessThanOrEqual(10)
      expect(stage.rotuloCurto).not.toBe('')
    }
  })

  it('só o treino final pode reprovar: nenhuma outra etapa usa cobertura', () => {
    const stages = construirJornadaDeFinal(MATE_DE_TORRE, SEM_DEFESA)
    const coberturas = stages.filter((stage) => stage.regra.tipo === 'cobertura')
    expect(coberturas.map((stage) => stage.id)).toEqual(['treino-final'])
  })

  /**
   * O caso da instrução: final sem defesa possível.
   *
   * A etapa `defender` continua existindo — ela ensina POR QUE não há defesa —
   * mas a cobertura não pode exigir um alvo defensivo que nenhuma jogada
   * alcança. Seria uma etapa impossível, e o aluno ficaria preso para sempre.
   */
  it('final sem defesa mantém a etapa defender como leitura e não exige alvo defensivo', () => {
    expect(admiteDefesa(SEM_DEFESA)).toBe(false)

    const stages = construirJornadaDeFinal(MATE_DE_TORRE, SEM_DEFESA)
    const defender = stages.find((stage) => stage.id === 'defender')
    expect(defender?.regra.tipo).toBe('leitura')
    expect(defender?.objetivo).toContain('não tem defesa')

    const alvos = alvosDoTreinoFinal(SEM_DEFESA)
    expect(alvos.some((alvo) => alvo.startsWith('defensor:'))).toBe(false)
  })

  it('final com defesa exige o alvo defensivo no treino final', () => {
    expect(admiteDefesa(COM_DEFESA)).toBe(true)
    expect(alvosDoTreinoFinal(COM_DEFESA)).toEqual([
      alvoDeCobertura(OPOSICAO_CONVERSAO.id, 'atacante'),
      alvoDeCobertura(OPOSICAO_DEFESA.id, 'defensor'),
    ])
  })

  it('o treino final sempre exige duas posições distintas da família', () => {
    for (const conteudo of [SEM_DEFESA, COM_DEFESA]) {
      const posicoes = new Set(
        alvosDoTreinoFinal(conteudo).map((alvo) => alvo.slice(alvo.indexOf(':') + 1)),
      )
      expect(posicoes.size).toBeGreaterThanOrEqual(2)
    }
  })

  it('conteúdo com uma posição só não vira jornada, e diz por quê', () => {
    const magro: ConteudoDoFinal = { posicoes: [TORRE_BASE] }
    expect(problemasDoConteudoDeFinal(magro)).toHaveLength(1)
    expect(() => construirJornadaDeFinal(MATE_DE_TORRE, magro)).toThrow(/segunda posição/)
  })

  it('a montagem não muta o conteúdo recebido', () => {
    const conteudo: ConteudoDoFinal = { posicoes: [TORRE_BASE, TORRE_ESPELHO] }
    const copia = JSON.stringify(conteudo)
    construirJornadaDeFinal(MATE_DE_TORRE, conteudo)
    expect(JSON.stringify(conteudo)).toBe(copia)
  })
})

// ------------------------------------------- a regra que define este domínio

describe('um lance diferente do exemplo não é erro', () => {
  /**
   * O CASO MAIS IMPORTANTE DO LOTE.
   *
   * `a1a7` não é o primeiro lance da tablebase e não é o lance da lição. Ele
   * mantém a vitória, e por isso tem de ser aceito, sem aviso e sem reprovação.
   */
  it('lance fora da linha modelo que preserva a vitória é ACEITO', () => {
    const veredito = vereditoDaVitoria('a1a7')
    expect(veredito.julgamento?.grau).not.toBe('perde-o-resultado')

    const { round, resultado } = jogarNaRodadaDeFinal(rodadaDeConversao(), 'a1a7', veredito)

    expect(resultado.aceito).toBe(true)
    expect(resultado.desfecho).toBe('ativa')
    expect(resultado.motivo).toBe('preserva-o-objetivo')
    expect(round.desfecho).toBe('ativa')
    expect(round.failureReason).toBeUndefined()
    expect(round.playedMoves).toEqual(['a1a7'])
  })

  it('lance mais longo que o melhor é aceito e apenas COMENTADO', () => {
    const veredito = vereditoDaVitoria('a1h1')
    expect(veredito.julgamento?.grau).toBe('mantem-mas-e-pior')

    const { round, resultado } = jogarNaRodadaDeFinal(rodadaDeConversao(), 'a1h1', veredito)

    expect(resultado.aceito).toBe(true)
    expect(resultado.desfecho).toBe('ativa')
    expect(resultado.motivo).toBe('tecnica-mais-simples')
    expect(resultado.aviso).toBe('Funciona, mas existe técnica mais simples.')
    expect(round.desfecho).toBe('ativa')
  })

  it('um bom lance NÃO encerra a rodada: conversão se joga até o fim', () => {
    const primeiro = jogarNaRodadaDeFinal(rodadaDeConversao(), 'a1a8', vereditoDaVitoria('a1a8'))
    expect(primeiro.resultado.motivo).toBe('preserva-o-objetivo')
    expect(primeiro.round.desfecho).toBe('ativa')

    const segundo = jogarNaRodadaDeFinal(primeiro.round, 'a1a7', vereditoDaVitoria('a1a7'))
    expect(segundo.round.desfecho).toBe('ativa')
    expect(segundo.round.playedMoves).toEqual(['a1a8', 'a1a7'])
  })

  it('sem juiz o lance passa, e a tela é avisada de que não houve comparação', () => {
    const { round, resultado } = jogarNaRodadaDeFinal(rodadaDeConversao(), 'a1b1', {
      legal: true,
      fenDepois: TORRE_BASE.fen,
      julgamento: null,
      objetivo: null,
      alvoTecnico: null,
    })
    expect(resultado.motivo).toBe('sem-juiz')
    expect(round.desfecho).toBe('ativa')
  })

  it('a rodada recebida não é mutada', () => {
    const original = rodadaDeConversao()
    const copia = JSON.stringify(original)
    jogarNaRodadaDeFinal(original, 'a1a6', vereditoDaVitoria('a1a6'))
    expect(JSON.stringify(original)).toBe(copia)
  })
})

// ------------------------------------------------ as duas maneiras de perder

describe('a rodada morre quando o objetivo é objetivamente perdido', () => {
  it('vitória virou empate: rodada falhou por objetivo-perdido', () => {
    const veredito = vereditoDaVitoria('a1a6')
    expect(veredito.julgamento?.resultadoAntes).toBe('vitoria')
    expect(veredito.julgamento?.resultadoDepois).toBe('empate')

    const { round, resultado } = jogarNaRodadaDeFinal(rodadaDeConversao(), 'a1a6', veredito)

    expect(resultado.desfecho).toBe('falhou')
    expect(resultado.aceito).toBe(false)
    expect(round.desfecho).toBe('falhou')
    expect(round.failureReason).toBe('objetivo-perdido')
  })

  it('empate virou derrota: rodada falhou por objetivo-perdido', () => {
    const rodada = iniciarRodadaDeFinal({
      id: 'opposition:oposicao-defesa',
      endgameId: 'opposition',
      positionFamilyId: 'opposition-set',
      posicao: OPOSICAO_DEFESA,
    })
    expect(rodada.userRole).toBe('defensor')
    expect(rodada.objetivo).toBe('hold')

    const veredito = vereditoDaDefesa('e8d7')
    expect(veredito.julgamento?.resultadoAntes).toBe('empate')
    expect(veredito.julgamento?.resultadoDepois).toBe('derrota')

    const { round } = jogarNaRodadaDeFinal(rodada, 'e8d7', veredito)
    expect(round.desfecho).toBe('falhou')
    expect(round.failureReason).toBe('objetivo-perdido')
  })

  it('alvo técnico perdido reprova mesmo com o resultado teórico preservado', () => {
    const veredito: VereditoDeLanceDeFinal = {
      ...vereditoDaVitoria('a1a7'),
      alvoTecnico: { id: 'ponte', preservado: false, descricao: 'A torre saiu da quarta fileira.' },
    }
    const { round, resultado } = jogarNaRodadaDeFinal(rodadaDeConversao(), 'a1a7', veredito)
    expect(resultado.desfecho).toBe('falhou')
    expect(round.failureReason).toBe('alvo-tecnico-perdido')
  })

  it('lance ilegal encerra a rodada e não entra no histórico', () => {
    const { round, resultado } = jogarNaRodadaDeFinal(rodadaDeConversao(), 'a1a9', {
      legal: false,
      fenDepois: TORRE_BASE.fen,
      julgamento: null,
      objetivo: null,
      alvoTecnico: null,
    })
    expect(resultado.motivo).toBe('lance-ilegal')
    expect(round.failureReason).toBe('illegal')
    expect(round.playedMoves).toEqual([])
  })

  it('rodada encerrada não ressuscita', () => {
    const morta = jogarNaRodadaDeFinal(rodadaDeConversao(), 'a1a6', vereditoDaVitoria('a1a6')).round
    const { round, resultado } = jogarNaRodadaDeFinal(morta, 'a1a8', vereditoDaVitoria('a1a8'))
    expect(resultado.motivo).toBe('rodada-ja-encerrada')
    expect(resultado.aceito).toBe(false)
    expect(round).toBe(morta)
  })
})

// --------------------------------------------- objetivo cumprido e cobertura

describe('objetivo cumprido, cobertura e a trava contra o bug', () => {
  const stages = construirJornadaDeFinal(MATE_DE_TORRE, SEM_DEFESA)
  const treino = stages.find((stage) => stage.ehTreinoFinal === true)
  const exigidos =
    treino?.regra.tipo === 'cobertura' ? [...treino.regra.alvosExigidos] : ([] as string[])

  /** Mate de torre dado de verdade, julgado por `avaliarObjetivo`. */
  function vereditoDoMate(): VereditoDeLanceDeFinal {
    const fenDepois = 'R6k/8/6K1/8/8/8/8/8 b - - 1 1'
    return {
      legal: true,
      fenDepois,
      julgamento: julgarLanceDeFinal({
        fenAntes: TORRE_BASE.fen,
        uciDoAluno: 'a1a8',
        antes: TABLEBASE_VITORIA,
      }),
      objetivo: avaliarObjetivo(
        fenDepois,
        { tipo: 'mate-em', lancesMaximos: 1 },
        { ladoDoAluno: 'w', lancesDoAluno: 1, identidadesAnteriores: [] },
      ),
      alvoTecnico: null,
    }
  }

  it('objetivo cumprido encerra a rodada em sucesso e o alvo entra na cobertura', () => {
    const veredito = vereditoDoMate()
    expect(veredito.objetivo?.estado).toBe('cumprido')

    const { round, resultado } = jogarNaRodadaDeFinal(rodadaDeConversao(), 'a1a8', veredito)
    expect(resultado.desfecho).toBe('sucesso')
    expect(round.desfecho).toBe('sucesso')

    const jornada = registrarRodadaDeFinal(jornadaDe(stages), 'treino-final', round)
    const cobertura = coberturaDoFinal(jornada, 'treino-final', exigidos)
    expect(cobertura.cobertos).toEqual([alvoDeCobertura(TORRE_BASE.id, 'atacante')])
  })

  /**
   * A TRAVA. Este caso é o bug original invertido: a rodada terminou, e a etapa
   * continua incompleta porque ela terminou em ERRO.
   */
  it('rodada falha não acrescenta alvo e o treino final NÃO conclui', () => {
    const { round } = jogarNaRodadaDeFinal(rodadaDeConversao(), 'a1a6', vereditoDaVitoria('a1a6'))
    expect(round.desfecho).toBe('falhou')

    const antes = jornadaDe(stages)
    const depois = registrarRodadaDeFinal(antes, 'treino-final', round)

    expect(depois.alvosCobertos['treino-final']).toBeUndefined()
    expect(coberturaDoFinal(depois, 'treino-final', exigidos).cobertos).toEqual([])
    expect(treinoFinalCumprido(depois, stages)).toBe(false)
    expect(depois.status).not.toBe('concluida')
  })

  it('a cobertura exige a SEGUNDA posição da família: uma só não fecha o treino', () => {
    const mate = registrarRodadaDeFinal(jornadaDe(stages), 'treino-final', {
      ...rodadaDeConversao(),
      desfecho: 'sucesso',
    })

    const parcial = coberturaDoFinal(mate, 'treino-final', exigidos)
    expect(parcial.completa).toBe(false)
    expect(parcial.faltando).toEqual([alvoDeCobertura(TORRE_ESPELHO.id, 'atacante')])
    expect(treinoFinalCumprido(mate, stages)).toBe(false)

    const completo = registrarRodadaDeFinal(mate, 'treino-final', {
      ...iniciarRodadaDeFinal({
        id: `${MATE_DE_TORRE.id}:${TORRE_ESPELHO.id}`,
        endgameId: MATE_DE_TORRE.id,
        positionFamilyId: MATE_DE_TORRE.drillIds[0] ?? MATE_DE_TORRE.id,
        posicao: TORRE_ESPELHO,
      }),
      desfecho: 'sucesso',
    })
    expect(coberturaDoFinal(completo, 'treino-final', exigidos).completa).toBe(true)
    expect(treinoFinalCumprido(completo, stages)).toBe(true)
  })

  it('cobertura sem alvo nenhum não é cobertura completa', () => {
    expect(coberturaDoFinal(jornadaDe(stages), 'treino-final', []).completa).toBe(false)
  })

  /**
   * A fronteira entre `itens` e `cobertura`, provada: responder um item conclui
   * a etapa mesmo errando, e é por isso que a regra que reprova mora só no
   * treino final.
   */
  it('etapa de itens conclui ao responder, e a de cobertura não', () => {
    const guiada = stages.find((stage) => stage.id === 'pratica-guiada')
    const jornada = registrarItem(jornadaDe(stages), 'pratica-guiada', 'tentativa-1')
    expect(guiada !== undefined && etapaCumprida(jornada, guiada)).toBe(true)
    expect(treinoFinalCumprido(jornada, stages)).toBe(false)
  })
})

// ------------------------------------------ lance prático do computador

describe('política de lance prático do computador', () => {
  const RESISTENTE: CandidatoPratico = {
    uci: 'a1a2',
    preserveOutcome: true,
    defensiveResistance: 1,
    conversionProgress: 0,
    activity: 0,
    simplicity: 0,
    pedagogicalValue: 0,
  }
  const PROGRESSIVO: CandidatoPratico = {
    uci: 'b1b2',
    preserveOutcome: true,
    defensiveResistance: 0,
    conversionProgress: 1,
    activity: 0,
    simplicity: 0,
    pedagogicalValue: 0,
  }
  /** Joga fora o final, e pontua o máximo em tudo o mais. O veto tem de vencer. */
  const ENTREGA_O_FINAL: CandidatoPratico = {
    uci: 'c1c2',
    preserveOutcome: false,
    defensiveResistance: 1,
    conversionProgress: 1,
    activity: 1,
    simplicity: 1,
    pedagogicalValue: 1,
  }

  function contexto(
    papel: ContextoDoLancePratico['papelDoComputador'],
    jogados: readonly string[] = [],
    seed = 0,
  ): ContextoDoLancePratico {
    return { papelDoComputador: papel, lancesJaJogados: jogados, seed }
  }

  it('defendendo, escolhe o lance mais resistente', () => {
    const escolha = escolherLancePratico([PROGRESSIVO, RESISTENTE], contexto('defensor'))
    expect(escolha?.uci).toBe(RESISTENTE.uci)
  })

  it('atacando, escolhe o lance que progride', () => {
    const escolha = escolherLancePratico([RESISTENTE, PROGRESSIVO], contexto('atacante'))
    expect(escolha?.uci).toBe(PROGRESSIVO.uci)
  })

  it('nunca escolhe um lance que perde o resultado, por mais que ele pontue', () => {
    expect(pontuarLancePratico(ENTREGA_O_FINAL, contexto('defensor'))).toBe(
      Number.NEGATIVE_INFINITY,
    )
    expect(escolherLancePratico([ENTREGA_O_FINAL, RESISTENTE], contexto('defensor'))?.uci).toBe(
      RESISTENTE.uci,
    )
    expect(escolherLancePratico([ENTREGA_O_FINAL, PROGRESSIVO], contexto('atacante'))?.uci).toBe(
      PROGRESSIVO.uci,
    )
  })

  it('sem nenhum candidato que preserve, devolve null em vez de um lance qualquer', () => {
    expect(escolherLancePratico([ENTREGA_O_FINAL], contexto('defensor'))).toBeNull()
    expect(escolherLancePratico([], contexto('atacante'))).toBeNull()
  })

  it('anti-repetição: com alternativa equivalente, não repete o lance já jogado', () => {
    const d: CandidatoPratico = { ...RESISTENTE, uci: 'd1d2' }
    const e: CandidatoPratico = { ...RESISTENTE, uci: 'e1e2' }

    expect(escolherLancePratico([d, e], contexto('defensor'))?.uci).toBe('d1d2')
    expect(escolherLancePratico([d, e], contexto('defensor', ['d1d2']))?.uci).toBe('e1e2')
  })

  it('a anti-repetição não pode derrubar o único lance que preserva', () => {
    const escolha = escolherLancePratico(
      [ENTREGA_O_FINAL, RESISTENTE],
      contexto('defensor', ['a1a2', 'a1a2', 'a1a2']),
    )
    expect(escolha?.uci).toBe(RESISTENTE.uci)
  })

  it('determinismo: mesma entrada e mesma semente, mesma saída', () => {
    const d: CandidatoPratico = { ...RESISTENTE, uci: 'd1d2' }
    const e: CandidatoPratico = { ...RESISTENTE, uci: 'e1e2' }

    for (const seed of [0, 1, 2, -3]) {
      const primeira = escolherLancePratico([d, e], contexto('defensor', [], seed))
      const segunda = escolherLancePratico([e, d], contexto('defensor', [], seed))
      expect(segunda?.uci).toBe(primeira?.uci)
    }
    // Sementes diferentes giram entre os equivalentes — sem sorteio.
    expect(escolherLancePratico([d, e], contexto('defensor', [], 0))?.uci).toBe('d1d2')
    expect(escolherLancePratico([d, e], contexto('defensor', [], 1))?.uci).toBe('e1e2')
  })

  it('a escolha não muta a lista de candidatos', () => {
    const lista = [PROGRESSIVO, RESISTENTE]
    const copia = JSON.stringify(lista)
    escolherLancePratico(lista, contexto('defensor'))
    expect(JSON.stringify(lista)).toBe(copia)
  })
})
