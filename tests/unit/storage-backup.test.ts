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
import { editarIdeiaDoRepertorio } from '@/domain/repertoire'
import { REPERTORIO_BRANCAS } from '@/content/openings'
import { identidadeDePosicao, START_FEN } from '@/lib/chess'
import type { RepertorioDoAluno } from '@/domain/types'

const CRIADO_EM = new Date('2026-03-01T09:00:00.000Z')
const EXPORTADO_EM = new Date('2026-03-10T21:15:00.000Z')

/** A frase do aluno. Não pode coincidir com nenhuma de fábrica, e não coincide. */
const IDEIA_DO_ALUNO = 'Eu jogo isto porque decorei que abre a diagonal do bispo e nada mais.'

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
  await repo.saveRepertorio(repertorioEditado())
  return repo
}

/**
 * Um repertório com a ideia REESCRITA pelo aluno.
 *
 * Sai do conteúdo de fábrica de propósito: é o caso que existe de verdade, e o
 * que a ida e volta precisa preservar é justamente a frase que ele escreveu por
 * cima da nossa.
 */
function repertorioEditado(): RepertorioDoAluno {
  const editado = editarIdeiaDoRepertorio(
    REPERTORIO_BRANCAS,
    { origem: identidadeDePosicao(START_FEN), san: REPERTORIO_BRANCAS.linhas[0].lances[0].san },
    IDEIA_DO_ALUNO,
  )
  if (!editado.ok) {
    throw new Error(`fixture quebrada: ${editado.mensagem}`)
  }
  return { definicao: editado.definicao, atualizadoEm: CRIADO_EM.toISOString() }
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
    expect(arquivo.repertorios).toHaveLength(1)
  })

  it('leva a IDEIA que o aluno reescreveu, e nao a de fabrica', async () => {
    const repo = await repositorioPovoado()
    const arquivo = await exportBackup(repo, EXPORTADO_EM)
    // A asserção é sobre o TEXTO, e não sobre a contagem: um export que levasse
    // a definição de fábrica no lugar da editada também teria comprimento 1.
    expect(JSON.stringify(arquivo.repertorios)).toContain(IDEIA_DO_ALUNO)
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
      repertorios: 1,
      // Zero porque esta fixture não grava estágio nem plano; o que importa
      // aqui é que as CHAVES existam. `toEqual` sobre o objeto inteiro é o que
      // faz uma coleção nova esquecida na contagem cair neste teste.
      skillStates: 0,
      planosDoDia: 0,
      openingProgress: 0,
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

    // O repertório do aluno sobrevive à ida e volta com o TEXTO dele dentro.
    // Sem isto, restaurar um backup devolvia calado o repertório de fábrica a
    // quem tinha escrito as próprias ideias.
    const restaurados = await destino.listRepertorios()
    expect(restaurados.map((item) => item.definicao.id)).toEqual([REPERTORIO_BRANCAS.id])
    expect(JSON.stringify(restaurados[0].definicao)).toContain(IDEIA_DO_ALUNO)
    expect(restaurados[0].atualizadoEm).toBe(CRIADO_EM.toISOString())
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
      repertorios: [],
      skillStates: [],
      planosDoDia: [],
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

  it('recusa repertorio com id que quebraria o id do card', async () => {
    // `:` é o separador de `repertorio:{id}:{identidade}`. Um id com `:` parte o
    // id do card no lugar errado e o card nunca mais encontra o próprio nó —
    // falha muda, que só aparece semanas depois. A fronteira recusa.
    const repo = new MemoryTrainingRepository()
    const bom = repertorioEditado()
    const torto = {
      ...bom,
      definicao: { ...bom.definicao, id: 'brancas:italiana' },
    }
    await expect(importBackup(repo, arquivoValido({ repertorios: [torto] }))).rejects.toMatchObject(
      { code: 'formato-invalido' },
    )
    expect(await repo.listRepertorios()).toEqual([])
  })

  it('recusa repertorio sem linhas legiveis', async () => {
    const repo = new MemoryTrainingRepository()
    const bom = repertorioEditado()
    const torto = { ...bom, definicao: { ...bom.definicao, linhas: 'nenhuma' } }
    await expect(
      importBackup(repo, arquivoValido({ repertorios: [torto] as never })),
    ).rejects.toMatchObject({ code: 'formato-invalido' })
  })

  it('arquivo de uma build ANTIGA, sem a colecao de repertorios, ainda importa', async () => {
    // A versão do arquivo não subiu de propósito (ver o cabeçalho de
    // `BACKUP_VERSION`): coleção acrescentada lê como lista vazia, e lista vazia
    // é a verdade sobre quem nunca editou. Subir a versão recusaria o backup de
    // todo mundo que já exportou.
    const repo = new MemoryTrainingRepository()
    const antigo: Record<string, unknown> = { ...arquivoValido() }
    delete antigo.repertorios

    const resultado = await importBackup(repo, antigo)
    expect(resultado.imported.repertorios).toBe(0)
    expect(await repo.listRepertorios()).toEqual([])
  })

  it('parseBackup recusa texto que nao e JSON', () => {
    expect(() => parseBackup('{')).toThrow(StorageError)
  })

  /**
   * O estágio de aprendizagem e os planos concluídos na ida e volta.
   *
   * ESTE É O TESTE DE UMA PERDA SILENCIOSA. Um backup que esquecesse estas duas
   * coleções restauraria um app que FUNCIONA — sem erro, sem aviso — e que
   * simplesmente decidiu reensinar tudo ao aluno e esquecer todo ✓ que ele já
   * tinha. O sintoma seria "o app resetou meu progresso", meses depois, sem
   * pista nenhuma de onde olhar.
   */
  it('preserva o estagio de aprendizagem e os planos concluidos', async () => {
    const origem = new MemoryTrainingRepository()
    const agora = new Date('2026-03-10T12:00:00.000Z')

    await origem.saveSkillStates([
      {
        skillId: 'tactics.fork',
        stage: 'independent',
        exposureCount: 2,
        guidedAttempts: 4,
        guidedSuccesses: 3,
        independentAttempts: 5,
        independentSuccesses: 4,
        lastTaughtAt: agora.toISOString(),
        lastPracticedAt: agora.toISOString(),
        precisaDeReensino: false,
        updatedAt: agora.toISOString(),
      },
    ])

    await origem.savePlanoDoDia({
      dateKey: '2026-03-10',
      activities: [
        {
          id: '2026-03-10/curriculo-tactics.fork',
          dateKey: '2026-03-10',
          definition: {
            id: 'curriculo-tactics.fork',
            kind: 'licao',
            title: 'Aprender: Garfo',
            description: 'teste',
            skillIds: ['tactics.fork'],
            pedagogicalStage: 'unseen',
            estimatedMinutes: 8,
            contentVersion: 1,
            completionRule: { tipo: 'etapas', total: 1 },
            href: '/lessons/tactics.fork',
          },
          status: 'concluida',
          generatedReason: 'motivo de teste com tamanho suficiente',
          createdAt: agora.toISOString(),
          startedAt: agora.toISOString(),
          completedAt: agora.toISOString(),
          progress: { stepIndex: 1, completedItemIds: ['a'], updatedAt: agora.toISOString() },
        },
      ],
      generatedAt: agora.toISOString(),
      plannerVersion: 2,
      seed: '2026-03-10',
    })

    const arquivo = await exportBackup(origem, EXPORTADO_EM)
    expect(arquivo.skillStates).toHaveLength(1)
    expect(arquivo.planosDoDia).toHaveLength(1)

    const destino = new MemoryTrainingRepository()
    const resultado = await importBackup(destino, arquivo)
    expect(resultado.imported.skillStates).toBe(1)
    expect(resultado.imported.planosDoDia).toBe(1)

    // O degrau sobrevive: o aluno não volta a ser ensinado do zero.
    expect((await destino.getSkillStates())[0].stage).toBe('independent')
    // E o ✓ sobrevive junto.
    const plano = await destino.getPlanoDoDia('2026-03-10')
    expect(plano?.activities[0].status).toBe('concluida')

    // Ida e volta bit a bit, como o resto do arquivo.
    expect(await exportBackup(destino, EXPORTADO_EM)).toEqual(arquivo)
  })

  it('arquivo antigo, sem estagio nem planos, ainda importa', async () => {
    const repo = new MemoryTrainingRepository()
    const antigo: Record<string, unknown> = { ...arquivoValido() }
    delete antigo.skillStates
    delete antigo.planosDoDia

    const resultado = await importBackup(repo, antigo)
    expect(resultado.imported.skillStates).toBe(0)
    expect(resultado.imported.planosDoDia).toBe(0)
    // Sem estágio é o estado CORRETO de quem exportou antes de o estágio
    // existir — e a migração em `migrarHabilidadesSemEnsino` é quem trata isso
    // depois, marcando para reensino em vez de presumir domínio.
    expect(await repo.getSkillStates()).toEqual([])
  })

  it('recusa plano sem a chave do dia', async () => {
    const repo = new MemoryTrainingRepository()
    await expect(
      importBackup(repo, arquivoValido({ planosDoDia: [{ activities: [] }] as never })),
    ).rejects.toMatchObject({ code: 'formato-invalido' })
  })
})
