import { describe, expect, it } from 'vitest'

import {
  DETECTOR_CODES,
  DETECTOR_CONFIG,
  detectBackRank,
  detectFork,
  detectHangingPiece,
  detectKingSafety,
  detectMissedCapture,
  detectMissedMate,
  detectPin,
  runDetectors,
  type DetectorConfig,
  type DetectorResult,
} from '@/domain/games/detectors'
import {
  CODE_TO_SKILLS,
  explainMistake,
  skillsForExplanation,
  unknownRate,
  type ExplainableMoment,
} from '@/domain/games/explain'
import { SKILL_IDS, type MistakeExplanation } from '@/domain/types'
import { isValidFen } from '@/lib/chess'

/**
 * Todas as posições abaixo são FENs reais e legais. Cada detector tem um caso
 * positivo e um negativo — sem caso negativo, um detector que responde sempre
 * "sim" passaria no teste.
 */

/** Bispo que anda para uma casa atacada por peão, sem defensor. */
const FEN_PENDURADA = '6k1/8/8/4p3/8/8/8/2B3K1 w - - 0 1'
/** Torre e dama na mesma coluna: Txd8 ganha a dama de graça. */
const FEN_CAPTURA = '3q2k1/8/8/8/8/8/8/3RK3 w - - 0 1'
const FEN_SEM_CAPTURA = '6k1/8/8/8/8/8/8/3RK3 w - - 0 1'
/** Cf7+ ataca rei em h8 e dama em d8 ao mesmo tempo. */
const FEN_GARFO = '3q3k/8/8/6N1/8/8/8/6K1 w - - 0 1'
/** Bb5 cravaria o cavalo c6 contra o rei e8. */
const FEN_CRAVADA = '4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1'
/** Pretas a jogar: sair da última fileira com a torre abre o corredor. */
const FEN_CORREDOR = 'r5k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1'
/** Ta8 é mate; qualquer outro lance desperdiça. */
const FEN_MATE = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'
/** Mesma ideia, mas com casa de fuga em h7: não há mate. */
const FEN_SEM_MATE = '6k1/5pp1/7p/8/8/8/8/R5K1 w - - 0 1'
/** f2f3 abre a diagonal do bispo b6 até g1 e tira o defensor de g3. */
const FEN_REI_EXPOSTO = '6k1/8/1b6/8/7q/8/5PPP/7K w - - 0 1'
const FEN_REI_TRANQUILO = '6k1/8/1b6/8/7q/8/5PPP/1N5K w - - 0 1'
/** Final morno: nenhum motivo tático reconhecível. */
const FEN_AMBIGUA = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'

const TODAS_AS_FENS = [
  FEN_PENDURADA,
  FEN_CAPTURA,
  FEN_SEM_CAPTURA,
  FEN_GARFO,
  FEN_CRAVADA,
  FEN_CORREDOR,
  FEN_MATE,
  FEN_SEM_MATE,
  FEN_REI_EXPOSTO,
  FEN_REI_TRANQUILO,
  FEN_AMBIGUA,
]

/** Copia a configuração subindo o limiar do detector de peça pendurada. */
function comLimiarDePendurada(limiar: number): DetectorConfig {
  return {
    ...DETECTOR_CONFIG,
    hangingPiece: { ...DETECTOR_CONFIG.hangingPiece, limiarConfianca: limiar },
  }
}

describe('fixtures das posições', () => {
  it('usa apenas FENs válidas', () => {
    for (const fen of TODAS_AS_FENS) {
      expect(isValidFen(fen), fen).toBe(true)
    }
  })
})

describe('detector de peça pendurada', () => {
  it('positivo: o lance deixa o bispo atacado pelo peão e sem defensor', () => {
    const resultado = detectHangingPiece(FEN_PENDURADA, 'c1f4', 'c1e3')
    expect(resultado?.code).toBe('hanging-piece')
    expect(resultado?.confidence).toBeGreaterThanOrEqual(
      DETECTOR_CONFIG.hangingPiece.limiarConfianca,
    )
    expect(resultado?.detalhe).toContain('f4')
  })

  it('negativo: lance para casa segura não acusa nada', () => {
    expect(detectHangingPiece(FEN_PENDURADA, 'c1e3', 'c1f4')).toBeNull()
  })

  it('descarta o resultado quando a confiança fica abaixo do limiar', () => {
    expect(detectHangingPiece(FEN_PENDURADA, 'c1f4', 'c1e3', comLimiarDePendurada(0.99))).toBeNull()
  })
})

describe('detector de captura perdida', () => {
  it('positivo: havia Txd8 ganhando a dama', () => {
    const resultado = detectMissedCapture(FEN_CAPTURA, 'e1e2', 'd1d8')
    expect(resultado?.code).toBe('missed-capture')
    expect(resultado?.detalhe).toContain('d8')
  })

  it('negativo: sem captura disponível não há captura perdida', () => {
    expect(detectMissedCapture(FEN_SEM_CAPTURA, 'e1e2', 'd1d8')).toBeNull()
  })

  it('negativo: jogar a própria captura não é captura perdida', () => {
    expect(detectMissedCapture(FEN_CAPTURA, 'd1d8', 'd1d8')).toBeNull()
  })
})

describe('detector de garfo', () => {
  it('positivo: o melhor lance atacava rei e dama ao mesmo tempo', () => {
    const resultado = detectFork(FEN_GARFO, 'g1f1', 'g5f7')
    expect(resultado?.code).toBe('fork')
    expect(resultado?.detalhe).toContain('d8')
    expect(resultado?.detalhe).toContain('h8')
  })

  it('negativo: melhor lance sem ataque duplo', () => {
    expect(detectFork(FEN_GARFO, 'g1f1', 'g5e4')).toBeNull()
  })
})

describe('detector de cravada', () => {
  it('positivo: Bb5 cravava o cavalo contra o rei', () => {
    const resultado = detectPin(FEN_CRAVADA, 'f1e2', 'f1b5')
    expect(resultado?.code).toBe('pin')
    expect(resultado?.detalhe).toContain('c6')
  })

  it('negativo: melhor lance sem cravada nenhuma', () => {
    expect(detectPin(FEN_CRAVADA, 'f1e2', 'f1c4')).toBeNull()
  })
})

describe('detector de última fileira', () => {
  it('positivo: sair com a torre deixa o corredor sem defesa', () => {
    const resultado = detectBackRank(FEN_CORREDOR, 'a8a2', 'h7h6')
    expect(resultado?.code).toBe('back-rank')
    expect(resultado?.detalhe).toContain('e8')
  })

  it('negativo: dar respiro ao rei tira a fraqueza', () => {
    expect(detectBackRank(FEN_CORREDOR, 'h7h6', 'a8e8')).toBeNull()
  })
})

describe('detector de mate perdido', () => {
  it('positivo: havia Ta8 mate e o lance jogado foi outro', () => {
    const resultado = detectMissedMate(FEN_MATE, 'a1a2', 'a1a8')
    expect(resultado?.code).toBe('missed-mate')
    expect(resultado?.detalhe).toContain('a1a8')
  })

  it('negativo: com casa de fuga não há mate forçado curto', () => {
    expect(detectMissedMate(FEN_SEM_MATE, 'a1a2', 'a1a8')).toBeNull()
  })

  it('negativo: jogar o mate não é mate perdido', () => {
    expect(detectMissedMate(FEN_MATE, 'a1a8', 'a1a8')).toBeNull()
  })
})

describe('detector de segurança do rei', () => {
  it('positivo: o lance abre a diagonal até o próprio rei', () => {
    const resultado = detectKingSafety(FEN_REI_EXPOSTO, 'f2f3', 'h2h3')
    expect(resultado?.code).toBe('king-safety')
    expect(resultado?.confidence).toBeGreaterThanOrEqual(DETECTOR_CONFIG.kingSafety.limiarConfianca)
  })

  it('negativo: lance de peça longe do rei não muda a exposição', () => {
    expect(detectKingSafety(FEN_REI_TRANQUILO, 'b1c3', 'b1d2')).toBeNull()
  })
})

describe('conjunto de detectores', () => {
  it('devolve lista vazia numa posição sem motivo reconhecível', () => {
    expect(runDetectors(FEN_AMBIGUA, 'e1d1', 'e2e4')).toEqual([])
  })

  it('ordena por confiança decrescente e é determinístico', () => {
    const primeira = runDetectors(FEN_MATE, 'a1a2', 'a1a8')
    const segunda = runDetectors(FEN_MATE, 'a1a2', 'a1a8')
    expect(primeira).toEqual(segunda)
    expect(primeira.length).toBeGreaterThan(0)
    for (let i = 1; i < primeira.length; i += 1) {
      expect(primeira[i - 1].confidence).toBeGreaterThanOrEqual(primeira[i].confidence)
    }
  })

  it('devolve lista vazia quando o lance do usuário é ilegal na posição', () => {
    expect(runDetectors(FEN_MATE, 'a1a9', 'a1a8')).toEqual([])
  })
})

// ------------------------------------------------------------------ explicação

const MOMENTO_PENDURADA: ExplainableMoment = {
  fenBefore: FEN_PENDURADA,
  userMoveUci: 'c1f4',
  bestMoveUci: 'c1e3',
  expectedScoreLossPp: 21.4,
}

const MOMENTO_AMBIGUO: ExplainableMoment = {
  fenBefore: FEN_AMBIGUA,
  userMoveUci: 'e1d1',
  bestMoveUci: 'e2e4',
  expectedScoreLossPp: 4.2,
}

function partes(explicacao: MistakeExplanation): string[] {
  return [
    explicacao.oQueAconteceu,
    explicacao.sinalVisivel,
    explicacao.habitoQuePreveniria,
    explicacao.treinoGerado,
  ]
}

describe('explicação de erro', () => {
  it('usa a detecção de maior confiança acima do limiar', () => {
    const deteccoes: DetectorResult[] = [
      { code: 'hanging-piece', confidence: 0.7, detalhe: 'o bispo em f4' },
      { code: 'missed-mate', confidence: 0.95, detalhe: 'havia mate em um lance com a1a8' },
    ]
    const explicacao = explainMistake(MOMENTO_PENDURADA, deteccoes)
    expect(explicacao.code).toBe('missed-mate')
    expect(explicacao.confidence).toBe(0.95)
  })

  it('descarta detecção abaixo do limiar e assume o desconhecido', () => {
    const deteccoes: DetectorResult[] = [{ code: 'hanging-piece', confidence: 0.2 }]
    const explicacao = explainMistake(MOMENTO_PENDURADA, deteccoes)
    expect(explicacao.code).toBe('unknown')
    expect(explicacao.confidence).toBe(0)
  })

  it('posição ambígua vira unknown, não palpite', () => {
    const explicacao = explainMistake(MOMENTO_AMBIGUO, runDetectors(FEN_AMBIGUA, 'e1d1', 'e2e4'))
    expect(explicacao.code).toBe('unknown')
    expect(explicacao.oQueAconteceu).toContain('não consegui identificar')
    expect(explicacao.treinoGerado).toContain('Nenhum treino')
  })

  it('usa a notação do lance, não o UCI cru, nos textos', () => {
    const explicacao = explainMistake(MOMENTO_AMBIGUO, [])
    expect(explicacao.oQueAconteceu).toContain('Kd1')
    expect(explicacao.oQueAconteceu).toContain('e4')
    expect(explicacao.oQueAconteceu).toContain('4,2')
  })

  it('toda explicação tem as quatro partes preenchidas', () => {
    const codigos = [...DETECTOR_CODES, null]
    for (const code of codigos) {
      const deteccoes: DetectorResult[] = code
        ? [{ code, confidence: 0.99, detalhe: 'a peça em f4' }]
        : []
      const explicacao = explainMistake(MOMENTO_PENDURADA, deteccoes)
      for (const parte of partes(explicacao)) {
        expect(parte.trim().length, `${code ?? 'unknown'}: parte vazia`).toBeGreaterThan(20)
      }
    }
  })

  it('não humilha o jogador nem promete certeza que não tem', () => {
    for (const code of DETECTOR_CODES) {
      const explicacao = explainMistake(MOMENTO_PENDURADA, [{ code, confidence: 0.99 }])
      const texto = partes(explicacao).join(' ').toLowerCase()
      for (const proibida of ['burro', 'óbvio', 'obviamente', 'ridículo', 'terrível', 'péssimo']) {
        expect(texto, `${code} usa "${proibida}"`).not.toContain(proibida)
      }
    }
  })

  it('mapeia cada código para habilidades que existem no catálogo', () => {
    for (const skills of Object.values(CODE_TO_SKILLS)) {
      for (const skill of skills) {
        expect(SKILL_IDS).toContain(skill)
      }
    }
    expect(CODE_TO_SKILLS.unknown).toEqual([])
    expect(skillsForExplanation(explainMistake(MOMENTO_AMBIGUO, []))).toEqual([])
    expect(
      skillsForExplanation(explainMistake(MOMENTO_PENDURADA, [{ code: 'fork', confidence: 0.9 }])),
    ).toContain('tactics.fork')
  })
})

describe('taxa de unknown', () => {
  function explicacaoCom(code: string): MistakeExplanation {
    return {
      code,
      confidence: code === 'unknown' ? 0 : 0.8,
      oQueAconteceu: 'a',
      sinalVisivel: 'b',
      habitoQuePreveniria: 'c',
      treinoGerado: 'd',
    }
  }

  it('mede a fração de explicações sem motivo identificado', () => {
    const amostra = ['unknown', 'fork', 'unknown', 'pin'].map(explicacaoCom)
    expect(unknownRate(amostra)).toBe(0.5)
    expect(unknownRate([explicacaoCom('fork')])).toBe(0)
    expect(unknownRate([explicacaoCom('unknown')])).toBe(1)
  })

  it('não divide por zero com lista vazia', () => {
    expect(unknownRate([])).toBe(0)
  })
})
