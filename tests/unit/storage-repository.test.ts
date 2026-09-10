import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type {
  Game,
  PositionAnalysis,
  PuzzleAttempt,
  ReviewCard,
  SkillMastery,
  UserProfile,
} from '@/domain/types'
import { createReviewCard } from '@/lib/fsrs/cards'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import { IndexedDbTrainingRepository, deleteDatabase } from '@/lib/storage/indexeddb-repository'
import { NotFoundError, StorageError, type BackupRepository } from '@/lib/storage/repository'

const AGORA = new Date('2026-03-01T09:00:00.000Z')

function perfil(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'perfil-local',
    createdAt: '2026-02-01T10:00:00.000Z',
    estimatedRating: 1100,
    dailyBudgetMinutes: 20,
    preferences: { boardTheme: 'claro', reducedMotion: false },
    ...overrides,
  }
}

function partida(overrides: Partial<Game> = {}): Game {
  return {
    id: 'jogo-1',
    source: 'lichess',
    sourceGameId: 'abc123',
    pgn: '1. e4 e5 2. Nf3 Nc6 *',
    playedAt: '2026-02-20T18:00:00.000Z',
    white: 'usuario',
    black: 'adversario',
    userColor: 'w',
    result: '*',
    importedAt: '2026-02-21T08:00:00.000Z',
    ...overrides,
  }
}

function tentativa(overrides: Partial<PuzzleAttempt> = {}): PuzzleAttempt {
  return {
    id: 'tentativa-1',
    puzzleId: 'puzzle-1',
    skillIds: ['tactics.fork'],
    attemptedAt: '2026-02-25T12:00:00.000Z',
    solved: true,
    firstTry: true,
    hintsUsed: 0,
    thinkTimeMs: 12_000,
    ...overrides,
  }
}

function analise(overrides: Partial<PositionAnalysis> = {}): PositionAnalysis {
  return {
    gameId: 'jogo-1',
    ply: 12,
    fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    userMoveUci: 'e2e4',
    bestMoveUci: 'd2d4',
    pv: ['d2d4', 'd7d5'],
    scoreCp: 35,
    mateIn: null,
    expectedScoreLossPp: 4,
    severity: 'imprecisao',
    skillIds: ['opening.center'],
    explanationCode: 'unknown',
    precisao: 'aprofundada',
    ...overrides,
  }
}

function card(id: string, dueAt: string): ReviewCard {
  const base = createReviewCard(
    {
      id,
      kind: 'erro-de-partida',
      skillIds: ['tactics.pin'],
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      solutionUci: ['e2e4'],
      prompt: 'Qual e o melhor lance?',
    },
    AGORA,
  )
  return { ...base, dueAt }
}

function mastery(overrides: Partial<SkillMastery> = {}): SkillMastery {
  return {
    skillId: 'tactics.fork',
    exposures: 10,
    attempts: 8,
    firstTryCorrect: 5,
    recentAccuracy: 0.62,
    retentionAccuracy: 0.5,
    hintedAttempts: 2,
    medianThinkTimeMs: 15_000,
    realGameOccurrences: 3,
    realGameErrors: 1,
    mastery: 0.41,
    confidence: 0.3,
    lastSeenAt: '2026-02-28T20:00:00.000Z',
    ...overrides,
  }
}

interface Implementacao {
  nome: string
  criar: () => BackupRepository
  limpar: (repo: BackupRepository) => Promise<void>
}

let contador = 0
// Cada teste ganha um banco proprio: o fake-indexeddb e global e sobreviveria
// entre casos se todos usassem o mesmo nome.
const nomesDeBanco = new WeakMap<BackupRepository, string>()

const implementacoes: Implementacao[] = [
  {
    nome: 'memoria',
    criar: () => new MemoryTrainingRepository(),
    limpar: async () => undefined,
  },
  {
    nome: 'indexeddb',
    criar: () => {
      contador += 1
      const databaseName = `lance-zero-teste-${contador}`
      const repo = new IndexedDbTrainingRepository({ databaseName })
      nomesDeBanco.set(repo, databaseName)
      return repo
    },
    limpar: async (repo) => {
      await (repo as IndexedDbTrainingRepository).close()
      const databaseName = nomesDeBanco.get(repo)
      if (databaseName) {
        await deleteDatabase(databaseName)
      }
    },
  },
]

describe.each(implementacoes)('contrato do repositorio ($nome)', (impl) => {
  let repo: BackupRepository

  beforeEach(() => {
    repo = impl.criar()
  })

  afterEach(async () => {
    await impl.limpar(repo)
  })

  it('devolve nulo quando ainda nao existe perfil', async () => {
    await expect(repo.getProfile()).resolves.toBeNull()
  })

  it('salva e le o perfil', async () => {
    await repo.saveProfile(perfil())
    await expect(repo.getProfile()).resolves.toEqual(perfil())
  })

  it('mantem um unico perfil ao regravar', async () => {
    await repo.saveProfile(perfil())
    await repo.saveProfile(perfil({ estimatedRating: 1250, dailyBudgetMinutes: 40 }))
    const lido = await repo.getProfile()
    expect(lido?.estimatedRating).toBe(1250)
    expect(lido?.dailyBudgetMinutes).toBe(40)
  })

  it('nao devolve referencia viva do perfil salvo', async () => {
    const original = perfil()
    await repo.saveProfile(original)
    original.estimatedRating = 9999
    const lido = await repo.getProfile()
    expect(lido?.estimatedRating).toBe(1100)
  })

  it('deduplica partida pelo sourceGameId mantendo o id original', async () => {
    await repo.saveGame(partida())
    await repo.saveGame(
      partida({ id: 'jogo-2', pgn: '1. d4 d5 *', importedAt: '2026-02-22T08:00:00.000Z' }),
    )

    const jogos = await repo.listGames()
    expect(jogos).toHaveLength(1)
    expect(jogos[0]?.id).toBe('jogo-1')
    expect(jogos[0]?.pgn).toBe('1. d4 d5 *')
  })

  it('nao deduplica partidas de origens diferentes com o mesmo id de origem', async () => {
    await repo.saveGame(partida())
    await repo.saveGame(partida({ id: 'jogo-2', source: 'chesscom' }))
    await expect(repo.listGames()).resolves.toHaveLength(2)
  })

  it('nao deduplica partidas sem sourceGameId', async () => {
    await repo.saveGame(partida({ id: 'pgn-1', source: 'pgn', sourceGameId: undefined }))
    await repo.saveGame(partida({ id: 'pgn-2', source: 'pgn', sourceGameId: undefined }))
    await expect(repo.listGames()).resolves.toHaveLength(2)
  })

  it('lista partidas da mais recente para a mais antiga, com filtro e limite', async () => {
    await repo.saveGame(
      partida({ id: 'a', sourceGameId: 'a', playedAt: '2026-01-01T00:00:00.000Z' }),
    )
    await repo.saveGame(
      partida({ id: 'b', sourceGameId: 'b', playedAt: '2026-02-01T00:00:00.000Z' }),
    )
    await repo.saveGame(
      partida({
        id: 'c',
        source: 'chesscom',
        sourceGameId: 'c',
        playedAt: '2026-03-01T00:00:00.000Z',
      }),
    )

    expect((await repo.listGames()).map((jogo) => jogo.id)).toEqual(['c', 'b', 'a'])
    expect((await repo.listGames({ limit: 2 })).map((jogo) => jogo.id)).toEqual(['c', 'b'])
    expect((await repo.listGames({ source: 'chesscom' })).map((jogo) => jogo.id)).toEqual(['c'])
    expect(
      (await repo.listGames({ since: new Date('2026-02-01T00:00:00.000Z') })).map(
        (jogo) => jogo.id,
      ),
    ).toEqual(['c', 'b'])
  })

  it('salva tentativas de puzzle e lista da mais recente para a mais antiga', async () => {
    await repo.savePuzzleAttempt(tentativa({ id: 't1', attemptedAt: '2026-02-01T00:00:00.000Z' }))
    await repo.savePuzzleAttempt(tentativa({ id: 't2', attemptedAt: '2026-02-03T00:00:00.000Z' }))
    await repo.savePuzzleAttempt(tentativa({ id: 't3', attemptedAt: '2026-02-02T00:00:00.000Z' }))

    expect((await repo.listPuzzleAttempts()).map((item) => item.id)).toEqual(['t2', 't3', 't1'])
    expect((await repo.listPuzzleAttempts(2)).map((item) => item.id)).toEqual(['t2', 't3'])
  })

  it('salva analises de posicao em lote e le por partida, em ordem de lance', async () => {
    await repo.savePositionAnalyses([
      analise({ ply: 20 }),
      analise({ ply: 8 }),
      analise({ gameId: 'jogo-2', ply: 4 }),
    ])

    const doJogo1 = await repo.listPositionAnalyses('jogo-1')
    expect(doJogo1.map((item) => item.ply)).toEqual([8, 20])
    expect(await repo.listPositionAnalyses('jogo-3')).toEqual([])
    expect(await repo.listAllPositionAnalyses()).toHaveLength(3)
  })

  it('sobrescreve a analise da mesma partida e do mesmo lance', async () => {
    await repo.savePositionAnalyses([analise({ ply: 8, severity: 'imprecisao' })])
    await repo.savePositionAnalyses([analise({ ply: 8, severity: 'erro-grave' })])
    const items = await repo.listPositionAnalyses('jogo-1')
    expect(items).toHaveLength(1)
    expect(items[0]?.severity).toBe('erro-grave')
  })

  it('getDueCards filtra por vencimento e ordena do mais atrasado ao menos atrasado', async () => {
    await repo.saveReviewCard(card('c-tarde', '2026-03-05T09:00:00.000Z'))
    await repo.saveReviewCard(card('c-cedo', '2026-02-20T09:00:00.000Z'))
    await repo.saveReviewCard(card('c-agora', AGORA.toISOString()))
    await repo.saveReviewCard(card('c-meio', '2026-02-27T09:00:00.000Z'))

    const vencidos = await repo.getDueCards(AGORA)
    expect(vencidos.map((item) => item.id)).toEqual(['c-cedo', 'c-meio', 'c-agora'])
    expect(await repo.listReviewCards()).toHaveLength(4)
  })

  it('preserva o SchedulerState do card gravado', async () => {
    const original = card('c-1', AGORA.toISOString())
    await repo.saveReviewCard(original)
    const [lido] = await repo.getDueCards(AGORA)
    expect(lido?.scheduler).toEqual(original.scheduler)
    expect(lido?.solutionUci).toEqual(original.solutionUci)
  })

  it('regrava o card pelo id em vez de duplicar', async () => {
    await repo.saveReviewCard(card('c-1', AGORA.toISOString()))
    await repo.saveReviewCard(card('c-1', '2026-04-01T09:00:00.000Z'))
    const todos = await repo.listReviewCards()
    expect(todos).toHaveLength(1)
    expect(todos[0]?.dueAt).toBe('2026-04-01T09:00:00.000Z')
  })

  it('acumula logs de revisao', async () => {
    await repo.saveReviewLog({
      cardId: 'c-1',
      reviewedAt: AGORA.toISOString(),
      rating: 'good',
      elapsedMs: 4000,
    })
    await repo.saveReviewLog({
      cardId: 'c-1',
      reviewedAt: '2026-03-02T09:00:00.000Z',
      rating: 'again',
      elapsedMs: 9000,
    })
    const logs = await repo.listReviewLogs()
    expect(logs).toHaveLength(2)
    expect(logs.map((log) => log.rating)).toContain('again')
  })

  it('salva o mastery em lote e atualiza pela habilidade', async () => {
    await repo.saveSkillMastery([mastery(), mastery({ skillId: 'tactics.pin', mastery: 0.2 })])
    expect(await repo.getSkillMastery()).toHaveLength(2)

    await repo.saveSkillMastery([mastery({ mastery: 0.77 })])
    const atualizado = await repo.getSkillMastery()
    expect(atualizado).toHaveLength(2)
    expect(atualizado.find((item) => item.skillId === 'tactics.fork')?.mastery).toBe(0.77)
  })

  it('aceita lote vazio sem quebrar', async () => {
    await expect(repo.savePositionAnalyses([])).resolves.toBeUndefined()
    await expect(repo.saveSkillMastery([])).resolves.toBeUndefined()
  })
})

describe('erros tipados de armazenamento', () => {
  it('StorageError carrega um codigo estavel', () => {
    const erro = new StorageError('formato-invalido', 'mensagem')
    expect(erro).toBeInstanceOf(Error)
    expect(erro).toBeInstanceOf(StorageError)
    expect(erro.code).toBe('formato-invalido')
    expect(erro.name).toBe('StorageError')
  })

  it('NotFoundError e um StorageError com codigo proprio', () => {
    const erro = new NotFoundError('reviewCards', 'c-1')
    expect(erro).toBeInstanceOf(StorageError)
    expect(erro.code).toBe('nao-encontrado')
    expect(erro.entity).toBe('reviewCards')
    expect(erro.key).toBe('c-1')
  })

  it('sinaliza ambiente sem IndexedDB', async () => {
    const repo = new IndexedDbTrainingRepository({ databaseName: 'sem-idb', factory: undefined })
    // Sem `factory` explicito o repositorio usa o global; aqui forcamos a ausencia.
    Object.defineProperty(repo, 'factory', { value: null })
    await expect(repo.getProfile()).rejects.toMatchObject({ code: 'indexeddb-indisponivel' })
  })
})
