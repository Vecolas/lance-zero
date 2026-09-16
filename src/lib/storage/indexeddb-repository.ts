/**
 * Repositório local em IndexedDB, sem biblioteca externa.
 *
 * A API nativa é baseada em eventos; aqui ela é envolvida em promessas finas.
 * Nenhuma página ou componente fala com este arquivo diretamente: o acesso
 * passa sempre pelo contrato `TrainingRepository`.
 */
import type {
  Game,
  GameQuery,
  PlanoDoDia,
  PositionAnalysis,
  PuzzleAttempt,
  RepertorioDoAluno,
  ReviewCard,
  ReviewLog,
  SkillMastery,
  SkillState,
  StudyJourney,
  UserProfile,
  OpeningProgress,
} from '@/domain/types'
import { StorageError, type BackupRepository } from './repository'
import {
  applyGameQuery,
  gameDedupeKey,
  selectDueCards,
  sortPositionAnalyses,
  sortPuzzleAttempts,
  sortRepertorios,
  sortReviewCards,
} from './query'

/** Nomes de object store. Mudar aqui exige uma nova versão de schema. */
export const STORES = {
  profile: 'profile',
  games: 'games',
  puzzleAttempts: 'puzzleAttempts',
  positionAnalyses: 'positionAnalyses',
  reviewCards: 'reviewCards',
  reviewLogs: 'reviewLogs',
  skillMastery: 'skillMastery',
  repertorios: 'repertorios',
  skillStates: 'skillStates',
  planosDoDia: 'planosDoDia',
  openingProgress: 'openingProgress',
  studyJourneys: 'studyJourneys',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

export const INDEXES = {
  gamesBySourceGameId: 'porSourceGameId',
  gamesByPlayedAt: 'porPlayedAt',
  puzzleAttemptsByAttemptedAt: 'porAttemptedAt',
  positionAnalysesByGameId: 'porGameId',
  reviewCardsByDueAt: 'porDueAt',
  reviewLogsByCardId: 'porCardId',
} as const

export const INDEXEDDB_CONFIG = {
  databaseName: 'lance-zero',
  /** Versão do schema. Incrementar sempre junto de um novo `case` em `migrate`. */
  schemaVersion: 5,
} as const

export interface IndexedDbRepositoryOptions {
  databaseName?: string
  /** Injetável para testes; por padrão usa o `indexedDB` global. */
  factory?: IDBFactory
}

function toStorageError(error: unknown, message: string): StorageError {
  if (error instanceof StorageError) {
    return error
  }
  return new StorageError('falha-na-transacao', message, { cause: error })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Falha na requisicao IndexedDB.'))
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Falha na transacao IndexedDB.'))
    tx.onabort = () => reject(tx.error ?? new Error('Transacao IndexedDB abortada.'))
  })
}

/**
 * Migração de schema.
 *
 * O `switch` avança pela versão de origem, sem `break`, para que um banco
 * antigo passe por todas as etapas até a versão atual.
 */
function migrate(db: IDBDatabase, oldVersion: number): void {
  switch (oldVersion) {
    case 0:
      createSchemaV1(db)
    // falls through
    case 1:
      createSchemaV2(db)
    // falls through
    case 2:
      createSchemaV3(db)
    // falls through
    case 3:
      createSchemaV4(db)
    // falls through
    case 4:
      createSchemaV5(db)
  }
}

function createSchemaV1(db: IDBDatabase): void {
  db.createObjectStore(STORES.profile, { keyPath: 'id' })

  const games = db.createObjectStore(STORES.games, { keyPath: 'id' })
  games.createIndex(INDEXES.gamesBySourceGameId, 'sourceGameId', { unique: false })
  games.createIndex(INDEXES.gamesByPlayedAt, 'playedAt', { unique: false })

  const attempts = db.createObjectStore(STORES.puzzleAttempts, { keyPath: 'id' })
  attempts.createIndex(INDEXES.puzzleAttemptsByAttemptedAt, 'attemptedAt', { unique: false })

  const analyses = db.createObjectStore(STORES.positionAnalyses, { keyPath: ['gameId', 'ply'] })
  analyses.createIndex(INDEXES.positionAnalysesByGameId, 'gameId', { unique: false })

  const cards = db.createObjectStore(STORES.reviewCards, { keyPath: 'id' })
  cards.createIndex(INDEXES.reviewCardsByDueAt, 'dueAt', { unique: false })

  const logs = db.createObjectStore(STORES.reviewLogs, { autoIncrement: true })
  logs.createIndex(INDEXES.reviewLogsByCardId, 'cardId', { unique: false })

  db.createObjectStore(STORES.skillMastery, { keyPath: 'skillId' })
}

/**
 * V2: o repertório montado pelo aluno.
 *
 * A chave é `definicao.id` — um keyPath ANINHADO, de propósito. O id do
 * repertório já existe dentro da definição e é o mesmo que compõe o id dos cards
 * FSRS; copiá-lo para um campo de topo só para servir de chave criaria duas
 * fontes da mesma verdade, livres para divergir na primeira gravação desatenta.
 *
 * Só ACRESCENTA uma store: nada do que já estava gravado é lido, reescrito ou
 * apagado aqui. Um banco na versão 1 sobe para a 2 sem tocar em um único card,
 * que é o que mantém o agendamento FSRS de quem já usa o app.
 */
function createSchemaV2(db: IDBDatabase): void {
  db.createObjectStore(STORES.repertorios, { keyPath: 'definicao.id' })
}

/**
 * V3: o estágio de aprendizagem e o plano do dia.
 *
 * As duas stores que faltavam para o produto parar de cobrar o que nunca
 * ensinou. `skillStates` guarda o degrau por habilidade; `planosDoDia` guarda o
 * plano GERADO, que a partir daqui é fato e não valor derivado a cada
 * renderização — ver `@/domain/aprendizado/plano`.
 *
 * Só ACRESCENTA. Nada do que já estava gravado é lido, reescrito ou apagado:
 * um banco na versão 2 sobe para a 3 sem tocar em um único card, e o
 * agendamento FSRS de quem já usa o app continua de pé.
 *
 * `planosDoDia` é chaveado por `dateKey`, que é o dia no fuso do ALUNO.
 * Chavear por instante UTC faria o plano virar antes da meia-noite de quem
 * treina à noite — o mesmo defeito de fuso que já mordeu este projeto uma vez.
 */
function createSchemaV3(db: IDBDatabase): void {
  db.createObjectStore(STORES.skillStates, { keyPath: 'skillId' })
  db.createObjectStore(STORES.planosDoDia, { keyPath: 'dateKey' })
}

/** V4: progresso de cursos de abertura por posição. */
function createSchemaV4(db: IDBDatabase): void {
  db.createObjectStore(STORES.openingProgress, { keyPath: 'openingId' })
}

/**
 * V5: as jornadas de estudo de Aberturas e Finais.
 *
 * UMA STORE PARA OS DOIS DOMÍNIOS, e a chave é o `id` da jornada — que carrega
 * o domínio dentro (`abertura:italiana`, `final:oposicao`). Duas stores
 * separadas seriam a mesma tabela escrita duas vezes: a FORMA é idêntica, e é
 * só a forma que a persistência conhece. As regras continuam separadas onde
 * elas moram, em `@/domain/openings` e `@/domain/endgames`.
 *
 * Chavear por `learningObjectId` puro seria o defeito: uma abertura e um final
 * com o mesmo slug colidiriam, e o aluno perderia uma das duas jornadas sem
 * nada acusar.
 *
 * Só ACRESCENTA. Um banco na versão 4 sobe para a 5 sem tocar em nada do que já
 * estava gravado.
 */
function createSchemaV5(db: IDBDatabase): void {
  db.createObjectStore(STORES.studyJourneys, { keyPath: 'id' })
}

export class IndexedDbTrainingRepository implements BackupRepository {
  private readonly databaseName: string
  private readonly factory: IDBFactory | null
  private connection: Promise<IDBDatabase> | null = null

  constructor(options: IndexedDbRepositoryOptions = {}) {
    this.databaseName = options.databaseName ?? INDEXEDDB_CONFIG.databaseName
    this.factory = options.factory ?? (globalThis.indexedDB as IDBFactory | undefined) ?? null
  }

  private open(): Promise<IDBDatabase> {
    if (this.connection) {
      return this.connection
    }
    const factory = this.factory
    if (!factory) {
      return Promise.reject(
        new StorageError(
          'indexeddb-indisponivel',
          'O IndexedDB não está disponível neste navegador.',
        ),
      )
    }
    this.connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(this.databaseName, INDEXEDDB_CONFIG.schemaVersion)
      request.onupgradeneeded = (event) => {
        migrate(request.result, event.oldVersion)
      }
      request.onsuccess = () => {
        const db = request.result
        // Se outra aba pedir upgrade, esta conexão precisa sair do caminho.
        db.onversionchange = () => {
          db.close()
          this.connection = null
        }
        resolve(db)
      }
      request.onerror = () =>
        reject(
          new StorageError('falha-na-transacao', 'Não consegui abrir o banco local.', {
            cause: request.error,
          }),
        )
      request.onblocked = () =>
        reject(
          new StorageError(
            'falha-na-transacao',
            'Abertura do banco local bloqueada por outra aba.',
          ),
        )
    }).catch((error: unknown) => {
      this.connection = null
      throw toStorageError(error, 'Não consegui abrir o banco local.')
    })
    return this.connection
  }

  private async run<T>(
    storeNames: StoreName[],
    mode: IDBTransactionMode,
    body: (tx: IDBTransaction) => Promise<T>,
  ): Promise<T> {
    const db = await this.open()
    const tx = db.transaction(storeNames, mode)
    const done = transactionDone(tx)
    try {
      const result = await body(tx)
      await done
      return result
    } catch (error) {
      try {
        tx.abort()
      } catch {
        // A transação já pode ter terminado; abortar de novo não é problema.
      }
      throw toStorageError(error, 'Falha ao acessar o banco local.')
    }
  }

  private readAll<T>(store: StoreName): Promise<T[]> {
    return this.run([store], 'readonly', (tx) =>
      requestToPromise<T[]>(tx.objectStore(store).getAll() as IDBRequest<T[]>),
    )
  }

  async getProfile(): Promise<UserProfile | null> {
    const profiles = await this.readAll<UserProfile>(STORES.profile)
    return profiles[0] ?? null
  }

  /** Só existe um perfil local: a store é limpa antes da gravação. */
  async saveProfile(profile: UserProfile): Promise<void> {
    await this.run([STORES.profile], 'readwrite', async (tx) => {
      const store = tx.objectStore(STORES.profile)
      await requestToPromise(store.clear())
      await requestToPromise(store.put(profile))
    })
  }

  /**
   * Grava a partida deduplicando por `source` + `sourceGameId`.
   *
   * O `id` da partida já existente é preservado para não deixar análises e
   * cards apontando para uma referência órfã.
   */
  async saveGame(game: Game): Promise<void> {
    await this.run([STORES.games], 'readwrite', async (tx) => {
      const store = tx.objectStore(STORES.games)
      const key = gameDedupeKey(game)
      if (key !== null && game.sourceGameId !== undefined) {
        const index = store.index(INDEXES.gamesBySourceGameId)
        const candidates = await requestToPromise<Game[]>(
          index.getAll(game.sourceGameId) as IDBRequest<Game[]>,
        )
        const existing = candidates.find(
          (item) => gameDedupeKey(item) === key && item.id !== game.id,
        )
        if (existing) {
          await requestToPromise(store.put({ ...game, id: existing.id }))
          return
        }
      }
      await requestToPromise(store.put(game))
    })
  }

  async listGames(query?: GameQuery): Promise<Game[]> {
    const games = await this.readAll<Game>(STORES.games)
    return applyGameQuery(games, query)
  }

  async savePuzzleAttempt(attempt: PuzzleAttempt): Promise<void> {
    await this.run([STORES.puzzleAttempts], 'readwrite', async (tx) => {
      await requestToPromise(tx.objectStore(STORES.puzzleAttempts).put(attempt))
    })
  }

  async listPuzzleAttempts(limit?: number): Promise<PuzzleAttempt[]> {
    const attempts = await this.readAll<PuzzleAttempt>(STORES.puzzleAttempts)
    return sortPuzzleAttempts(attempts, limit)
  }

  async savePositionAnalyses(items: PositionAnalysis[]): Promise<void> {
    if (items.length === 0) {
      return
    }
    await this.run([STORES.positionAnalyses], 'readwrite', async (tx) => {
      const store = tx.objectStore(STORES.positionAnalyses)
      for (const item of items) {
        await requestToPromise(store.put(item))
      }
    })
  }

  async listPositionAnalyses(gameId: string): Promise<PositionAnalysis[]> {
    const items = await this.run([STORES.positionAnalyses], 'readonly', (tx) =>
      requestToPromise<PositionAnalysis[]>(
        tx
          .objectStore(STORES.positionAnalyses)
          .index(INDEXES.positionAnalysesByGameId)
          .getAll(gameId) as IDBRequest<PositionAnalysis[]>,
      ),
    )
    return sortPositionAnalyses(items)
  }

  async listAllPositionAnalyses(): Promise<PositionAnalysis[]> {
    return this.readAll<PositionAnalysis>(STORES.positionAnalyses)
  }

  /**
   * Cards vencidos até `now`.
   *
   * O índice `porDueAt` já devolve em ordem crescente dentro do intervalo;
   * `selectDueCards` reaplica filtro e ordenação para casar exatamente com o
   * repositório em memória.
   */
  async getDueCards(now: Date): Promise<ReviewCard[]> {
    const range = IDBKeyRange.upperBound(now.toISOString())
    const cards = await this.run([STORES.reviewCards], 'readonly', (tx) =>
      requestToPromise<ReviewCard[]>(
        tx
          .objectStore(STORES.reviewCards)
          .index(INDEXES.reviewCardsByDueAt)
          .getAll(range) as IDBRequest<ReviewCard[]>,
      ),
    )
    return selectDueCards(cards, now)
  }

  async listReviewCards(): Promise<ReviewCard[]> {
    const cards = await this.readAll<ReviewCard>(STORES.reviewCards)
    return sortReviewCards(cards)
  }

  async saveReviewCard(card: ReviewCard): Promise<void> {
    await this.run([STORES.reviewCards], 'readwrite', async (tx) => {
      await requestToPromise(tx.objectStore(STORES.reviewCards).put(card))
    })
  }

  async saveReviewLog(log: ReviewLog): Promise<void> {
    await this.run([STORES.reviewLogs], 'readwrite', async (tx) => {
      await requestToPromise(tx.objectStore(STORES.reviewLogs).add(log))
    })
  }

  async listReviewLogs(): Promise<ReviewLog[]> {
    return this.readAll<ReviewLog>(STORES.reviewLogs)
  }

  async getSkillMastery(): Promise<SkillMastery[]> {
    return this.readAll<SkillMastery>(STORES.skillMastery)
  }

  async saveSkillMastery(mastery: SkillMastery[]): Promise<void> {
    if (mastery.length === 0) {
      return
    }
    await this.run([STORES.skillMastery], 'readwrite', async (tx) => {
      const store = tx.objectStore(STORES.skillMastery)
      for (const item of mastery) {
        await requestToPromise(store.put(item))
      }
    })
  }

  async listRepertorios(): Promise<RepertorioDoAluno[]> {
    return sortRepertorios(await this.readAll<RepertorioDoAluno>(STORES.repertorios))
  }

  /** `put` com keyPath em `definicao.id`: regravar substitui, não duplica. */
  async saveRepertorio(repertorio: RepertorioDoAluno): Promise<void> {
    await this.run([STORES.repertorios], 'readwrite', async (tx) => {
      await requestToPromise(tx.objectStore(STORES.repertorios).put(repertorio))
    })
  }

  async getSkillStates(): Promise<SkillState[]> {
    const estados = await this.readAll<SkillState>(STORES.skillStates)
    // Ordem canônica pelo id: a tela do currículo e o planner leem daqui, e uma
    // ordem que depende de como o IndexedDB devolveu faria a lista trocar de
    // ordem entre navegadores sem nada mudar de verdade.
    return estados.sort((a, b) => a.skillId.localeCompare(b.skillId))
  }

  async saveSkillStates(states: SkillState[]): Promise<void> {
    if (states.length === 0) {
      return
    }
    await this.run([STORES.skillStates], 'readwrite', async (tx) => {
      const store = tx.objectStore(STORES.skillStates)
      for (const estado of states) {
        await requestToPromise(store.put(estado))
      }
    })
  }

  async getPlanoDoDia(dateKey: string): Promise<PlanoDoDia | null> {
    const plano = await this.run([STORES.planosDoDia], 'readonly', (tx) =>
      requestToPromise<PlanoDoDia | undefined>(
        tx.objectStore(STORES.planosDoDia).get(dateKey) as IDBRequest<PlanoDoDia | undefined>,
      ),
    )
    return plano ?? null
  }

  async savePlanoDoDia(plano: PlanoDoDia): Promise<void> {
    await this.run([STORES.planosDoDia], 'readwrite', async (tx) => {
      await requestToPromise(tx.objectStore(STORES.planosDoDia).put(plano))
    })
  }

  async listPlanosDoDia(limit?: number): Promise<PlanoDoDia[]> {
    const planos = await this.readAll<PlanoDoDia>(STORES.planosDoDia)
    // `dateKey` é `YYYY-MM-DD`, então a comparação textual é cronológica.
    const ordenados = planos.sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    return limit === undefined ? ordenados : ordenados.slice(0, limit)
  }

  async getOpeningProgress(openingId: string): Promise<OpeningProgress | null> {
    const progress = await this.run([STORES.openingProgress], 'readonly', (tx) =>
      requestToPromise<OpeningProgress | undefined>(
        tx.objectStore(STORES.openingProgress).get(openingId) as IDBRequest<
          OpeningProgress | undefined
        >,
      ),
    )
    return progress ?? null
  }

  async listOpeningProgress(): Promise<OpeningProgress[]> {
    return this.readAll<OpeningProgress>(STORES.openingProgress)
  }

  async saveOpeningProgress(progress: OpeningProgress): Promise<void> {
    await this.run([STORES.openingProgress], 'readwrite', async (tx) => {
      await requestToPromise(tx.objectStore(STORES.openingProgress).put(progress))
    })
  }

  async getStudyJourney(id: string): Promise<StudyJourney | null> {
    const jornada = await this.run([STORES.studyJourneys], 'readonly', (tx) =>
      requestToPromise<StudyJourney | undefined>(
        tx.objectStore(STORES.studyJourneys).get(id) as IDBRequest<StudyJourney | undefined>,
      ),
    )
    return jornada ?? null
  }

  async saveStudyJourney(jornada: StudyJourney): Promise<void> {
    await this.run([STORES.studyJourneys], 'readwrite', async (tx) => {
      await requestToPromise(tx.objectStore(STORES.studyJourneys).put(jornada))
    })
  }

  async listStudyJourneys(): Promise<StudyJourney[]> {
    // Ordem canônica pelo id: o Roadmap e o Hoje leem daqui, e uma ordem que
    // dependesse de como o IndexedDB devolveu faria a lista trocar de ordem
    // entre navegadores sem nada ter mudado de verdade.
    const jornadas = await this.readAll<StudyJourney>(STORES.studyJourneys)
    return jornadas.sort((a, b) => a.id.localeCompare(b.id))
  }

  /** Fecha a conexão. Necessário antes de apagar o banco em testes. */
  async close(): Promise<void> {
    if (!this.connection) {
      return
    }
    const db = await this.connection.catch(() => null)
    this.connection = null
    db?.close()
  }
}

/** Apaga o banco local inteiro. Usado pelo "recomeçar do zero" e pelos testes. */
export function deleteDatabase(
  databaseName: string = INDEXEDDB_CONFIG.databaseName,
  factory: IDBFactory | null = (globalThis.indexedDB as IDBFactory | undefined) ?? null,
): Promise<void> {
  if (!factory) {
    return Promise.reject(
      new StorageError(
        'indexeddb-indisponivel',
        'O IndexedDB não está disponível neste navegador.',
      ),
    )
  }
  return new Promise<void>((resolve, reject) => {
    const request = factory.deleteDatabase(databaseName)
    request.onsuccess = () => resolve()
    request.onerror = () =>
      reject(
        new StorageError('falha-na-transacao', 'Não consegui apagar o banco local.', {
          cause: request.error,
        }),
      )
    request.onblocked = () => resolve()
  })
}
