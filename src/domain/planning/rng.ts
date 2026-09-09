/**
 * Gerador pseudoaleatório determinístico (mulberry32).
 *
 * O planner precisa ser reproduzível: mesmo contexto e mesma seed produzem o
 * mesmo plano. Por isso `Math.random` é proibido em `src/domain/planning`.
 */

export interface Rng {
  /** Próximo número em [0, 1). */
  next(): number
  /** Inteiro em [0, maxExclusive). Devolve 0 quando o limite não é positivo. */
  int(maxExclusive: number): number
  /** Escolhe um item. Lança quando a lista está vazia. */
  pick<T>(items: readonly T[]): T
  /** Cópia embaralhada (Fisher-Yates), sem mutar a entrada. */
  shuffle<T>(items: readonly T[]): T[]
}

/** Hash determinístico de seed textual ou numérica (FNV-1a de 32 bits). */
export function hashSeed(seed: number | string): number {
  const texto = typeof seed === 'number' ? `n:${seed}` : `s:${seed}`
  let hash = 0x811c9dc5
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function createRng(seed: number | string): Rng {
  let estado = hashSeed(seed)

  const next = (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (maxExclusive: number): number => {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0
    return Math.floor(next() * maxExclusive) % Math.floor(maxExclusive)
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Rng.pick chamado com lista vazia')
    }
    return items[int(items.length)]
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const copia = [...items]
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = int(i + 1)
      const temp = copia[i]
      copia[i] = copia[j]
      copia[j] = temp
    }
    return copia
  }

  return { next, int, pick, shuffle }
}
