/**
 * Portão de `verificarRetencao`.
 *
 * O que esta suíte existe para impedir é UM desenho específico: o app
 * parabenizar o aluno por nada. "Não voltou a falhar" e "não há partida nenhuma
 * depois do treino" produzem exatamente a mesma ausência de erro em qualquer
 * contagem, e só um controle explícito separa os dois.
 *
 * Por isso o teste central não é "reincidiu → devolve reincidiu": essa
 * afirmação sozinha aprovaria uma função que devolve `voltou-a-falhar` sempre.
 * Cada veredito tem o seu contraponto, e os casos que NÃO devem contar (partida
 * antes do treino, partida não analisada, partida órfã, análise rasa, erro de
 * outra habilidade) são metade da suíte.
 *
 * A varredura final percorre a TABELA de vereditos (`AFIRMA_NUMERO`, um
 * `Record` sobre a união que o compilador obriga a atualizar) e exige que cada
 * um tenha um cenário que o produza. Um veredito novo sem cenário reprova aqui,
 * em vez de nascer sem cobertura nenhuma.
 */

import { describe, expect, it } from 'vitest'

import { buildDailyPlan, type PlannerContext } from '@/domain/planning/planner'
import {
  RETENCAO_CONFIG,
  instantesDeTreinoPorHabilidade,
  verificarRetencao,
  verificarRetencaoDeTreinos,
  type RetencaoConfig,
} from '@/domain/planning/retencao'
import { createMastery } from '@/domain/skills/mastery'
import { AFIRMA_NUMERO, aplicarRetencaoDePartida } from '@/domain/skills/retencao-de-partida'
import {
  SKILL_IDS,
  type AnalysisPrecision,
  type Game,
  type MoveSeverity,
  type PositionAnalysis,
  type RetencaoDeHabilidade,
  type ReviewCard,
  type SkillId,
  type SkillMastery,
  type UserProfile,
  type VereditoDeRetencao,
} from '@/domain/types'

const AGORA = new Date('2026-09-09T08:00:00.000Z')

/** Quando a habilidade virou treino. Toda a suíte gira em torno desta borda. */
const TREINO = '2026-09-01T12:00:00.000Z'

/**
 * Partida jogada ANTES do treino, e de propósito no mesmo dia.
 *
 * Perto da borda porque o canário precisa morder no lugar certo: uma partida de
 * três semanas atrás seria cortada pela janela de `erros-recentes` e o teste
 * passaria mesmo sem o corte por `treinadaEm`.
 */
const ANTES = '2026-09-01T06:00:00.000Z'
const DEPOIS_1 = '2026-09-02T10:00:00.000Z'
const DEPOIS_2 = '2026-09-03T10:00:00.000Z'
const DEPOIS_3 = '2026-09-04T10:00:00.000Z'
const FUTURO = '2026-09-20T10:00:00.000Z'

const ALVO: SkillId = 'tactics.fork'
const OUTRA: SkillId = 'tactics.pin'

const FEN_QUALQUER = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1'

function partida(id: string, playedAt: string): Game {
  return {
    id,
    source: 'pgn',
    pgn: '1. e4 e5 *',
    playedAt,
    white: 'eu',
    black: 'adversario',
    userColor: 'w',
    result: '*',
    importedAt: '2026-09-09T07:00:00.000Z',
  }
}

interface AnaliseParcial {
  gameId: string
  ply?: number
  severity?: MoveSeverity
  precisao?: AnalysisPrecision
  skillIds?: SkillId[]
}

/**
 * Análise "de erro da habilidade alvo por padrão".
 *
 * O default é o caso que DEVE contar como falha; cada teste desliga uma coisa
 * só. Um teste que passasse a não medir nada deixaria de diferir do caso base.
 */
function analise({
  gameId,
  ply = 24,
  severity = 'erro-grave',
  precisao = 'aprofundada',
  skillIds = [ALVO],
}: AnaliseParcial): PositionAnalysis {
  return {
    gameId,
    ply,
    fenBefore: FEN_QUALQUER,
    userMoveUci: 'g1f3',
    bestMoveUci: 'c4f7',
    pv: ['c4f7'],
    scoreCp: -180,
    mateIn: null,
    expectedScoreLossPp: 24,
    severity,
    skillIds,
    explanationCode: 'garfo',
    precisao,
  }
}

function verificar(
  analises: readonly PositionAnalysis[],
  partidas: readonly Game[],
  config?: RetencaoConfig,
): RetencaoDeHabilidade {
  return verificarRetencao(
    ALVO,
    TREINO,
    analises,
    new Map(partidas.map((jogo) => [jogo.id, jogo])),
    { agora: AGORA, config },
  )
}

/** Duas partidas analisadas depois do treino, ambas sem falha da habilidade. */
function duasLimpas(): { analises: PositionAnalysis[]; partidas: Game[] } {
  return {
    analises: [
      analise({ gameId: 'd1', severity: 'ok', skillIds: [] }),
      analise({ gameId: 'd2', severity: 'ok', skillIds: [] }),
    ],
    partidas: [partida('d1', DEPOIS_1), partida('d2', DEPOIS_2)],
  }
}

// ---------------------------------------------------------- os quatro estados

describe('os quatro vereditos, e o controle de cada um', () => {
  it('voltou a falhar quando a habilidade errou numa partida jogada depois do treino', () => {
    const resultado = verificar([analise({ gameId: 'd1' })], [partida('d1', DEPOIS_1)])

    expect(resultado.veredito).toBe('voltou-a-falhar')
    expect(resultado.falhas).toBe(1)
    expect(resultado.partidasComFalha).toBe(1)
    expect(resultado.ultimaFalhaEm).toBe(DEPOIS_1)
  })

  it('não reincidiu quando jogou o bastante depois do treino sem errar', () => {
    const { analises, partidas } = duasLimpas()
    const resultado = verificar(analises, partidas)

    expect(resultado.veredito).toBe('nao-reincidiu')
    expect(resultado.falhas).toBe(0)
    expect(resultado.partidasVerificadas).toBe(2)
    expect(resultado.ultimaFalhaEm).toBeNull()
  })

  it('sem evidência quando o aluno não jogou nenhuma partida analisada depois do treino', () => {
    // O caso mais comum e o mais fácil de errar: tratar "não há dado" como
    // "melhorou" é o desenho em que o app elogia o aluno por nada.
    const resultado = verificar(
      [analise({ gameId: 'a1', severity: 'ok', skillIds: [] })],
      [partida('a1', ANTES)],
    )

    expect(resultado.veredito).toBe('sem-evidencia')
    expect(resultado.partidasVerificadas).toBe(0)
  })

  it('evidência insuficiente quando jogou menos que o mínimo e não errou', () => {
    const resultado = verificar(
      [analise({ gameId: 'd1', severity: 'ok', skillIds: [] })],
      [partida('d1', DEPOIS_1)],
    )

    expect(resultado.veredito).toBe('evidencia-insuficiente')
    expect(resultado.partidasVerificadas).toBe(1)
  })
})

// -------------------------------------------------------- a borda do treino

describe('só conta o que aconteceu DEPOIS do treino', () => {
  it('erro em partida jogada antes do treino não é reincidência', () => {
    // A partida está dentro da janela de recência e é uma falha legítima da
    // habilidade — só é anterior ao treino. Sem o corte por `treinadaEm` ela
    // entraria, e a própria partida que gerou o card seria lida como recaída.
    const resultado = verificar([analise({ gameId: 'a1' })], [partida('a1', ANTES)])

    expect(resultado.veredito).toBe('sem-evidencia')
    expect(resultado.falhas).toBe(0)
  })

  it('partida jogada exatamente no instante do treino não conta', () => {
    const resultado = verificar([analise({ gameId: 'a1' })], [partida('a1', TREINO)])

    expect(resultado.partidasVerificadas).toBe(0)
  })

  it('separa antes e depois na mesma leitura', () => {
    const resultado = verificar(
      [analise({ gameId: 'a1' }), analise({ gameId: 'd1' })],
      [partida('a1', ANTES), partida('d1', DEPOIS_1)],
    )

    expect(resultado.partidasVerificadas).toBe(1)
    expect(resultado.falhas).toBe(1)
    expect(resultado.ultimaFalhaEm).toBe(DEPOIS_1)
  })
})

// ---------------------------------------------------- o que não é evidência

describe('o que NÃO entra no denominador', () => {
  it('partida importada e não analisada não conta como partida sem falha', () => {
    // Ninguém olhou aquele jogo. Contá-lo seria transformar silêncio em
    // aprovação — o mesmo defeito de tratar ausência de dado como sucesso.
    const partidas = [partida('d1', DEPOIS_1), partida('d2', DEPOIS_2)]
    const resultado = verificar([analise({ gameId: 'd1', severity: 'ok', skillIds: [] })], partidas)

    expect(resultado.partidasVerificadas).toBe(1)
    expect(resultado.veredito).toBe('evidencia-insuficiente')
  })

  it('análise órfã (partida fora do mapa) não conta', () => {
    const resultado = verificar([analise({ gameId: 'fantasma' })], [partida('d1', DEPOIS_1)])

    expect(resultado.partidasVerificadas).toBe(0)
    expect(resultado.veredito).toBe('sem-evidencia')
  })

  it('partida com data no futuro não vira evidência', () => {
    const resultado = verificar(
      [analise({ gameId: 'f1', severity: 'ok', skillIds: [] })],
      [partida('f1', FUTURO)],
    )

    expect(resultado.partidasVerificadas).toBe(0)
  })

  it('partida com data ilegível não conta', () => {
    const resultado = verificar([analise({ gameId: 'x1' })], [partida('x1', 'ontem à noite')])

    expect(resultado.partidasVerificadas).toBe(0)
  })
})

describe('o que NÃO é falha da habilidade', () => {
  it('erro atribuído a outra habilidade não conta contra esta', () => {
    const resultado = verificar(
      [analise({ gameId: 'd1', skillIds: [OUTRA] }), analise({ gameId: 'd2', skillIds: [OUTRA] })],
      [partida('d1', DEPOIS_1), partida('d2', DEPOIS_2)],
    )

    expect(resultado.falhas).toBe(0)
    expect(resultado.veredito).toBe('nao-reincidiu')
    expect(resultado.partidasVerificadas).toBe(2)
  })

  it('lance ok não é falha, mesmo com a habilidade atribuída', () => {
    const resultado = verificar(
      [analise({ gameId: 'd1', severity: 'ok' }), analise({ gameId: 'd2', severity: 'ok' })],
      [partida('d1', DEPOIS_1), partida('d2', DEPOIS_2)],
    )

    expect(resultado.falhas).toBe(0)
    expect(resultado.veredito).toBe('nao-reincidiu')
  })

  it('número raso não julga lance: análise rasa não vira reincidência', () => {
    // A regra é de `erros-recentes` e não é reimplementada aqui — este teste
    // existe para o dia em que alguém decidir reimplementá-la.
    const resultado = verificar(
      [analise({ gameId: 'd1', precisao: 'rasa' }), analise({ gameId: 'd2', precisao: 'rasa' })],
      [partida('d1', DEPOIS_1), partida('d2', DEPOIS_2)],
    )

    expect(resultado.falhas).toBe(0)
    expect(resultado.veredito).toBe('nao-reincidiu')
  })
})

// ------------------------------------------------------ limiar de exposição

describe('o limiar de exposição', () => {
  it('é configuração, não número cravado no comportamento', () => {
    // Afirma a REGRA (o limiar governa a fronteira), não o valor 2. Cravar o
    // número aqui defenderia o valor atual contra quem o recalibrasse.
    const { analises, partidas } = duasLimpas()
    const exigente: RetencaoConfig = { ...RETENCAO_CONFIG, minPartidasParaAfirmarMelhora: 3 }
    const permissivo: RetencaoConfig = { ...RETENCAO_CONFIG, minPartidasParaAfirmarMelhora: 2 }

    expect(verificar(analises, partidas, exigente).veredito).toBe('evidencia-insuficiente')
    expect(verificar(analises, partidas, permissivo).veredito).toBe('nao-reincidiu')
  })

  it('exige mais de uma partida: o padrão nunca afirma melhora com uma só', () => {
    // Uma partida não sustenta "você melhorou". Isto afirma a propriedade do
    // padrão, não o número.
    expect(RETENCAO_CONFIG.minPartidasParaAfirmarMelhora).toBeGreaterThan(1)
  })

  it('NÃO trava a reincidência: uma partida basta para dizer que voltou a falhar', () => {
    // A assimetria é a decisão central. Errar é fato observado; não errar é
    // ausência de evidência. Inverter a ordem em `julgar` reporta uma recaída
    // real como "ainda não deu para saber".
    const rigoroso: RetencaoConfig = { ...RETENCAO_CONFIG, minPartidasParaAfirmarMelhora: 5 }
    const resultado = verificar([analise({ gameId: 'd1' })], [partida('d1', DEPOIS_1)], rigoroso)

    expect(resultado.veredito).toBe('voltou-a-falhar')
  })
})

// -------------------------------------------------------------- contadores

describe('os números que sustentam o veredito', () => {
  it('conta ocorrências e partidas com falha separadamente', () => {
    const resultado = verificar(
      [
        analise({ gameId: 'd1', ply: 20 }),
        analise({ gameId: 'd1', ply: 30 }),
        analise({ gameId: 'd2', severity: 'ok', skillIds: [] }),
      ],
      [partida('d1', DEPOIS_1), partida('d2', DEPOIS_2)],
    )

    expect(resultado.falhas).toBe(2)
    expect(resultado.partidasComFalha).toBe(1)
    expect(resultado.partidasVerificadas).toBe(2)
  })

  it('a última falha é a da partida mais recente, não a da última análise lida', () => {
    const resultado = verificar(
      [analise({ gameId: 'd3' }), analise({ gameId: 'd1' })],
      [partida('d1', DEPOIS_1), partida('d3', DEPOIS_3)],
    )

    expect(resultado.ultimaFalhaEm).toBe(DEPOIS_3)
  })

  it('devolve o instante de treino que foi usado, para o resultado ser explicável', () => {
    expect(verificar([], []).treinadaEm).toBe(TREINO)
  })
})

describe('recusa em voz alta', () => {
  it('data de treino ilegível lança em vez de virar "sem evidência"', () => {
    // `sem-evidencia` significa "tudo normal, só falta jogar". Esconder um bug
    // de quem chama atrás dele é o falso verde clássico.
    expect(() =>
      verificarRetencao(ALVO, 'quinta passada', [], new Map(), { agora: AGORA }),
    ).toThrow(/ileg/i)
  })
})

// ------------------------------------------------------- instantes de treino

describe('instantesDeTreinoPorHabilidade', () => {
  function card(id: string, createdAt: string, skillIds: SkillId[]): ReviewCard {
    return {
      id,
      kind: 'erro-de-partida',
      skillIds,
      fen: FEN_QUALQUER,
      solutionUci: ['c4f7'],
      prompt: 'Encontre o melhor lance.',
      createdAt,
      dueAt: createdAt,
      scheduler: {
        stability: 1,
        difficulty: 5,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        state: 'new',
        lastReviewAt: null,
      },
    }
  }

  it('usa o card mais recente da habilidade, para a janela poder reiniciar', () => {
    const instantes = instantesDeTreinoPorHabilidade([
      card('c1', '2026-08-01T00:00:00.000Z', [ALVO]),
      card('c2', TREINO, [ALVO]),
    ])

    expect(instantes.get(ALVO)).toBe(TREINO)
  })

  it('compara INSTANTE e não texto: deslocamento de fuso não inverte a ordem', () => {
    // '2026-09-01T09:00:00.000-03:00' é 12:00Z, DEPOIS de 10:00Z — mas vem
    // ANTES na ordem alfabética. Comparar as strings escolheria o card errado,
    // e escolheria em silêncio.
    const comOffset = '2026-09-01T09:00:00.000-03:00'
    const instantes = instantesDeTreinoPorHabilidade([
      card('c1', '2026-09-01T10:00:00.000Z', [ALVO]),
      card('c2', comOffset, [ALVO]),
    ])

    expect(instantes.get(ALVO)).toBe(comOffset)
  })

  it('card com data ilegível não vira início de janela', () => {
    const instantes = instantesDeTreinoPorHabilidade([card('c1', 'sei lá quando', [ALVO])])

    expect(instantes.has(ALVO)).toBe(false)
  })

  it('registra cada habilidade do card', () => {
    const instantes = instantesDeTreinoPorHabilidade([card('c1', TREINO, [ALVO, OUTRA])])

    expect(instantes.get(ALVO)).toBe(TREINO)
    expect(instantes.get(OUTRA)).toBe(TREINO)
  })
})

describe('verificarRetencaoDeTreinos', () => {
  it('só verifica habilidade que virou treino', () => {
    const resultado = verificarRetencaoDeTreinos(
      new Map([[ALVO, TREINO]]),
      [analise({ gameId: 'd1' })],
      new Map([['d1', partida('d1', DEPOIS_1)]]),
      { agora: AGORA },
    )

    expect([...resultado.keys()]).toEqual([ALVO])
    expect(resultado.get(ALVO)?.veredito).toBe('voltou-a-falhar')
  })
})

// ----------------------------------------------------- varredura da tabela

describe('varredura: todo veredito tem cenário', () => {
  /** Cenários, um por veredito esperado. A chave é o veredito produzido. */
  const cenarios: Array<{ nome: string; produz: VereditoDeRetencao }> = [
    { nome: 'nenhuma partida depois', produz: verificar([], []).veredito },
    {
      nome: 'uma partida limpa',
      produz: verificar(
        [analise({ gameId: 'd1', severity: 'ok', skillIds: [] })],
        [partida('d1', DEPOIS_1)],
      ).veredito,
    },
    {
      nome: 'erro depois do treino',
      produz: verificar([analise({ gameId: 'd1' })], [partida('d1', DEPOIS_1)]).veredito,
    },
    {
      nome: 'duas partidas limpas',
      produz: (() => {
        const { analises, partidas } = duasLimpas()
        return verificar(analises, partidas).veredito
      })(),
    },
  ]

  const vereditos = Object.keys(AFIRMA_NUMERO) as VereditoDeRetencao[]

  it('a varredura encontrou vereditos para checar', () => {
    // Tabela vazia não é aprovação: sem esta linha, um `Record` que ficasse
    // vazio faria o teste abaixo passar sem ter olhado nada.
    expect(vereditos.length).toBeGreaterThan(0)
  })

  it('cada veredito da tabela é produzido por algum cenário', () => {
    const produzidos = new Set(cenarios.map((cenario) => cenario.produz))
    const semCenario = vereditos.filter((veredito) => !produzidos.has(veredito))

    expect(semCenario, `vereditos sem cenário nesta suíte: ${semCenario.join(', ')}`).toEqual([])
  })
})

// ------------------------------------------------- realimentação do planner

describe('realimentação do planner', () => {
  function perfil(): UserProfile {
    return {
      id: 'usuario-teste',
      createdAt: '2026-08-01T00:00:00.000Z',
      estimatedRating: 1100,
      dailyBudgetMinutes: 40,
      preferences: { boardTheme: 'claro', reducedMotion: false },
    }
  }

  /** Todas as habilidades iguais, para o teste isolar o que ele varia. */
  function masteryUniforme(valor: number): SkillMastery[] {
    return SKILL_IDS.map((skillId) => ({
      ...createMastery(skillId),
      attempts: 40,
      exposures: 40,
      recentAccuracy: valor,
      retentionAccuracy: valor,
      mastery: valor,
      confidence: 0.8,
    }))
  }

  function contexto(mastery: SkillMastery[]): PlannerContext {
    return {
      profile: perfil(),
      mastery,
      dueCards: [],
      recentGameErrors: [],
      now: AGORA,
    }
  }

  function habilidadesDoPlano(mastery: SkillMastery[]): SkillId[] {
    return buildDailyPlan(contexto(mastery), 'seed-fixa').blocks.flatMap((bloco) => bloco.skillIds)
  }

  function retencao(veredito: VereditoDeRetencao): ReadonlyMap<SkillId, RetencaoDeHabilidade> {
    const base: RetencaoDeHabilidade = {
      skillId: ALVO,
      veredito,
      treinadaEm: TREINO,
      partidasVerificadas: veredito === 'sem-evidencia' ? 0 : 3,
      partidasComFalha: veredito === 'voltou-a-falhar' ? 3 : 0,
      falhas: veredito === 'voltou-a-falhar' ? 3 : 0,
      ultimaFalhaEm: veredito === 'voltou-a-falhar' ? DEPOIS_1 : null,
    }
    return new Map([[ALVO, base]])
  }

  function masteryDoAlvo(lista: readonly SkillMastery[]): number {
    const alvo = lista.find((item) => item.skillId === ALVO)
    if (!alvo) throw new Error('habilidade alvo sumiu da lista')
    return alvo.mastery
  }

  it('habilidade que não reincidiu perde prioridade', () => {
    // A prioridade do planner cai quando a maestria sobe: o score é
    // `(1 - mastery) * valor + …`. O teste compara o MESMO estado sob dois
    // vereditos, para o efeito medido ser o da verificação e não o do estado.
    const base = masteryUniforme(0.4)

    const naoReincidiu = aplicarRetencaoDePartida(base, retencao('nao-reincidiu'))
    const semEvidencia = aplicarRetencaoDePartida(base, retencao('sem-evidencia'))

    expect(masteryDoAlvo(naoReincidiu)).toBeGreaterThan(masteryDoAlvo(semEvidencia))
    expect(masteryDoAlvo(semEvidencia)).toBe(masteryDoAlvo(base))
  })

  it('habilidade SEM evidência não perde prioridade', () => {
    // Este é o controle que separa "melhorou" de "não sei". Sem ele, a
    // realimentação silenciaria justamente a habilidade que ninguém verificou.
    const base = masteryUniforme(0.4)
    const ajustada = aplicarRetencaoDePartida(base, retencao('sem-evidencia'))

    expect(ajustada).toEqual(base)
    expect(habilidadesDoPlano(ajustada)).toEqual(habilidadesDoPlano(base))
  })

  it('habilidade que voltou a falhar GANHA prioridade', () => {
    const base = masteryUniforme(0.6)
    const ajustada = aplicarRetencaoDePartida(base, retencao('voltou-a-falhar'))
    const alvo = ajustada.find((item) => item.skillId === ALVO)

    expect(alvo?.mastery).toBeLessThan(0.6)
  })

  it('o efeito é temporário: nada é gravado no estado de origem', () => {
    // Reversível por construção. A verificação é recalculada das análises a
    // cada leitura, então o ajuste some sozinho quando o veredito muda — não há
    // bônus persistido esperando alguém lembrar de desfazê-lo.
    const base = masteryUniforme(0.4)
    const copia = base.map((item) => ({ ...item }))

    aplicarRetencaoDePartida(base, retencao('nao-reincidiu'))

    expect(base).toEqual(copia)
  })
})
