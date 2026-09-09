import { describe, expect, it } from 'vitest'

import {
  SEVERITY_CONFIG,
  classifySeverity,
  expectedScoreFromCp,
  expectedScoreFromEval,
  maxSeverity,
  moveLossPp,
  severityContextFromEvals,
  severityRank,
} from '@/domain/games/severity'

describe('pontuação esperada a partir de centipeões', () => {
  it('trata posição igual como 0,5 e é simétrica', () => {
    expect(expectedScoreFromCp(0)).toBeCloseTo(0.5, 10)
    expect(expectedScoreFromCp(200) + expectedScoreFromCp(-200)).toBeCloseTo(1, 10)
  })

  it('é monótona e fica dentro de 0..1', () => {
    const amostras = [-2000, -600, -100, 0, 100, 600, 2000].map((cp) => expectedScoreFromCp(cp))
    for (let i = 1; i < amostras.length; i += 1) {
      expect(amostras[i]).toBeGreaterThan(amostras[i - 1])
    }
    expect(amostras[0]).toBeGreaterThan(0)
    expect(amostras[amostras.length - 1]).toBeLessThan(1)
  })

  it('achata as pontas: perder 200 cp custa menos quando a posição já está ganha', () => {
    const perdaNoEquilibrio = expectedScoreFromCp(100) - expectedScoreFromCp(-100)
    const perdaNaVantagem = expectedScoreFromCp(1000) - expectedScoreFromCp(800)
    expect(perdaNaVantagem).toBeLessThan(perdaNoEquilibrio)
  })

  it('limita centipeões absurdos pelo teto configurado', () => {
    expect(expectedScoreFromCp(99_999)).toBe(expectedScoreFromCp(SEVERITY_CONFIG.tetoCp))
  })

  it('trata mate como posição decidida', () => {
    expect(expectedScoreFromEval({ scoreCp: null, mateIn: 3 })).toBe(1)
    expect(expectedScoreFromEval({ scoreCp: null, mateIn: -3 })).toBe(0)
    expect(expectedScoreFromEval({ scoreCp: null, mateIn: null })).toBe(0.5)
  })
})

describe('perda do lance em pontos percentuais', () => {
  it('inverte a perspectiva da avaliação depois do lance', () => {
    // Estava igual; depois do lance o adversário está +300 na perspectiva dele.
    const perda = moveLossPp({ scoreCp: 0, mateIn: null }, { scoreCp: 300, mateIn: null })
    expect(perda).toBeCloseTo((0.5 - (1 - expectedScoreFromCp(300))) * 100, 10)
    expect(perda).toBeGreaterThan(20)
  })

  it('não devolve perda negativa quando o lance melhora a avaliação', () => {
    expect(moveLossPp({ scoreCp: 0, mateIn: null }, { scoreCp: -300, mateIn: null })).toBe(0)
  })
})

describe('bandas de severidade', () => {
  it('classifica exatamente nas bordas das bandas', () => {
    expect(classifySeverity(0)).toBe('ok')
    expect(classifySeverity(2.9)).toBe('ok')
    expect(classifySeverity(3)).toBe('imprecisao')
    expect(classifySeverity(7.99)).toBe('imprecisao')
    expect(classifySeverity(8)).toBe('erro')
    expect(classifySeverity(18)).toBe('erro')
    expect(classifySeverity(18.1)).toBe('erro-grave')
  })

  it('usa os limiares do SEVERITY_CONFIG, não números soltos', () => {
    const { bandas } = SEVERITY_CONFIG
    expect(classifySeverity(bandas.imprecisaoMinPp)).toBe('imprecisao')
    expect(classifySeverity(bandas.erroMinPp)).toBe('erro')
    expect(classifySeverity(bandas.erroGraveAcimaPp + 0.1)).toBe('erro-grave')
  })
})

describe('overrides de severidade', () => {
  it('perder mate forçado sobe a severidade mesmo com perda pequena', () => {
    expect(classifySeverity(1)).toBe('ok')
    expect(classifySeverity(1, { perdeuMateForcado: true })).toBe('erro-grave')
  })

  it('entregar mate forçado ao adversário sobe a severidade', () => {
    expect(classifySeverity(4, { entrouEmMateForcado: true })).toBe('erro-grave')
  })

  it('entregar material limpo sobe a severidade até erro', () => {
    expect(classifySeverity(1, { materialEntregueCp: 300 })).toBe('erro')
    expect(classifySeverity(1, { materialEntregueCp: 299 })).toBe('ok')
  })

  it('override nunca rebaixa uma severidade já maior', () => {
    expect(classifySeverity(30, { materialEntregueCp: 300 })).toBe('erro-grave')
  })

  it('deriva o contexto de mate das avaliações antes e depois', () => {
    const perdeu = severityContextFromEvals(
      { scoreCp: null, mateIn: 2 },
      { scoreCp: -500, mateIn: null },
    )
    expect(perdeu.perdeuMateForcado).toBe(true)

    const manteve = severityContextFromEvals(
      { scoreCp: null, mateIn: 2 },
      { scoreCp: null, mateIn: -1 },
    )
    expect(manteve.perdeuMateForcado).toBe(false)

    const sofreu = severityContextFromEvals(
      { scoreCp: 0, mateIn: null },
      { scoreCp: null, mateIn: 1 },
    )
    expect(sofreu.entrouEmMateForcado).toBe(true)
  })
})

describe('ordem das severidades', () => {
  it('ordena de ok a erro-grave', () => {
    expect(severityRank('ok')).toBeLessThan(severityRank('imprecisao'))
    expect(severityRank('imprecisao')).toBeLessThan(severityRank('erro'))
    expect(severityRank('erro')).toBeLessThan(severityRank('erro-grave'))
  })

  it('maxSeverity devolve a mais grave das duas', () => {
    expect(maxSeverity('ok', 'erro')).toBe('erro')
    expect(maxSeverity('erro-grave', 'imprecisao')).toBe('erro-grave')
  })
})
