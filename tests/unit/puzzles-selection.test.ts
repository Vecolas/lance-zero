import { describe, expect, it } from 'vitest'
import type { Puzzle, SkillId } from '@/domain/types'
import {
  createPuzzleRng,
  filterPool,
  parsePuzzleCsv,
  revelarRotulos,
  selectPuzzles,
} from '@/domain/puzzles'
import { CSV_SOMENTE_VALIDOS } from '../fixtures/puzzles'

const POOL_DO_FIXTURE = parsePuzzleCsv(CSV_SOMENTE_VALIDOS).puzzles

/** Pool sintético grande o bastante para a seleção ter de escolher. */
function poolSintetico(tamanho: number): Puzzle[] {
  const skills: SkillId[] = [
    'tactics.fork',
    'tactics.pin',
    'tactics.back-rank',
    'tactics.hanging-piece',
  ]
  const temas = ['fork', 'pin', 'backRankMate', 'hangingPiece']
  return Array.from({ length: tamanho }, (_, i) => ({
    id: `P${String(i).padStart(4, '0')}`,
    fen: '6k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',
    moves: ['g8h8', 'g1h1'],
    rating: 600 + ((i * 37) % 900),
    themes: [temas[i % temas.length]],
    skillIds: [skills[i % skills.length]],
  }))
}

describe('filterPool', () => {
  const pool = poolSintetico(200)

  it('exclui os ids já vistos', () => {
    const vistos = pool.slice(0, 50).map((puzzle) => puzzle.id)
    const restante = filterPool(pool, { quantidade: 10, excluirIds: vistos })
    expect(restante).toHaveLength(150)
    for (const puzzle of restante) {
      expect(vistos).not.toContain(puzzle.id)
    }
  })

  it('respeita a faixa de rating', () => {
    const filtrados = filterPool(pool, { quantidade: 10, minRating: 900, maxRating: 1100 })
    expect(filtrados.length).toBeGreaterThan(0)
    for (const puzzle of filtrados) {
      expect(puzzle.rating).toBeGreaterThanOrEqual(900)
      expect(puzzle.rating).toBeLessThanOrEqual(1100)
    }
  })

  it('deriva a faixa do ratingAlvo quando min/max não vêm', () => {
    const filtrados = filterPool(pool, { quantidade: 10, ratingAlvo: 1000 })
    for (const puzzle of filtrados) {
      expect(Math.abs(puzzle.rating - 1000)).toBeLessThanOrEqual(200)
    }
  })

  it('filtra por habilidade', () => {
    const filtrados = filterPool(pool, { quantidade: 10, skillIds: ['tactics.pin'] })
    expect(filtrados.length).toBeGreaterThan(0)
    for (const puzzle of filtrados) {
      expect(puzzle.skillIds).toContain('tactics.pin')
    }
  })
})

describe('selectPuzzles', () => {
  const pool = poolSintetico(200)

  it('é determinística: mesma seed devolve exatamente a mesma lista', () => {
    const criterio = { quantidade: 8, ratingAlvo: 1000 }
    const a = selectPuzzles(pool, criterio, 'seed-do-dia')
    const b = selectPuzzles(pool, criterio, 'seed-do-dia')
    expect(a.map((card) => card.puzzle.id)).toEqual(b.map((card) => card.puzzle.id))
    expect(a).toHaveLength(8)
  })

  it('seeds diferentes produzem listas diferentes', () => {
    const criterio = { quantidade: 8, ratingAlvo: 1000 }
    const a = selectPuzzles(pool, criterio, 'segunda').map((card) => card.puzzle.id)
    const b = selectPuzzles(pool, criterio, 'terca').map((card) => card.puzzle.id)
    expect(a).not.toEqual(b)
  })

  it('não depende da ordem em que o pool foi carregado', () => {
    const embaralhado = createPuzzleRng('outra-ordem').shuffle(pool)
    const criterio = { quantidade: 10, ratingAlvo: 1000 }
    const original = selectPuzzles(pool, criterio, 'estavel').map((card) => card.puzzle.id)
    const fora = selectPuzzles(embaralhado, criterio, 'estavel').map((card) => card.puzzle.id)
    expect(fora).toEqual(original)
  })

  it('nunca devolve um id já visto', () => {
    const criterio = { quantidade: 10, ratingAlvo: 1000 }
    const primeira = selectPuzzles(pool, criterio, 'sessao-1')
    const vistos = primeira.map((card) => card.puzzle.id)

    const segunda = selectPuzzles(pool, { ...criterio, excluirIds: vistos }, 'sessao-1')
    expect(segunda).toHaveLength(10)
    for (const card of segunda) {
      expect(vistos).not.toContain(card.puzzle.id)
    }
  })

  it('excluir ids muda a lista mas mantém o determinismo', () => {
    const criterio = { quantidade: 6, ratingAlvo: 1000, excluirIds: ['P0000', 'P0001', 'P0002'] }
    const a = selectPuzzles(pool, criterio, 'x').map((card) => card.puzzle.id)
    const b = selectPuzzles(pool, criterio, 'x').map((card) => card.puzzle.id)
    expect(a).toEqual(b)
    expect(a).not.toContain('P0000')
  })

  it('devolve menos que o pedido quando o pool não dá conta, sem repetir', () => {
    const pequeno = poolSintetico(3)
    const cards = selectPuzzles(pequeno, { quantidade: 10 }, 'seed')
    expect(cards).toHaveLength(3)
    expect(new Set(cards.map((card) => card.puzzle.id)).size).toBe(3)
  })

  it('devolve lista vazia para quantidade zero ou negativa', () => {
    expect(selectPuzzles(pool, { quantidade: 0 }, 'seed')).toEqual([])
    expect(selectPuzzles(pool, { quantidade: -3 }, 'seed')).toEqual([])
  })

  it('fica dentro da faixa de rating pedida', () => {
    const cards = selectPuzzles(pool, { quantidade: 12, minRating: 700, maxRating: 800 }, 'seed')
    for (const card of cards) {
      expect(card.puzzle.rating).toBeGreaterThanOrEqual(700)
      expect(card.puzzle.rating).toBeLessThanOrEqual(800)
    }
  })
})

describe('modo misto não revela o tema', () => {
  const pool = poolSintetico(60)

  it('esconde os rótulos por padrão', () => {
    const cards = selectPuzzles(pool, { quantidade: 5 }, 'seed')
    for (const card of cards) {
      expect(card.revelarTema).toBe(false)
      expect(card.rotulos).toBeNull()
      // O tema cru continua no puzzle, mas nenhum rótulo legível é entregue.
      expect(card.puzzle.themes.length).toBeGreaterThan(0)
    }
  })

  it('o modo focado já entrega os rótulos', () => {
    const cards = selectPuzzles(
      pool,
      { quantidade: 3, modo: 'focado', skillIds: ['tactics.pin'] },
      'seed',
    )
    expect(cards).toHaveLength(3)
    for (const card of cards) {
      expect(card.revelarTema).toBe(true)
      expect(card.rotulos).toEqual(['cravada'])
    }
  })

  it('revelarRotulos abre os rótulos depois da resposta', () => {
    const card = selectPuzzles(pool, { quantidade: 1, skillIds: ['tactics.fork'] }, 'seed')[0]
    expect(card.rotulos).toBeNull()
    const revelado = revelarRotulos(card)
    expect(revelado.revelarTema).toBe(true)
    expect(revelado.rotulos).toEqual(['garfo'])
    // O card original não foi mutado.
    expect(card.rotulos).toBeNull()
  })

  it('intercala habilidades para não entregar o tema pela repetição', () => {
    const skills: SkillId[] = ['tactics.fork', 'tactics.pin', 'tactics.back-rank']
    const cards = selectPuzzles(pool, { quantidade: 6, skillIds: skills }, 'seed')
    expect(cards).toHaveLength(6)
    const sequencia = cards.map((card) => card.puzzle.skillIds[0])
    for (let i = 1; i < sequencia.length; i += 1) {
      expect(sequencia[i], `posição ${i} repetiu a habilidade anterior`).not.toBe(sequencia[i - 1])
    }
  })
})

describe('seleção sobre o fixture real', () => {
  it('acha os puzzles de mate na faixa baixa de rating', () => {
    const cards = selectPuzzles(
      POOL_DO_FIXTURE,
      { quantidade: 3, skillIds: ['tactics.back-rank'], maxRating: 1000 },
      'fixture',
    )
    expect(cards.map((card) => card.puzzle.id).sort()).toEqual(['LZmt1', 'LZmtb'])
  })

  it('ignora puzzle cujas habilidades não batem com o critério', () => {
    const cards = selectPuzzles(
      POOL_DO_FIXTURE,
      { quantidade: 10, skillIds: ['tactics.skewer'] },
      'fixture',
    )
    expect(cards).toHaveLength(1)
    expect(cards[0].puzzle.id).toBe('LZskw')
  })
})

describe('createPuzzleRng', () => {
  it('é determinístico para a mesma seed', () => {
    const a = createPuzzleRng('abc')
    const b = createPuzzleRng('abc')
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()])
  })

  it('shuffle não muta a entrada e mantém os mesmos itens', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8]
    const copia = [...original]
    const embaralhado = createPuzzleRng(42).shuffle(original)
    expect(original).toEqual(copia)
    expect([...embaralhado].sort((x, y) => x - y)).toEqual(copia)
  })

  it('int respeita o limite e trata limite inválido', () => {
    const rng = createPuzzleRng('limites')
    for (let i = 0; i < 50; i += 1) {
      const valor = rng.int(7)
      expect(valor).toBeGreaterThanOrEqual(0)
      expect(valor).toBeLessThan(7)
    }
    expect(rng.int(0)).toBe(0)
    expect(rng.int(-1)).toBe(0)
  })
})
