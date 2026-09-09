import { describe, expect, it } from 'vitest'
import { gravarErrosComoTreino } from '@/domain/games/gravar-treino'
import { idDoCardDeErro } from '@/domain/games/para-treino'
import { skillsForExplanation, explainMistake } from '@/domain/games/explain'
import type { CriticalMoment, MistakeExplanation, ReviewCard } from '@/domain/types'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import { applyReview } from '@/lib/fsrs/cards'

const AGORA = new Date('2026-03-10T12:00:00.000Z')
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1'

function explicacao(): MistakeExplanation {
  return explainMistake(
    {
      fenBefore: FEN,
      userMoveUci: 'a2a3',
      bestMoveUci: 'f3f7',
      expectedScoreLossPp: 30,
    },
    [{ code: 'hanging-piece', confidence: 0.9 }],
  )
}

function momento(over: Partial<CriticalMoment> = {}): CriticalMoment {
  const explanation = explicacao()
  return {
    gameId: 'partida-a',
    ply: 21,
    fenBefore: FEN,
    userMoveUci: 'a2a3',
    bestMoveUci: 'f3f7',
    expectedScoreLossPp: 30,
    severity: 'erro-grave',
    skillIds: skillsForExplanation(explanation),
    explanation,
    ocorridoEm: '2026-03-05T20:00:00.000Z',
    ...over,
  }
}

async function cardDe(repo: MemoryTrainingRepository, id: string): Promise<ReviewCard> {
  const card = (await repo.listReviewCards()).find((c) => c.id === id)
  if (!card) throw new Error(`card ${id} não existe`)
  return card
}

describe('gravar erro de partida como treino', () => {
  it('cria card para o momento escolhido', async () => {
    const repo = new MemoryTrainingRepository()
    const resultado = await gravarErrosComoTreino(repo, [momento()], { agora: AGORA })

    expect(resultado).toEqual({ criados: 1, atualizados: 0 })
    const card = await cardDe(repo, idDoCardDeErro('partida-a', 21))
    expect(card.kind).toBe('erro-de-partida')
    expect(card.fen).toBe(FEN)
    expect(card.solutionUci).toEqual(['f3f7'])
  })

  it('lote sem momento elegível não escreve nada', async () => {
    const repo = new MemoryTrainingRepository()
    const resultado = await gravarErrosComoTreino(repo, [], { agora: AGORA })

    expect(resultado).toEqual({ criados: 0, atualizados: 0 })
    expect(await repo.listReviewCards()).toEqual([])
  })

  /**
   * O teste que justifica este módulo existir.
   *
   * `saveReviewCard` é upsert cego. Sem a leitura antes da escrita, reanalisar a
   * mesma partida zeraria o agendamento do FSRS em silêncio — e o aluno que já
   * revisou o padrão três vezes recomeçaria do zero sem nada acusar.
   */
  it('reanalisar a mesma partida NÃO zera o progresso do FSRS', async () => {
    const repo = new MemoryTrainingRepository()
    await gravarErrosComoTreino(repo, [momento()], { agora: AGORA })
    const id = idDoCardDeErro('partida-a', 21)

    // O aluno revisa e acerta: o agendamento avança.
    const revisado = applyReview(await cardDe(repo, id), 'good', AGORA)
    await repo.saveReviewCard(revisado)
    expect(revisado.scheduler.reps).toBeGreaterThan(0)

    // Reanálise da mesma partida, depois.
    const depois = new Date('2026-03-12T12:00:00.000Z')
    const resultado = await gravarErrosComoTreino(repo, [momento()], { agora: depois })

    expect(resultado).toEqual({ criados: 0, atualizados: 1 })
    const final = await cardDe(repo, id)
    expect(final.scheduler).toEqual(revisado.scheduler)
    expect(final.dueAt).toBe(revisado.dueAt)
    expect(final.createdAt).toBe(revisado.createdAt)
  })

  it('não cria duplicata: o mesmo erro continua sendo um card só', async () => {
    const repo = new MemoryTrainingRepository()
    await gravarErrosComoTreino(repo, [momento()], { agora: AGORA })
    await gravarErrosComoTreino(repo, [momento()], { agora: AGORA })

    expect(await repo.listReviewCards()).toHaveLength(1)
  })

  it('erros de partidas diferentes viram cards diferentes', async () => {
    const repo = new MemoryTrainingRepository()
    await gravarErrosComoTreino(repo, [momento(), momento({ gameId: 'partida-b' })], {
      agora: AGORA,
    })

    expect(await repo.listReviewCards()).toHaveLength(2)
  })

  it('o card entra na fila de revisão e é encontrado como vencido', async () => {
    const repo = new MemoryTrainingRepository()
    await gravarErrosComoTreino(repo, [momento()], { agora: AGORA })

    const vencidos = await repo.getDueCards(new Date('2026-03-11T12:00:00.000Z'))
    expect(vencidos.map((c) => c.id)).toContain(idDoCardDeErro('partida-a', 21))
  })
})
