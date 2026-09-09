import { describe, expect, it } from 'vitest'
import { importPgnTextDetailed } from '@/lib/importers'
import {
  PGN_LIMITS,
  PgnLimitError,
  verificarPartida,
  type PgnLimits,
} from '@/lib/importers/pgn-limits'
import { matePastor } from '../fixtures/games'

/** Limites minúsculos, para o teste não precisar gerar megabytes. */
const APERTADO: PgnLimits = {
  ...PGN_LIMITS,
  maxCaracteres: 400,
  maxPartidas: 2,
  maxCaracteresPorPartida: 200,
  maxComentarios: 2,
  maxCaracteresPorComentario: 20,
}

describe('PGN como entrada não confiável', () => {
  it('recusa texto acima do teto, com mensagem e código', () => {
    const gigante = 'x'.repeat(APERTADO.maxCaracteres + 1)
    try {
      importPgnTextDetailed(gigante, { limits: APERTADO })
      throw new Error('deveria ter recusado')
    } catch (e) {
      expect(e).toBeInstanceOf(PgnLimitError)
      expect((e as PgnLimitError).code).toBe('texto-grande-demais')
    }
  })

  it('recusa caractere de controle, que denuncia arquivo binário renomeado', () => {
    try {
      importPgnTextDetailed(`${matePastor}\u0000`, { limits: APERTADO })
      throw new Error('deveria ter recusado')
    } catch (e) {
      expect((e as PgnLimitError).code).toBe('caracteres-de-controle')
    }
  })

  it('aceita tab, LF e CR, que são legítimos em PGN', () => {
    const comCrLf = matePastor.replace(/\n/g, '\r\n')
    expect(() => importPgnTextDetailed(comCrLf)).not.toThrow()
  })

  it('recusa lote com partidas demais', () => {
    const lote = [matePastor, matePastor, matePastor].join('\n\n')
    try {
      importPgnTextDetailed(lote, { limits: { ...APERTADO, maxCaracteres: 100_000 } })
      throw new Error('deveria ter recusado')
    } catch (e) {
      expect((e as PgnLimitError).code).toBe('partidas-demais')
    }
  })

  it('partida grande demais vira problema do lote, sem derrubar as outras', () => {
    const inchada = matePastor.replace('1. e4', `{${'a'.repeat(500)}} 1. e4`)
    const { games, issues } = importPgnTextDetailed([matePastor, inchada].join('\n\n'), {
      limits: { ...APERTADO, maxCaracteres: 100_000, maxPartidas: 10 },
    })
    expect(games).toHaveLength(1)
    expect(issues).toHaveLength(1)
    expect(issues[0].message).toMatch(/acima do limite/)
  })

  it('conta comentários e recusa excesso', () => {
    const muitos = `[Event "x"]\n\n1. e4 {a} e5 {b} 2. Nf3 {c} Nc6 *`
    const erro = verificarPartida(muitos, APERTADO)
    expect(erro?.code).toBe('comentarios-demais')
  })

  it('recusa comentário longo demais', () => {
    const longo = `[Event "x"]\n\n1. e4 {${'z'.repeat(50)}} e5 *`
    const erro = verificarPartida(longo, APERTADO)
    expect(erro?.code).toBe('comentario-grande-demais')
  })

  it('PGN normal passa sem esbarrar em nada', () => {
    expect(verificarPartida(matePastor)).toBeNull()
    expect(importPgnTextDetailed(matePastor).games).toHaveLength(1)
  })
})
