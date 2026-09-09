import { describe, expect, it } from 'vitest'

import {
  CRITICAL_CONFIG,
  ordenarPorPly,
  selectCandidatePositions,
  selectCriticalMoments,
  type CriticalConfig,
  type ShallowScan,
} from '@/domain/games/critical'
import { classifySeverity } from '@/domain/games/severity'
import type { MistakeExplanation, PositionAnalysis } from '@/domain/types'
import { START_FEN, applyMove, legalMoves } from '@/lib/chess'

/**
 * Gera uma partida real de 40 meios-lances para ter FENs válidas e alternância
 * de lado. A escolha do lance é determinística: mesma sequência sempre.
 */
function gerarPartida(plies: number): { fenBefore: string; uci: string; melhor: string }[] {
  const lances: { fenBefore: string; uci: string; melhor: string }[] = []
  let fen = START_FEN

  for (let ply = 1; ply <= plies; ply += 1) {
    const legais = legalMoves(fen).sort((a, b) => a.uci.localeCompare(b.uci))
    if (legais.length === 0) break
    const escolhido = legais[(ply * 7) % legais.length]
    const aplicado = applyMove(fen, escolhido.uci)
    if (!aplicado) break
    lances.push({ fenBefore: fen, uci: escolhido.uci, melhor: legais[0].uci })
    fen = aplicado.fenAfter
  }

  return lances
}

/**
 * Perdas em pp. A partida é ruim de propósito: muitos erros pequenos e alguns
 * grandes, dos dois lados, para o teto de momentos realmente ser exercitado.
 */
function perdaDoPly(ply: number): number {
  if (ply % 10 === 0) return 20 + ply / 10
  if (ply % 3 === 0) return 9 + ply / 10
  if (ply % 5 === 0) return 4 + ply / 10
  return 1.5
}

function montarAnalises(plies = 40): PositionAnalysis[] {
  return gerarPartida(plies).map((lance, indice) => {
    const ply = indice + 1
    const perda = perdaDoPly(ply)
    return {
      gameId: 'partida-1',
      ply,
      fenBefore: lance.fenBefore,
      userMoveUci: lance.uci,
      bestMoveUci: lance.melhor,
      pv: [lance.melhor],
      scoreCp: 0,
      mateIn: null,
      expectedScoreLossPp: perda,
      severity: classifySeverity(perda),
      skillIds: [],
      explanationCode: 'unknown',
    }
  })
}

function comConfig(patch: Partial<CriticalConfig>): CriticalConfig {
  return { ...CRITICAL_CONFIG, ...patch }
}

describe('varredura rasa', () => {
  const scans: ShallowScan[] = [
    {
      ply: 1,
      fenBefore: START_FEN,
      moveUci: 'e2e4',
      expectedScoreBefore: 0.52,
      expectedScoreAfter: 0.51,
      isUserMove: true,
    },
    {
      ply: 3,
      fenBefore: START_FEN,
      moveUci: 'g1f3',
      expectedScoreBefore: 0.6,
      expectedScoreAfter: 0.3,
      isUserMove: true,
    },
    {
      ply: 5,
      fenBefore: START_FEN,
      moveUci: 'd2d4',
      expectedScoreBefore: 0.6,
      expectedScoreAfter: 0.5,
      isUserMove: true,
    },
    {
      ply: 4,
      fenBefore: START_FEN,
      moveUci: 'e7e5',
      expectedScoreBefore: 0.9,
      expectedScoreAfter: 0.1,
      isUserMove: false,
    },
  ]

  it('marca só saltos de avaliação, não todo lance', () => {
    const candidatos = selectCandidatePositions(scans)
    expect(candidatos.map((item) => item.ply)).toEqual([3, 5])
  })

  it('ignora lances do adversário mesmo com queda enorme', () => {
    expect(selectCandidatePositions(scans).some((item) => item.ply === 4)).toBe(false)
  })

  it('respeita o teto de candidatos aprofundados', () => {
    const muitos = selectCandidatePositions(scans, comConfig({ maxCandidatos: 1 }))
    expect(muitos).toHaveLength(1)
    expect(muitos[0].ply).toBe(3)
  })
})

describe('seleção de momentos críticos', () => {
  const analises = montarAnalises()

  it('a partida gerada tem 40 meios-lances com FENs alternando o lado', () => {
    expect(analises).toHaveLength(40)
    expect(analises[0].fenBefore.split(' ')[1]).toBe('w')
    expect(analises[1].fenBefore.split(' ')[1]).toBe('b')
  })

  it('nunca passa do limite configurado, mesmo com muitos erros', () => {
    const candidatos = analises.filter(
      (analise) => analise.ply % 2 === 1 && analise.severity !== 'ok',
    )
    expect(candidatos.length).toBeGreaterThan(CRITICAL_CONFIG.maxMomentos)

    const momentos = selectCriticalMoments(analises, { userColor: 'w' })
    expect(momentos).toHaveLength(CRITICAL_CONFIG.maxMomentos)
  })

  it('escolhe os piores lances, não os primeiros', () => {
    const momentos = selectCriticalMoments(analises, {
      userColor: 'w',
      config: comConfig({ maxMomentos: 3 }),
    })
    const perdas = momentos.map((momento) => momento.expectedScoreLossPp)
    const todasAsPerdas = analises
      .filter((analise) => analise.ply % 2 === 1)
      .map((analise) => analise.expectedScoreLossPp)
      .sort((a, b) => b - a)
    expect(perdas).toEqual(todasAsPerdas.slice(0, 3))
  })

  it('só destaca lances do lado do usuário', () => {
    const brancas = selectCriticalMoments(analises, { userColor: 'w' })
    expect(brancas.every((momento) => momento.ply % 2 === 1)).toBe(true)

    const pretas = selectCriticalMoments(analises, { userColor: 'b' })
    expect(pretas.every((momento) => momento.ply % 2 === 0)).toBe(true)
  })

  it('desempata de forma determinística: maior perda, depois ply menor', () => {
    const empatadas: PositionAnalysis[] = [11, 3, 7].map((ply) => ({
      ...analises[0],
      ply,
      expectedScoreLossPp: 12,
      severity: 'erro',
    }))
    const momentos = selectCriticalMoments(empatadas, { userColor: 'w' })
    expect(momentos.map((momento) => momento.ply)).toEqual([3, 7, 11])
  })

  it('é estável entre chamadas com a mesma entrada', () => {
    const primeira = selectCriticalMoments(analises, { userColor: 'w' })
    const segunda = selectCriticalMoments(analises, { userColor: 'w' })
    expect(primeira).toEqual(segunda)
  })

  it('ignora lances classificados como ok', () => {
    const momentos = selectCriticalMoments(analises, { userColor: 'w' })
    expect(momentos.every((momento) => momento.severity !== 'ok')).toBe(true)
  })

  it('devolve lista vazia numa partida sem erros', () => {
    const limpa = analises.map((analise) => ({
      ...analise,
      expectedScoreLossPp: 0.4,
      severity: classifySeverity(0.4),
    }))
    expect(selectCriticalMoments(limpa, { userColor: 'w' })).toEqual([])
  })

  it('anexa a explicação já calculada do ply, quando existe', () => {
    const explicacao: MistakeExplanation = {
      code: 'hanging-piece',
      confidence: 0.8,
      oQueAconteceu: 'a',
      sinalVisivel: 'b',
      habitoQuePreveniria: 'c',
      treinoGerado: 'd',
    }
    const momentos = selectCriticalMoments(analises, {
      userColor: 'w',
      explanations: { 39: explicacao },
    })
    const comExplicacao = momentos.find((momento) => momento.ply === 39)
    expect(comExplicacao?.explanation).toEqual(explicacao)
    expect(momentos.find((momento) => momento.ply !== 39)?.explanation).toBeNull()
  })

  it('completa até o mínimo só quando o produto pede', () => {
    const quaseLimpa = analises.map((analise) => ({
      ...analise,
      expectedScoreLossPp: analise.ply === 1 ? 12 : 2.5,
      severity: classifySeverity(analise.ply === 1 ? 12 : 2.5),
    }))

    expect(selectCriticalMoments(quaseLimpa, { userColor: 'w' })).toHaveLength(1)

    const completada = selectCriticalMoments(quaseLimpa, {
      userColor: 'w',
      config: comConfig({ completarAteMinimo: true }),
    })
    expect(completada).toHaveLength(CRITICAL_CONFIG.minMomentos)
    expect(completada[0].ply).toBe(1)
  })

  it('ordenarPorPly devolve a mesma seleção em ordem cronológica', () => {
    const momentos = selectCriticalMoments(analises, { userColor: 'w' })
    const cronologica = ordenarPorPly(momentos)
    expect(cronologica).toHaveLength(momentos.length)
    for (let i = 1; i < cronologica.length; i += 1) {
      expect(cronologica[i].ply).toBeGreaterThan(cronologica[i - 1].ply)
    }
  })
})
