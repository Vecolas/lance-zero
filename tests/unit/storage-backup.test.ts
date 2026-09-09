import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'

import {
  BACKUP_VERSION,
  type BackupFile,
  exportBackup,
  importBackup,
  parseBackup,
  serializeBackup,
} from '@/lib/storage/backup'
import { applyReview, createReviewCard } from '@/lib/fsrs/cards'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import { IndexedDbTrainingRepository, deleteDatabase } from '@/lib/storage/indexeddb-repository'
import { StorageError, UnsupportedBackupVersionError } from '@/lib/storage/repository'

const CRIADO_EM = new Date('2026-03-01T09:00:00.000Z')
const EXPORTADO_EM = new Date('2026-03-10T21:15:00.000Z')

let contador = 0
const bancosAbertos: IndexedDbTrainingRepository[] = []
const nomesDeBanco: string[] = []

function novoIndexedDb(): IndexedDbTrainingRepository {
  contador += 1
  const databaseName = `lance-zero-backup-${contador}`
  const repo = new IndexedDbTrainingRepository({ databaseName })
  bancosAbertos.push(repo)
  nomesDeBanco.push(databaseName)
  return repo
}

afterEach(async () => {
  for (const repo of bancosAbertos.splice(0)) {
    await repo.close()
  }
  for (const nome of nomesDeBanco.splice(0)) {
    await deleteDatabase(nome)
  }
})

function cardRevisado() {
  const novo = createReviewCard(
    {
      id: 'card-erro-7',
      kind: 'erro-de-partida',
      skillIds: ['tactics.back-rank'],
      fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
      solutionUci: ['a1a8'],
      prompt: 'Onde esta o mate?',
      sourceGameId: 'jogo-1',
      sourcePly: 41,
    },
    CRIADO_EM,
  )
  // Um card ja revisado tem estado de escalonador nao trivial — e exatamente
  // esse estado que a ida e volta do backup precisa preservar.
  return applyReview(novo, 'hard', CRIADO_EM)
}

async function repositorioPovoado(): Promise<MemoryTrainingRepository> {
  const repo = new MemoryTrainingRepository()
  await repo.saveProfile({
    id: 'perfil-local',
    createdAt: '2026-02-01T10:00:00.000Z',
    estimatedRating: 1180,
    dailyBudgetMinutes: 40,
    lichessUsername: 'jogador',
    preferences: { boardTheme: 'contraste', reducedMotion: true },
  })
  await repo.saveGame({
    id: 'jogo-1',
    source: 'lichess',
    sourceGameId: 'lic-abc',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *',
    playedAt: '2026-02-20T18:00:00.000Z',
    white: 'jogador',
    black: 'adversario',
    userColor: 'w',
    result: '0-1',
    importedAt: '2026-02-21T08:00:00.000Z',
  })
  await repo.savePuzzleAttempt({
    id: 'tentativa-1',
    puzzleId: 'lichess-00sHx',
    skillIds: ['tactics.fork'],
    attemptedAt: '2026-02-25T12:00:00.000Z',
    solved: false,
    firstTry: false,
    hintsUsed: 2,
    thinkTimeMs: 41_000,
    puzzleRating: 1240,
  })
  await repo.savePositionAnalyses([
    {
      gameId: 'jogo-1',
      ply: 41,
      fenBefore: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
      userMoveUci: 'a1a4',
      bestMoveUci: 'a1a8',
      pv: ['a1a8'],
      scoreCp: null,
      mateIn: 1,
      expectedScoreLossPp: 42,
      severity: 'erro-grave',
      skillIds: ['tactics.back-rank'],
      explanationCode: 'mate-perdido',
      precisao: 'aprofundada',
    },
  ])
  await repo.saveReviewCard(cardRevisado())
  await repo.saveReviewLog({
    cardId: 'card-erro-7',
    reviewedAt: CRIADO_EM.toISOString(),
    rating: 'hard',
    elapsedMs: 21_000,
  })
  await repo.saveSkillMastery([
    {
      skillId: 'tactics.back-rank',
      exposures: 6,
      attempts: 4,
      firstTryCorrect: 1,
      recentAccuracy: 0.25,
      retentionAccuracy: 0.3,
      hintedAttempts: 2,
      medianThinkTimeMs: 30_000,
      realGameOccurrences: 2,
      realGameErrors: 2,
      mastery: 0.18,
      confidence: 0.22,
      lastSeenAt: CRIADO_EM.toISOString(),
    },
  ])
  return repo
}

describe('exportacao de backup', () => {
  it('carimba versao e data com o relogio injetado', async () => {
    const repo = await repositorioPovoado()
    const arquivo = await exportBackup(repo, EXPORTADO_EM)
    expect(arquivo.version).toBe(BACKUP_VERSION)
    expect(arquivo.exportedAt).toBe(EXPORTADO_EM.toISOString())
  })

  it('leva todas as colecoes', async () => {
    const repo = await repositorioPovoado()
    const arquivo = await exportBackup(repo, EXPORTADO_EM)
    expect(arquivo.profile?.id).toBe('perfil-local')
    expect(arquivo.games).toHaveLength(1)
    expect(arquivo.puzzleAttempts).toHaveLength(1)
    expect(arquivo.positionAnalyses).toHaveLength(1)
    expect(arquivo.reviewCards).toHaveLength(1)
    expect(arquivo.reviewLogs).toHaveLength(1)
    expect(arquivo.skillMastery).toHaveLength(1)
  })

  it('exporta um repositorio vazio sem quebrar', async () => {
    const arquivo = await exportBackup(new MemoryTrainingRepository(), EXPORTADO_EM)
    expect(arquivo.profile).toBeNull()
    expect(arquivo.games).toEqual([])
    expect(arquivo.reviewCards).toEqual([])
  })
})

describe('ida e volta do backup', () => {
  it('preserva ids e o SchedulerState entre memoria e IndexedDB', async () => {
    const origem = await repositorioPovoado()
    const arquivo = await exportBackup(origem, EXPORTADO_EM)
    const texto = serializeBackup(arquivo)

    const destino = novoIndexedDb()
    const resultado = await importBackup(destino, parseBackup(texto))

    expect(resultado.version).toBe(BACKUP_VERSION)
    expect(resultado.exportedAt).toBe(EXPORTADO_EM.toISOString())
    expect(resultado.imported).toEqual({
      profile: 1,
      games: 1,
      puzzleAttempts: 1,
      positionAnalyses: 1,
      reviewCards: 1,
      reviewLogs: 1,
      skillMastery: 1,
    })

    const cardOriginal = (await origem.listReviewCards())[0]
    const cardRestaurado = (await destino.listReviewCards())[0]
    expect(cardRestaurado?.id).toBe(cardOriginal?.id)
    expect(cardRestaurado?.scheduler).toEqual(cardOriginal?.scheduler)
    expect(cardRestaurado?.dueAt).toBe(cardOriginal?.dueAt)
    expect(cardRestaurado?.sourceGameId).toBe('jogo-1')
    expect(cardRestaurado?.sourcePly).toBe(41)

    expect((await destino.listGames()).map((jogo) => jogo.id)).toEqual(['jogo-1'])
    expect((await destino.listPuzzleAttempts()).map((item) => item.id)).toEqual(['tentativa-1'])
    expect((await destino.listPositionAnalyses('jogo-1')).map((item) => item.ply)).toEqual([41])
    expect((await destino.getProfile())?.lichessUsername).toBe('jogador')
    expect((await destino.getSkillMastery())[0]?.skillId).toBe('tactics.back-rank')
    expect((await destino.listReviewLogs())[0]?.cardId).toBe('card-erro-7')
  })

  it('reexportar o que foi importado devolve o mesmo conteudo', async () => {
    const origem = await repositorioPovoado()
    const primeiro = await exportBackup(origem, EXPORTADO_EM)

    const destino = novoIndexedDb()
    await importBackup(destino, primeiro)
    const segundo = await exportBackup(destino, EXPORTADO_EM)

    expect(segundo).toEqual(primeiro)
  })
})

describe('validacao na importacao', () => {
  function arquivoValido(overrides: Partial<BackupFile> = {}): BackupFile {
    return {
      version: BACKUP_VERSION,
      exportedAt: EXPORTADO_EM.toISOString(),
      profile: null,
      games: [],
      puzzleAttempts: [],
      positionAnalyses: [],
      reviewCards: [],
      reviewLogs: [],
      skillMastery: [],
      ...overrides,
    }
  }

  it('recusa versao desconhecida com erro tipado', async () => {
    const repo = new MemoryTrainingRepository()
    const futuro = { ...arquivoValido(), version: 99 }
    await expect(importBackup(repo, futuro)).rejects.toBeInstanceOf(UnsupportedBackupVersionError)
    await expect(importBackup(repo, futuro)).rejects.toMatchObject({
      code: 'versao-nao-suportada',
      foundVersion: 99,
      expectedVersion: BACKUP_VERSION,
    })
  })

  it('recusa arquivo sem versao', async () => {
    const repo = new MemoryTrainingRepository()
    await expect(
      importBackup(repo, { exportedAt: EXPORTADO_EM.toISOString() }),
    ).rejects.toBeInstanceOf(UnsupportedBackupVersionError)
  })

  it('recusa conteudo que nao e objeto', async () => {
    const repo = new MemoryTrainingRepository()
    await expect(importBackup(repo, 'nao sou um backup')).rejects.toMatchObject({
      code: 'formato-invalido',
    })
    await expect(importBackup(repo, null)).rejects.toBeInstanceOf(StorageError)
  })

  it('recusa data de exportacao invalida', async () => {
    const repo = new MemoryTrainingRepository()
    await expect(
      importBackup(repo, { ...arquivoValido(), exportedAt: 'ontem' }),
    ).rejects.toMatchObject({ code: 'formato-invalido' })
  })

  it('recusa colecao que nao e lista', async () => {
    const repo = new MemoryTrainingRepository()
    await expect(
      importBackup(repo, { ...arquivoValido(), games: { id: 'x' } }),
    ).rejects.toMatchObject({ code: 'formato-invalido' })
  })

  it('recusa card com SchedulerState incompleto', async () => {
    const repo = new MemoryTrainingRepository()
    const card = cardRevisado()
    const quebrado = {
      ...card,
      scheduler: { ...card.scheduler, stability: 'muito' },
    }
    await expect(
      importBackup(repo, arquivoValido({ reviewCards: [quebrado] as never })),
    ).rejects.toMatchObject({ code: 'formato-invalido' })
  })

  it('valida tudo antes de escrever qualquer coisa', async () => {
    const repo = new MemoryTrainingRepository()
    const card = cardRevisado()
    const arquivo = {
      ...arquivoValido({
        games: [
          {
            id: 'jogo-1',
            source: 'pgn',
            pgn: '1. e4 *',
            playedAt: '2026-02-20T18:00:00.000Z',
            white: 'a',
            black: 'b',
            userColor: 'w',
            result: '*',
            importedAt: '2026-02-21T08:00:00.000Z',
          },
        ] as never,
      }),
      reviewCards: [{ ...card, scheduler: null }] as never,
    }

    await expect(importBackup(repo, arquivo)).rejects.toBeInstanceOf(StorageError)
    expect(await repo.listGames()).toEqual([])
    expect(await repo.listReviewCards()).toEqual([])
  })

  it('parseBackup recusa texto que nao e JSON', () => {
    expect(() => parseBackup('{')).toThrow(StorageError)
  })
})
