/**
 * Portão das QUATRO REGRAS DE EMPATE e do histórico de que duas delas dependem.
 *
 * O DEFEITO QUE ESTE ARQUIVO GUARDA. As três posições de `empate-defendido` do
 * currículo são empate teórico, e a defesa natural em rei-e-peão termina em
 * TRÍPLICE REPETIÇÃO — o rei vai e volta na casa que segura, e o adversário não
 * tem como progredir. Enquanto `avaliarObjetivo` só olhava o FEN, o aluno
 * segurava o empate exatamente como a lição ensina e a tela nunca dizia
 * "cumprido". O app punia quem fez certo, e nada no console apontava para isso.
 *
 * O QUE ESTE PORTÃO COBRA:
 *
 * 1. as quatro regras são reconhecidas, cada uma com caso próprio, e a REGRA
 *    aparece no resultado — um "cumprido" mudo não ensina nada;
 * 2. a varredura parte da FONTE (`REGRAS_DE_EMPATE`), nunca de uma lista escrita
 *    à mão aqui: regra nova sem caso reprova;
 * 3. o LADO DE CIMA da régua, que é o mais fácil de esquecer: enquanto o empate
 *    NÃO está consumado, a resposta continua sendo `em-andamento`. Duas
 *    ocorrências não são repetição, e 99 meios-lances não são 50 lances.
 *    Antecipar o "cumprido" seria o mesmo defeito de sinal trocado, ao
 *    contrário: dizer que o aluno segurou o empate quando ele apenas ainda não
 *    perdeu;
 * 4. a repetição é contada por POSIÇÃO, com vez, roque e en passant dentro e os
 *    contadores fora — não por FEN inteiro e não só pelo tabuleiro;
 * 5. as duas regras que dependem de histórico valem também CONTRA o aluno: quem
 *    tinha de dar mate e repetiu, ou deixou os 50 lances passarem, não cumpriu.
 *
 * O QUE ELE NÃO PROVA: que a tela mostra a regra. Isso é `endgames-tela.test.ts`
 * (a apresentação existe para toda regra) e `tests/e2e/finais.spec.ts` (aparece
 * no navegador).
 */

import { describe, expect, it } from 'vitest'
import {
  REGRAS_DE_EMPATE,
  REGRAS_DO_EMPATE,
  avaliarObjetivo,
  avancarContexto,
  contextoInicial,
  meiosLancesSemProgresso,
  ocorrenciasDaPosicao,
  percorrerTentativa,
  reproduzirLinhaModelo,
  type ObjetivoFinal,
  type RegraDeEmpate,
} from '@/domain/endgames'
import { CURRICULO_FINAIS } from '@/content/endgames'
import { identidadeDePosicao, positionStatus } from '@/lib/chess'

const EMPATAR: ObjetivoFinal = { tipo: 'empate-defendido' }
const MATE_EM_2: ObjetivoFinal = { tipo: 'mate-em', lancesMaximos: 2 }

/**
 * Peão de torre com o rei defensor no canto: é a posição `casas-chave-peao-de-torre`
 * do currículo, e é onde o defeito aparecia de verdade.
 *
 * As pretas defendem indo e voltando entre a8 e b8. As brancas, sem progresso
 * possível, vão e voltam entre a6 e b6. Quatro meios-lances devolvem a MESMA
 * posição; oito a devolvem pela terceira vez, e aí o empate está consumado.
 */
const PEAO_DE_TORRE = 'k7/8/K7/P7/8/8/8/8 b - - 0 1'
const VAI_E_VOLTA = ['a8b8', 'a6b6', 'b8a8', 'b6a6'] as const

function defesaComVoltas(voltas: number): readonly string[] {
  return Array.from({ length: voltas }, () => VAI_E_VOLTA).flat()
}

describe('empate por repetição', () => {
  it('reconhece o empate na TERCEIRA ocorrência da mesma posição', () => {
    // Duas voltas = a posição inicial aparece pela terceira vez.
    const { fen, contexto } = percorrerTentativa({
      fenInicial: PEAO_DE_TORRE,
      ladoDoAluno: 'b',
      lancesJogados: defesaComVoltas(2),
    })
    expect(identidadeDePosicao(fen), 'a defesa deveria voltar à posição inicial').toBe(
      identidadeDePosicao(PEAO_DE_TORRE),
    )
    expect(ocorrenciasDaPosicao(fen, contexto)).toBe(REGRAS_DO_EMPATE.ocorrenciasParaRepeticao)
    expect(avaliarObjetivo(fen, EMPATAR, contexto)).toEqual({
      estado: 'cumprido',
      motivo: 'empate-alcancado',
      regraDoEmpate: 'repeticao',
    })
  })

  it('NÃO antecipa o empate na segunda ocorrência', () => {
    const { fen, contexto } = percorrerTentativa({
      fenInicial: PEAO_DE_TORRE,
      ladoDoAluno: 'b',
      lancesJogados: defesaComVoltas(1),
    })
    expect(ocorrenciasDaPosicao(fen, contexto)).toBe(REGRAS_DO_EMPATE.ocorrenciasParaRepeticao - 1)
    const resultado = avaliarObjetivo(fen, EMPATAR, contexto)
    expect(resultado.estado, 'ainda não perder não é ter segurado o empate').toBe('em-andamento')
    expect(resultado.regraDoEmpate).toBeNull()
  })

  it('a repetição também derruba quem tinha de dar mate', () => {
    const { fen, contexto } = percorrerTentativa({
      fenInicial: PEAO_DE_TORRE,
      ladoDoAluno: 'w',
      lancesJogados: defesaComVoltas(2),
    })
    expect(avaliarObjetivo(fen, MATE_EM_2, contexto)).toEqual({
      estado: 'falhou',
      motivo: 'empate-indevido',
      regraDoEmpate: 'repeticao',
    })
  })

  it('conta por POSIÇÃO, e não por FEN inteiro: os contadores não separam ocorrências', () => {
    const { fen, contexto } = percorrerTentativa({
      fenInicial: PEAO_DE_TORRE,
      ladoDoAluno: 'b',
      lancesJogados: defesaComVoltas(2),
    })
    // O FEN muda a cada lance (contador de meios-lances e número do lance), e é
    // exatamente por isso que a identidade existe. Comparar FEN inteiro nunca
    // acharia repetição nenhuma.
    expect(fen).not.toBe(PEAO_DE_TORRE)
    expect(meiosLancesSemProgresso(fen)).toBe(defesaComVoltas(2).length)
    expect(ocorrenciasDaPosicao(fen, contexto)).toBeGreaterThanOrEqual(
      REGRAS_DO_EMPATE.ocorrenciasParaRepeticao,
    )
  })

  it('mesmo tabuleiro com a VEZ trocada não é a mesma posição', () => {
    // A posição depois de duas voltas e meia tem o mesmo tabuleiro da inicial em
    // vários pontos, mas quem joga muda. Se a identidade ignorasse a vez, a
    // contagem dobraria e o empate sairia cedo demais.
    const doAluno = percorrerTentativa({
      fenInicial: PEAO_DE_TORRE,
      ladoDoAluno: 'b',
      lancesJogados: defesaComVoltas(2),
    })
    const comUmLanceAMais = percorrerTentativa({
      fenInicial: PEAO_DE_TORRE,
      ladoDoAluno: 'b',
      lancesJogados: [...defesaComVoltas(2), 'a8b8'],
    })
    expect(identidadeDePosicao(comUmLanceAMais.fen)).not.toBe(identidadeDePosicao(doAluno.fen))
  })
})

describe('empate pela regra dos 50 lances', () => {
  /** Torre contra rei: material de sobra para mate, e nenhum progresso feito. */
  const SEM_PROGRESSO = (meiosLances: number) => `3k4/8/8/8/8/8/4R3/4K3 b - - ${meiosLances} 60`

  it('reconhece o empate quando os meios-lances chegam ao limite', () => {
    const fen = SEM_PROGRESSO(REGRAS_DO_EMPATE.meiosLancesSemProgresso)
    expect(avaliarObjetivo(fen, EMPATAR, contextoInicial('b'))).toEqual({
      estado: 'cumprido',
      motivo: 'empate-alcancado',
      regraDoEmpate: 'regra-dos-50-lances',
    })
  })

  it('NÃO antecipa o empate um meio-lance antes', () => {
    const fen = SEM_PROGRESSO(REGRAS_DO_EMPATE.meiosLancesSemProgresso - 1)
    const resultado = avaliarObjetivo(fen, EMPATAR, contextoInicial('b'))
    expect(resultado.estado).toBe('em-andamento')
    expect(resultado.regraDoEmpate).toBeNull()
  })

  it('também derruba quem tinha de dar mate', () => {
    const fen = SEM_PROGRESSO(REGRAS_DO_EMPATE.meiosLancesSemProgresso)
    expect(avaliarObjetivo(fen, MATE_EM_2, contextoInicial('w'))).toEqual({
      estado: 'falhou',
      motivo: 'empate-indevido',
      regraDoEmpate: 'regra-dos-50-lances',
    })
  })

  it('lê o contador do FEN, e não o número do lance', () => {
    expect(meiosLancesSemProgresso('3k4/8/8/8/8/8/4R3/4K3 b - - 37 60')).toBe(37)
  })

  it('FEN sem contador utilizável lança em vez de zerar a regra em silêncio', () => {
    expect(() => meiosLancesSemProgresso('3k4/8/8/8/8/8/4R3/4K3 b - -')).toThrow()
  })
})

describe('a ordem das regras é a decisão declarada', () => {
  it('afogamento vem antes da regra dos 50 lances', () => {
    // As duas valem nesta posição. O aluno acabou de VER o afogamento no
    // tabuleiro; os 50 lances se acumularam há muito tempo.
    const fen = 'k7/P7/K7/8/8/8/8/8 b - - 100 60'
    expect(positionStatus(fen).isStalemate).toBe(true)
    expect(avaliarObjetivo(fen, EMPATAR, contextoInicial('b')).regraDoEmpate).toBe('afogamento')
  })

  it('material insuficiente vem antes da regra dos 50 lances', () => {
    const fen = '8/k7/8/8/8/8/8/K7 w - - 100 60'
    expect(positionStatus(fen).isInsufficientMaterial).toBe(true)
    expect(avaliarObjetivo(fen, EMPATAR, contextoInicial('b')).regraDoEmpate).toBe(
      'material-insuficiente',
    )
  })
})

describe('varredura das regras de empate', () => {
  /**
   * Um caso por regra, montado a partir da FONTE.
   *
   * `nao-identificada` é `null` de propósito: ela NÃO é uma regra do xadrez, é a
   * ausência de nome — o canário para um empate que o `chess.js` reconhece e as
   * quatro regras não explicam. Ela não deve ser alcançável por nenhum caso
   * real, e o teste seguinte cobra isso.
   */
  const CASOS: Record<RegraDeEmpate, { fen: string; lancesJogados: readonly string[] } | null> = {
    afogamento: { fen: 'k7/P7/K7/8/8/8/8/8 b - - 0 1', lancesJogados: [] },
    'material-insuficiente': { fen: '8/k7/8/8/8/8/8/K7 w - - 0 1', lancesJogados: [] },
    repeticao: { fen: PEAO_DE_TORRE, lancesJogados: defesaComVoltas(2) },
    'regra-dos-50-lances': { fen: '3k4/8/8/8/8/8/4R3/4K3 b - - 100 60', lancesJogados: [] },
    'nao-identificada': null,
  }

  it('toda regra do xadrez tem caso, e ele devolve exatamente aquela regra', () => {
    let verificadas = 0
    for (const regra of REGRAS_DE_EMPATE) {
      const caso = CASOS[regra]
      if (caso === null) {
        continue
      }
      const { fen, contexto } = percorrerTentativa({
        fenInicial: caso.fen,
        ladoDoAluno: 'b',
        lancesJogados: caso.lancesJogados,
      })
      const resultado = avaliarObjetivo(fen, EMPATAR, contexto)
      expect(resultado.estado, regra).toBe('cumprido')
      expect(resultado.regraDoEmpate, regra).toBe(regra)
      verificadas += 1
    }
    // Portão com zero verificações tem de reprovar.
    expect(verificadas, 'nenhuma regra de empate foi exercitada').toBe(REGRAS_DE_EMPATE.length - 1)
  })

  it('nenhum empate reconhecido cai no canário "não identificada"', () => {
    for (const regra of REGRAS_DE_EMPATE) {
      const caso = CASOS[regra]
      if (caso === null) {
        continue
      }
      const { fen, contexto } = percorrerTentativa({
        fenInicial: caso.fen,
        ladoDoAluno: 'b',
        lancesJogados: caso.lancesJogados,
      })
      expect(avaliarObjetivo(fen, EMPATAR, contexto).regraDoEmpate, regra).not.toBe(
        'nao-identificada',
      )
    }
  })

  it('posição viva não inventa regra de empate nenhuma', () => {
    const viva = '3k4/8/8/P7/8/8/8/K7 b - - 0 1'
    expect(positionStatus(viva).isDraw).toBe(false)
    expect(avaliarObjetivo(viva, EMPATAR, contextoInicial('b')).regraDoEmpate).toBeNull()
  })
})

describe('o currículo não produz "cumprido" mudo', () => {
  it('toda posição de empate defendido termina com a regra do empate NOMEADA', () => {
    let verificadas = 0
    for (const licao of CURRICULO_FINAIS) {
      for (const posicao of licao.posicoes) {
        if (posicao.objetivo.tipo !== 'empate-defendido') {
          continue
        }
        verificadas += 1
        const { resultadoFinal } = reproduzirLinhaModelo(posicao)
        expect(resultadoFinal.estado, posicao.id).toBe('cumprido')
        // O aluno tem de poder ler POR QUE o empate valeu. `null` aqui é o
        // "cumprido" mudo que esta frente existe para eliminar.
        expect(
          resultadoFinal.regraDoEmpate,
          `${posicao.id} cumpriu sem dizer por qual regra`,
        ).not.toBeNull()
      }
    }
    // Portão com zero verificações tem de reprovar.
    expect(verificadas, 'o currículo não tem mais posição de empate defendido').toBeGreaterThan(0)
  })
})

describe('histórico da tentativa', () => {
  it('conta os lances DO ALUNO pela cor de quem jogou', () => {
    const { contexto } = percorrerTentativa({
      fenInicial: PEAO_DE_TORRE,
      ladoDoAluno: 'b',
      lancesJogados: defesaComVoltas(2),
    })
    expect(contexto.lancesDoAluno).toBe(defesaComVoltas(2).length / 2)
    expect(contexto.identidadesAnteriores).toHaveLength(defesaComVoltas(2).length)
  })

  it('conta zero lances do aluno quando o adversário é que jogou', () => {
    const { contexto } = percorrerTentativa({
      fenInicial: PEAO_DE_TORRE,
      ladoDoAluno: 'w',
      lancesJogados: ['a8b8'],
    })
    expect(contexto.lancesDoAluno).toBe(0)
    expect(contexto.identidadesAnteriores).toHaveLength(1)
  })

  it('a lista de anteriores guarda a posição de ANTES do lance', () => {
    const contexto = avancarContexto(contextoInicial('b'), PEAO_DE_TORRE, 'b')
    expect(contexto.identidadesAnteriores).toEqual([identidadeDePosicao(PEAO_DE_TORRE)])
  })

  it('lance ilegal lança em vez de produzir um contexto quase certo', () => {
    expect(() =>
      percorrerTentativa({
        fenInicial: PEAO_DE_TORRE,
        ladoDoAluno: 'b',
        lancesJogados: ['a8a7'],
      }),
    ).toThrow(/ilegal/)
  })

  it('o contexto inicial não tem histórico nem lance do aluno', () => {
    expect(contextoInicial('w')).toEqual({
      ladoDoAluno: 'w',
      lancesDoAluno: 0,
      identidadesAnteriores: [],
    })
  })
})
