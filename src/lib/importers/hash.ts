/**
 * Hash determinístico de strings, em TypeScript puro.
 *
 * Nada de `node:crypto`: isso roda no navegador. Não é criptográfico e não
 * precisa ser — o uso é deduplicar partidas, onde uma colisão custa uma
 * importação perdida, não segurança.
 */

/** FNV-1a de 32 bits, em duas rodadas com sementes diferentes. */
function fnv1a(value: string, seed: number): number {
  let hash = seed
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/**
 * Chave curta e estável para uma string. Duas rodadas mais o comprimento dão
 * espaço suficiente para o volume de partidas de um usuário.
 */
export function hashString(value: string): string {
  const a = fnv1a(value, 0x811c9dc5).toString(36)
  const b = fnv1a(value, 0x9e3779b1).toString(36)
  return `${a}${b}${value.length.toString(36)}`
}

/** Cabeçalhos que identificam a partida em si, e não a origem dela. */
const IDENTITY_HEADERS = new Set(['White', 'Black', 'Date', 'UTCDate', 'Result'])

/**
 * Normaliza um PGN para comparação.
 *
 * Cabeçalhos são descartados porque variam entre origens (a mesma partida vem
 * com `[Site]` diferente de cada serviço), com exceção dos que identificam a
 * partida de fato: jogadores, data e resultado. Comentários, variações e NAGs
 * saem; o que sobra é a linha principal em espaçamento único.
 */
export function normalizePgn(pgn: string): string {
  const lines = pgn.replace(/\r\n?/g, '\n').split('\n')
  const identity: string[] = []
  const movetext: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') {
      continue
    }
    if (trimmed.startsWith('[')) {
      const header = /^\[(\w+)\s+"(.*)"\]$/.exec(trimmed)
      const name = header?.[1]
      const value = header?.[2]
      if (name && value !== undefined && IDENTITY_HEADERS.has(name)) {
        identity.push(`${name}=${value.trim().toLowerCase()}`)
      }
      continue
    }
    movetext.push(trimmed)
  }

  const moves = movetext
    .join(' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/;[^\n]*/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return `${identity.sort().join('|')}::${moves}`
}
