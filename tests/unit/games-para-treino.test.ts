import { describe, expect, it } from 'vitest'

import { DETECTOR_CODES } from '@/domain/games/detectors'
import { explainMistake, skillsForExplanation, UNKNOWN_CODE } from '@/domain/games/explain'
import {
  PARA_TREINO_CONFIG,
  idDoCardDeErro,
  momentoParaReviewCard,
  preservarProgresso,
  prioridadesDeHabilidade,
  promptDoMomento,
  selecionarParaTreino,
  temPadraoNomeado,
  type ParaTreinoConfig,
} from '@/domain/games/para-treino'
import { buildDailyPlan, type PlannerContext } from '@/domain/planning/planner'
import type {
  CriticalMoment,
  MistakeExplanation,
  MoveSeverity,
  ReviewCard,
  UserProfile,
} from '@/domain/types'
import { START_FEN, applyMove } from '@/lib/chess'

/**
 * Posição base dos casos: a inicial, escolhida só por ser garantidamente válida
 * para `applyMove`. O que estes testes medem não depende da posição.
 */
const FEN_ANTES = START_FEN
const LANCE_DO_USUARIO = 'e2e4'
const MELHOR_LANCE = 'g1f3'
const FEN_DEPOIS = applyMove(FEN_ANTES, LANCE_DO_USUARIO)?.fenAfter ?? ''
const SAN_MELHOR = applyMove(FEN_ANTES, MELHOR_LANCE)?.move.san ?? ''

const AGORA = new Date('2026-03-10T12:00:00.000Z')
/** Dentro da janela de erros recentes do planner (14 dias). */
const PARTIDA_RECENTE = '2026-03-05T20:00:00.000Z'
const OUTRO_RELOGIO = new Date('2027-08-01T23:30:00.000Z')

/**
 * Régua de tom do PEDAGOGY: o texto explica sem humilhar.
 *
 * É substring e não palavra inteira de propósito — "você errou" e "seu lance
 * ruim" precisam reprovar em qualquer flexão.
 */
const TOM_QUE_HUMILHA = /errou|burro|ruim/i

function explicacaoDe(code: string): MistakeExplanation {
  const base = {
    fenBefore: FEN_ANTES,
    userMoveUci: LANCE_DO_USUARIO,
    bestMoveUci: MELHOR_LANCE,
    expectedScoreLossPp: 12,
  }
  if (code === UNKNOWN_CODE) return explainMistake(base, [])
  const deteccao = DETECTOR_CODES.find((item) => item === code)
  if (!deteccao) throw new Error(`código de detector desconhecido no teste: ${code}`)
  return explainMistake(base, [{ code: deteccao, confidence: 1, detalhe: 'a dama em d5' }])
}

interface MomentoParcial {
  gameId?: string
  ply?: number
  severity?: MoveSeverity
  perdaPp?: number
  code?: string | null
  bestMoveUci?: string
  ocorridoEm?: string
}

function momento(parcial: MomentoParcial = {}): CriticalMoment {
  const code = parcial.code === undefined ? 'hanging-piece' : parcial.code
  const explanation = code === null ? null : explicacaoDe(code)
  return {
    gameId: parcial.gameId ?? 'partida-a',
    ocorridoEm: parcial.ocorridoEm ?? PARTIDA_RECENTE,
    ply: parcial.ply ?? 21,
    fenBefore: FEN_ANTES,
    userMoveUci: LANCE_DO_USUARIO,
    bestMoveUci: parcial.bestMoveUci ?? MELHOR_LANCE,
    expectedScoreLossPp: parcial.perdaPp ?? 12,
    severity: parcial.severity ?? 'erro',
    // Habilidades saem da FONTE (`skillsForExplanation`), como no pipeline real:
    // fixá-las à mão faria o teste afirmar um mapeamento que o produto não usa.
    skillIds: explanation === null ? [] : skillsForExplanation(explanation),
    explanation,
  }
}

/** Embaralhamento determinístico: mesma entrada, mesma permutação, sem `Math.random`. */
function embaralhar<T>(itens: readonly T[]): T[] {
  return itens
    .map((item, indice) => ({ item, chave: (indice * 7919) % 101 }))
    .sort((a, b) => a.chave - b.chave)
    .map((par) => par.item)
}

describe('id do card de erro', () => {
  it('é estável: o mesmo momento convertido duas vezes dá o mesmo id', () => {
    const alvo = momento()
    const primeiro = momentoParaReviewCard(alvo, { agora: AGORA })
    const segundo = momentoParaReviewCard(alvo, { agora: OUTRO_RELOGIO })

    expect(primeiro.id).toBe(segundo.id)
    expect(primeiro.id).toBe(idDoCardDeErro('partida-a', 21))
  })

  it('separa partidas diferentes no mesmo ply', () => {
    const a = momentoParaReviewCard(momento({ gameId: 'partida-a', ply: 30 }), { agora: AGORA })
    const b = momentoParaReviewCard(momento({ gameId: 'partida-b', ply: 30 }), { agora: AGORA })

    expect(a.id).not.toBe(b.id)
  })

  it('separa plies diferentes da mesma partida', () => {
    expect(idDoCardDeErro('partida-a', 30)).not.toBe(idDoCardDeErro('partida-a', 31))
  })

  it('o ply é o último segmento, mesmo com ":" dentro do gameId', () => {
    // É isso que mantém o par (partida, ply) recuperável e sem colisão.
    expect(idDoCardDeErro('x:9', 1)).not.toBe(idDoCardDeErro('x', 91))
    expect(idDoCardDeErro('x:9', 1).split(':').pop()).toBe('1')
  })

  it('escapa o gameId: o id continua seguro como chave e como trecho de URL', () => {
    // `gameId` vem de PGN importado; espaço, barra e "?" chegam por lá e o id
    // vai parar em URL e em chave de armazenamento.
    const id = idDoCardDeErro('partida 1/2?x', 3)

    expect(id).toMatch(/^[A-Za-z0-9%:_.~!*'()-]+$/)
    expect(id).not.toContain(' ')
    expect(id).not.toContain('/')
  })
})

describe('conversão de momento em card', () => {
  it('guarda a posição de ANTES do lance e o melhor lance como solução', () => {
    const card = momentoParaReviewCard(momento(), { agora: AGORA })

    expect(card.fen).toBe(FEN_ANTES)
    expect(FEN_DEPOIS).not.toBe('')
    expect(card.fen).not.toBe(FEN_DEPOIS)
    expect(card.solutionUci).toEqual([MELHOR_LANCE])
    expect(card.solutionUci).not.toContain(LANCE_DO_USUARIO)
  })

  it('carrega origem, tipo e habilidades do momento', () => {
    const alvo = momento({ gameId: 'partida-z', ply: 44 })
    const card = momentoParaReviewCard(alvo, { agora: AGORA })

    expect(card.kind).toBe('erro-de-partida')
    expect(card.sourceGameId).toBe('partida-z')
    expect(card.sourcePly).toBe(44)
    expect(alvo.skillIds.length).toBeGreaterThan(0)
    expect(card.skillIds).toEqual(alvo.skillIds)
  })

  it('nasce vencido, para o primeiro contato ser na mesma sessão', () => {
    const card = momentoParaReviewCard(momento(), { agora: AGORA })

    expect(card.createdAt).toBe(AGORA.toISOString())
    expect(card.dueAt).toBe(AGORA.toISOString())
  })

  it('recusa em voz alta um momento sem padrão nomeado', () => {
    expect(() => momentoParaReviewCard(momento({ code: UNKNOWN_CODE }), { agora: AGORA })).toThrow(
      /padrão nomeado/,
    )
    expect(() => momentoParaReviewCard(momento({ code: null }), { agora: AGORA })).toThrow(
      /padrão nomeado/,
    )
  })

  it('recusa um momento sem melhor lance e um prompt em branco', () => {
    expect(() => momentoParaReviewCard(momento({ bestMoveUci: '' }), { agora: AGORA })).toThrow(
      /melhor lance/,
    )
    expect(() => momentoParaReviewCard(momento(), { agora: AGORA, prompt: '   ' })).toThrow(
      /prompt vazio/,
    )
  })

  it('aceita prompt próprio de quem chama', () => {
    const card = momentoParaReviewCard(momento(), {
      agora: AGORA,
      prompt: '  Retome esta posição. ',
    })

    expect(card.prompt).toBe('Retome esta posição.')
  })
})

describe('reanálise atualiza o card em vez de zerá-lo', () => {
  it('mantém o agendamento do card antigo e o conteúdo do novo', () => {
    const antigo = momentoParaReviewCard(momento(), { agora: AGORA })
    const revisado: ReviewCard = {
      ...antigo,
      dueAt: '2026-04-01T00:00:00.000Z',
      scheduler: { ...antigo.scheduler, reps: 4, state: 'review', stability: 12.5 },
    }
    const novo = momentoParaReviewCard(momento({ code: 'fork' }), { agora: OUTRO_RELOGIO })
    const fundido = preservarProgresso(novo, revisado)

    expect(fundido.id).toBe(antigo.id)
    expect(fundido.dueAt).toBe(revisado.dueAt)
    expect(fundido.createdAt).toBe(revisado.createdAt)
    expect(fundido.scheduler).toEqual(revisado.scheduler)
    // Conteúdo é o da reanálise: a explicação nova pode ter mudado o texto.
    expect(fundido.prompt).toBe(novo.prompt)
    expect(fundido.skillIds).toEqual(novo.skillIds)
    // A metade que morde: sem a fusão o progresso voltaria a zero em silêncio.
    expect(novo.scheduler.reps).not.toBe(revisado.scheduler.reps)
  })

  it('não funde cards de erros diferentes nem quando não há card anterior', () => {
    const cardA = momentoParaReviewCard(momento({ ply: 5 }), { agora: AGORA })
    const cardB = momentoParaReviewCard(momento({ ply: 6 }), { agora: OUTRO_RELOGIO })

    expect(preservarProgresso(cardB, cardA)).toEqual(cardB)
    expect(preservarProgresso(cardB, null)).toEqual(cardB)
    expect(preservarProgresso(cardB, undefined)).toEqual(cardB)
  })
})

describe('prompt do card', () => {
  it('a régua de tom morde dos dois lados', () => {
    // Sem esta metade, um regex que nunca reprova carimbaria qualquer texto.
    expect(TOM_QUE_HUMILHA.test('Você errou feio: lance ruim de jogador burro.')).toBe(true)
    expect(TOM_QUE_HUMILHA.test(promptDoMomento(momento()))).toBe(false)
  })

  it('todo código de detector produz prompt em PT-BR que não entrega a solução', () => {
    // Varre o REGISTRO de detectores, não uma lista escrita à mão: um detector
    // novo entra nesta cobertura sem ninguém lembrar de editar o teste.
    let verificados = 0

    for (const code of DETECTOR_CODES) {
      const alvo = momento({ code })
      expect(alvo.explanation?.code, `explicação de ${code} caiu em unknown`).toBe(code)

      const prompt = promptDoMomento(alvo)
      expect(prompt.trim(), `prompt vazio para ${code}`).not.toBe('')
      expect(TOM_QUE_HUMILHA.test(prompt), `prompt humilhante para ${code}`).toBe(false)
      expect(prompt, `prompt de ${code} entrega o lance em SAN`).not.toContain(SAN_MELHOR)
      expect(prompt, `prompt de ${code} entrega o lance em UCI`).not.toContain(MELHOR_LANCE)
      verificados += 1
    }

    // Regra 3 dos portões: tabela vazia não é aprovação.
    expect(verificados).toBe(DETECTOR_CODES.length)
    expect(verificados).toBeGreaterThan(0)
  })

  it('usa o hábito da explicação quando ele existe', () => {
    const alvo = momento()
    const habito = alvo.explanation?.habitoQuePreveniria ?? ''

    expect(habito).not.toBe('')
    expect(promptDoMomento(alvo)).toContain(habito)
  })
})

describe('seleção do que vira treino', () => {
  function loteDe(gameId: string, quantidade: number, severidade: MoveSeverity): CriticalMoment[] {
    return Array.from({ length: quantidade }, (_, indice) =>
      momento({ gameId, ply: indice + 1, perdaPp: 10 + indice, severity: severidade }),
    )
  }

  it('respeita o teto por partida e fica com os mais graves', () => {
    const momentos = loteDe('partida-a', 30, 'erro-grave')
    const escolhidos = selecionarParaTreino(momentos)

    expect(escolhidos).toHaveLength(PARA_TREINO_CONFIG.maxCardsPorPartida)
    // Perdas 10..39: os três maiores são os plies 30, 29 e 28.
    expect(escolhidos.map((item) => item.ply)).toEqual([30, 29, 28])
  })

  it('respeita o teto do lote quando várias partidas entram juntas', () => {
    const momentos = [
      ...loteDe('partida-a', 10, 'erro-grave'),
      ...loteDe('partida-b', 10, 'erro-grave'),
      ...loteDe('partida-c', 10, 'erro-grave'),
    ]
    const escolhidos = selecionarParaTreino(momentos)

    expect(escolhidos).toHaveLength(PARA_TREINO_CONFIG.maxCardsPorLote)
    expect(new Set(escolhidos.map((item) => item.gameId)).size).toBeGreaterThan(1)
  })

  it('com teto alto devolve tudo que é elegível: quem corta é o teto, não o filtro', () => {
    // A outra metade do portão do teto. Sem ela, um filtro quebrado que
    // devolvesse sempre 3 itens passaria no teste acima.
    const generosa: ParaTreinoConfig = {
      severidadeMinima: 'erro',
      maxCardsPorPartida: 100,
      maxCardsPorLote: 100,
    }
    expect(selecionarParaTreino(loteDe('partida-a', 30, 'erro-grave'), generosa)).toHaveLength(30)
  })

  it('prefere severidade a perda: um erro grave passa na frente de um erro maior em pp', () => {
    const escolhidos = selecionarParaTreino([
      momento({ ply: 5, severity: 'erro', perdaPp: 90 }),
      momento({ ply: 9, severity: 'erro-grave', perdaPp: 20 }),
    ])

    expect(escolhidos.map((item) => item.ply)).toEqual([9, 5])
  })

  it('descarta o que está abaixo da severidade mínima', () => {
    const abaixo = [
      momento({ ply: 3, severity: 'imprecisao' }),
      momento({ ply: 4, severity: 'ok' }),
    ]

    expect(selecionarParaTreino(abaixo)).toEqual([])
    // A outra metade: o mesmo lance, uma banda acima, entra.
    expect(selecionarParaTreino([momento({ ply: 3, severity: 'erro' })])).toHaveLength(1)
  })

  it('momento unknown não vira card, mas o mesmo momento explicado vira', () => {
    const desconhecido = momento({ ply: 12, code: UNKNOWN_CODE })
    const semExplicacao = momento({ ply: 13, code: null })

    expect(temPadraoNomeado(desconhecido)).toBe(false)
    expect(selecionarParaTreino([desconhecido, semExplicacao])).toEqual([])

    const explicado = momento({ ply: 12, code: 'fork' })
    expect(temPadraoNomeado(explicado)).toBe(true)
    expect(selecionarParaTreino([explicado])).toHaveLength(1)
  })

  it('é determinística: a ordem da entrada não muda a saída', () => {
    const momentos = [
      ...loteDe('partida-a', 8, 'erro-grave'),
      ...loteDe('partida-b', 8, 'erro'),
      ...loteDe('partida-c', 8, 'erro-grave'),
    ]
    const referencia = selecionarParaTreino(momentos)
    const embaralhado = selecionarParaTreino(embaralhar(momentos))

    expect(embaralhado.map((item) => `${item.gameId}#${item.ply}`)).toEqual(
      referencia.map((item) => `${item.gameId}#${item.ply}`),
    )
  })

  it('desempate total: severidade, perda e ply iguais caem no id da partida', () => {
    const empatados = [
      momento({ gameId: 'partida-c', ply: 7, perdaPp: 30, severity: 'erro-grave' }),
      momento({ gameId: 'partida-a', ply: 7, perdaPp: 30, severity: 'erro-grave' }),
      momento({ gameId: 'partida-b', ply: 7, perdaPp: 30, severity: 'erro-grave' }),
    ]

    expect(selecionarParaTreino(empatados).map((item) => item.gameId)).toEqual([
      'partida-a',
      'partida-b',
      'partida-c',
    ])
    expect(selecionarParaTreino(embaralhar(empatados)).map((item) => item.gameId)).toEqual([
      'partida-a',
      'partida-b',
      'partida-c',
    ])
  })
})

describe('relógio injetado', () => {
  it('o mesmo momento com relógios diferentes muda só as datas', () => {
    const alvo = momento()
    const cedo = momentoParaReviewCard(alvo, { agora: AGORA })
    const tarde = momentoParaReviewCard(alvo, { agora: OUTRO_RELOGIO })

    expect(cedo.createdAt).not.toBe(tarde.createdAt)
    expect(cedo.dueAt).not.toBe(tarde.dueAt)

    // Normaliza (em vez de omitir) todo campo de data: assim um campo NOVO com
    // data entra na comparação automaticamente e reprova se depender do relógio.
    const semDatas = (card: ReviewCard): ReviewCard => ({
      ...card,
      createdAt: '',
      dueAt: '',
      scheduler: { ...card.scheduler, lastReviewAt: null },
    })

    expect(semDatas(cedo)).toEqual(semDatas(tarde))
  })
})

describe('prioridades de habilidade para o planner', () => {
  it('gera uma entrada por habilidade de cada momento, com a severidade do lance', () => {
    const momentos = [
      momento({ ply: 10, severity: 'erro-grave' }),
      momento({ ply: 20, severity: 'erro' }),
    ]
    const esperado = momentos.reduce((soma, item) => soma + item.skillIds.length, 0)
    const erros = prioridadesDeHabilidade(momentos, { agora: AGORA })

    expect(esperado).toBeGreaterThan(0)
    expect(erros).toHaveLength(esperado)
    expect(new Set(erros.map((erro) => erro.severity))).toEqual(new Set(['erro-grave', 'erro']))
    // A data é a da PARTIDA, não a de agora: analisar hoje um jogo antigo não
    // pode registrá-lo como erro recente.
    expect(new Set(erros.map((erro) => erro.ocorridoEm))).toEqual(
      new Set(momentos.map((m) => m.ocorridoEm)),
    )
  })

  it('usa a data da PARTIDA, nunca a de agora', () => {
    const jogadaEm = '2026-02-01T09:00:00.000Z'
    const erros = prioridadesDeHabilidade([momento({ ocorridoEm: jogadaEm })], { agora: AGORA })

    expect(erros[0].ocorridoEm).toBe(jogadaEm)
    expect(erros[0].ocorridoEm).not.toBe(AGORA.toISOString())
  })

  it('partida antiga analisada hoje NÃO vira erro recente', () => {
    // O caso que motivou tirar o parâmetro opcional: sem isto, o planner
    // inflaria a prioridade da habilidade e ninguém ligaria o plano à causa.
    const antiga = '2020-01-01T00:00:00.000Z'
    const erros = prioridadesDeHabilidade([momento({ ocorridoEm: antiga })], { agora: AGORA })

    expect(erros[0].ocorridoEm).toBe(antiga)
  })

  it('momento sem habilidade atribuída não contribui', () => {
    expect(prioridadesDeHabilidade([momento({ code: UNKNOWN_CODE })], { agora: AGORA })).toEqual([])
  })

  it('o resultado é aceito pelo planner e faz o bloco de erro de partida aparecer', () => {
    const profile: UserProfile = {
      id: 'perfil-teste',
      createdAt: AGORA.toISOString(),
      estimatedRating: 1100,
      dailyBudgetMinutes: 40,
      preferences: { boardTheme: 'claro', reducedMotion: false },
    }
    const contextoBase: Omit<PlannerContext, 'recentGameErrors'> = {
      profile,
      mastery: [],
      dueCards: [],
      now: AGORA,
    }

    const comErros = buildDailyPlan(
      {
        ...contextoBase,
        recentGameErrors: prioridadesDeHabilidade(
          [momento({ ply: 10, severity: 'erro-grave' }), momento({ ply: 18, severity: 'erro' })],
          { agora: AGORA },
        ),
      },
      'seed-fixa',
    )
    const semErros = buildDailyPlan({ ...contextoBase, recentGameErrors: [] }, 'seed-fixa')

    expect(comErros.blocks.some((bloco) => bloco.kind === 'erro-de-partida')).toBe(true)
    // A outra metade: sem erro de partida o bloco não aparece do nada.
    expect(semErros.blocks.some((bloco) => bloco.kind === 'erro-de-partida')).toBe(false)
  })
})
