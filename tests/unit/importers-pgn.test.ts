import { describe, expect, it } from 'vitest'
import { importPgnText, importPgnTextDetailed, splitPgnGames } from '@/lib/importers/pgn-import'
import { dedupeGames, gameKey } from '@/lib/importers/dedupe'
import { hashString, normalizePgn } from '@/lib/importers/hash'
import type { Game } from '@/domain/types'

const NOW = Date.parse('2026-09-09T12:00:00.000Z')
const now = () => NOW

function pgnGame(
  evento: string,
  brancas: string,
  pretas: string,
  resultado: string,
  lances: string,
) {
  return [
    `[Event "${evento}"]`,
    '[Site "?"]',
    '[Date "2024.05.03"]',
    `[White "${brancas}"]`,
    `[Black "${pretas}"]`,
    `[Result "${resultado}"]`,
    '',
    `${lances} ${resultado}`,
  ].join('\n')
}

const PARTIDA_1 = pgnGame('Torneio 1', 'Ana', 'Bia', '1-0', '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6')
const PARTIDA_2 = pgnGame('Torneio 1', 'Caio', 'Ana', '0-1', '1. d4 d5 2. c4 e6')
const PARTIDA_3 = pgnGame('Torneio 1', 'Ana', 'Duda', '1/2-1/2', '1. Nf3 Nf6 2. g3 g6')
const PARTIDA_CORROMPIDA = pgnGame('Torneio 1', 'Ana', 'Edu', '*', '1. e4 e5 2. Qh9 Nc6')

describe('splitPgnGames', () => {
  it('separa partidas concatenadas pelo cabeçalho [Event', () => {
    const chunks = splitPgnGames(`${PARTIDA_1}\n\n${PARTIDA_2}\n\n${PARTIDA_3}\n`)
    expect(chunks).toHaveLength(3)
    expect(chunks[1]).toContain('[White "Caio"]')
  })

  it('aceita quebra de linha do Windows', () => {
    const texto = `${PARTIDA_1}\n\n${PARTIDA_2}`.replace(/\n/g, '\r\n')
    expect(splitPgnGames(texto)).toHaveLength(2)
  })
})

describe('importPgnText', () => {
  it('lê um arquivo com 3 partidas concatenadas', () => {
    const games = importPgnText(`${PARTIDA_1}\n\n${PARTIDA_2}\n\n${PARTIDA_3}\n`, {
      username: 'ana',
      now,
    })

    expect(games).toHaveLength(3)
    expect(games.map((game) => game.source)).toEqual(['pgn', 'pgn', 'pgn'])
    expect(games.map((game) => game.userColor)).toEqual(['w', 'b', 'w'])
    expect(games.map((game) => game.result)).toEqual(['1-0', '0-1', '1/2-1/2'])
    expect(games[0]?.white).toBe('Ana')
    expect(games[0]?.playedAt).toBe('2024-05-03T00:00:00.000Z')
    expect(games[0]?.importedAt).toBe(new Date(NOW).toISOString())
    expect(new Set(games.map((game) => game.id)).size).toBe(3)
  })

  it('uma partida corrompida no meio não derruba as outras', () => {
    const texto = `${PARTIDA_1}\n\n${PARTIDA_CORROMPIDA}\n\n${PARTIDA_3}\n`
    const { games, issues } = importPgnTextDetailed(texto, { username: 'Ana', now })

    expect(games).toHaveLength(2)
    expect(games.map((game) => game.black)).toEqual(['Bia', 'Duda'])
    expect(issues).toHaveLength(1)
    expect(issues[0]?.index).toBe(2)
    expect(issues[0]?.message).not.toBe('')
  })

  it('cai para o relógio injetado quando não há cabeçalho de data', () => {
    const semData = ['[Event "?"]', '[White "Ana"]', '[Black "Bia"]', '', '1. e4 e5 *'].join('\n')
    const games = importPgnText(semData, { now })
    expect(games[0]?.playedAt).toBe(new Date(NOW).toISOString())
    expect(games[0]?.result).toBe('*')
  })
})

describe('normalizePgn', () => {
  it('ignora cabeçalhos de origem, comentários e espaçamento', () => {
    const a =
      '[Event "Live Chess"]\n[Site "chess.com"]\n[White "Ana"]\n[Black "Bia"]\n[Result "1-0"]\n\n1. e4 {bom} e5 2. Nf3 1-0'
    const b =
      '[Event "Rated blitz"]\n[Site "lichess.org"]\n[White "Ana"]\n[Black "Bia"]\n[Result "1-0"]\n\n1. e4 e5   2. Nf3   1-0'
    expect(normalizePgn(a)).toBe(normalizePgn(b))
    expect(hashString(normalizePgn(a))).toBe(hashString(normalizePgn(b)))
  })
})

function game(overrides: Partial<Game>): Game {
  return {
    id: 'id-1',
    source: 'lichess',
    sourceGameId: 'abc123',
    pgn: PARTIDA_1,
    playedAt: '2024-05-03T00:00:00.000Z',
    white: 'Ana',
    black: 'Bia',
    userColor: 'w',
    result: '1-0',
    importedAt: new Date(NOW).toISOString(),
    ...overrides,
  }
}

describe('dedupeGames', () => {
  it('não deixa entrar duas vezes a mesma sourceGameId', () => {
    const existentes = [game({})]
    const { result, toSave } = dedupeGames(existentes, [
      game({ id: 'outro-id' }),
      game({ id: 'id-2', sourceGameId: 'def456' }),
    ])

    expect(toSave.map((item) => item.sourceGameId)).toEqual(['def456'])
    expect(result).toEqual({ importadas: 1, duplicadas: 1, ignoradas: 0 })
  })

  it('deduplica PGN idêntico sem id de origem', () => {
    const colada = game({ id: 'pgn-1', source: 'pgn', sourceGameId: undefined })
    const outraVez = game({ id: 'pgn-2', source: 'pgn', sourceGameId: undefined })
    const diferente = game({ id: 'pgn-3', source: 'pgn', sourceGameId: undefined, pgn: PARTIDA_2 })

    const { result, toSave } = dedupeGames([], [colada, outraVez, diferente])

    expect(toSave).toHaveLength(2)
    expect(result).toEqual({ importadas: 2, duplicadas: 1, ignoradas: 0 })
    expect(gameKey(colada)).toBe(gameKey(outraVez))
  })

  it('conta como ignorada a partida sem PGN e sem id de origem', () => {
    const invalida = game({ id: 'vazia', source: 'pgn', sourceGameId: undefined, pgn: '   ' })
    const { result, toSave } = dedupeGames([], [invalida, game({})])

    expect(toSave.map((item) => item.id)).toEqual(['id-1'])
    expect(result).toEqual({ importadas: 1, duplicadas: 0, ignoradas: 1 })
  })

  it('importar o mesmo lote de PGN duas vezes não duplica nada', () => {
    const lote = importPgnText(`${PARTIDA_1}\n\n${PARTIDA_2}\n\n${PARTIDA_3}\n`, { now })
    const primeira = dedupeGames([], lote)
    const segunda = dedupeGames(primeira.toSave, lote)

    expect(primeira.result).toEqual({ importadas: 3, duplicadas: 0, ignoradas: 0 })
    expect(segunda.result).toEqual({ importadas: 0, duplicadas: 3, ignoradas: 0 })
  })
})
