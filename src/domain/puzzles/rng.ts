/**
 * Gerador pseudoaleatório determinístico (mulberry32) do domínio de puzzles.
 *
 * A seleção de puzzles precisa ser reproduzível: mesmo pool, mesmo critério e
 * mesma seed produzem exatamente a mesma lista. Por isso `Math.random` é
 * proibido em `src/domain/puzzles`.
 *
 * O planner tem um gerador equivalente. A duplicação é proposital: puzzles não
 * importam do planner e o planner não importa de puzzles, para que uma
 * mudança de heurística de um lado não mexa no outro.
 */

export interface PuzzleRng {
  /** Próximo número em [0, 1). */
  next(): number
  /** Inteiro em [0, maxExclusive). Devolve 0 quando o limite não é positivo. */
  int(maxExclusive: number): number
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

export function createPuzzleRng(seed: number | string): PuzzleRng {
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

  return { next, int, shuffle }
}

/**
 * Peso estável de um item dentro de uma seed. Não depende da ordem do pool,
 * então acrescentar puzzles ao dataset não reembaralha os que já existiam.
 */
export function stableWeight(seed: number | string, chave: string): number {
  return hashSeed(`${typeof seed === 'number' ? `n:${seed}` : `s:${seed}`}|${chave}`) / 4294967296
}
