import { describe, expect, it } from 'vitest'
import { applyReview, createReviewCard, isDue } from '@/lib/fsrs/cards'
import { SCHEDULER_CONFIG, createSchedulerState, schedule } from '@/lib/fsrs/scheduler'
import type { ReviewRating } from '@/domain/types'

const AGORA = new Date('2026-01-10T12:00:00.000Z')

const NOTAS: ReviewRating[] = ['again', 'hard', 'good', 'easy']

describe('escalonador FSRS', () => {
  it('nao usa aleatoriedade: o fuzz fica desligado', () => {
    expect(SCHEDULER_CONFIG.enableFuzz).toBe(false)
  })

  it('cria um estado zerado para card novo', () => {
    const estado = createSchedulerState(AGORA)
    expect(estado.state).toBe('new')
    expect(estado.reps).toBe(0)
    expect(estado.lapses).toBe(0)
    expect(estado.stability).toBe(0)
    expect(estado.lastReviewAt).toBeNull()
  })

  it('e deterministico para o mesmo estado e o mesmo relogio', () => {
    const estado = createSchedulerState(AGORA)
    for (const nota of NOTAS) {
      const primeiro = schedule(estado, nota, AGORA)
      const segundo = schedule(estado, nota, AGORA)
      expect(segundo).toEqual(primeiro)
    }
  })

  it('nao muta o estado recebido', () => {
    const estado = createSchedulerState(AGORA)
    const copia = { ...estado }
    schedule(estado, 'good', AGORA)
    expect(estado).toEqual(copia)
  })

  it('ancora o vencimento no relogio injetado', () => {
    const outroRelogio = new Date('2027-06-01T08:30:00.000Z')
    const estado = createSchedulerState(outroRelogio)
    const { state, dueAt } = schedule(estado, 'good', outroRelogio)
    expect(Date.parse(dueAt)).toBeGreaterThan(outroRelogio.getTime())
    expect(state.lastReviewAt).toBe(outroRelogio.toISOString())
  })

  it('ordena estabilidade, dificuldade e vencimento pela nota', () => {
    const estado = createSchedulerState(AGORA)
    const resultados = NOTAS.map((nota) => schedule(estado, nota, AGORA))
    const [again, hard, good, easy] = resultados

    // Estabilidade cresce da nota pior para a melhor.
    expect(again.state.stability).toBeLessThan(hard.state.stability)
    expect(hard.state.stability).toBeLessThan(good.state.stability)
    expect(good.state.stability).toBeLessThan(easy.state.stability)

    // Dificuldade anda na direcao oposta: errar deixa o card mais dificil.
    expect(again.state.difficulty).toBeGreaterThan(good.state.difficulty)
    expect(good.state.difficulty).toBeGreaterThan(easy.state.difficulty)

    // E o vencimento acompanha a estabilidade.
    expect(Date.parse(again.dueAt)).toBeLessThanOrEqual(Date.parse(hard.dueAt))
    expect(Date.parse(hard.dueAt)).toBeLessThan(Date.parse(good.dueAt))
    expect(Date.parse(good.dueAt)).toBeLessThan(Date.parse(easy.dueAt))
  })

  it('conta repeticoes e marca a data da ultima revisao', () => {
    const inicial = createSchedulerState(AGORA)
    const primeira = schedule(inicial, 'good', AGORA)
    expect(primeira.state.reps).toBe(1)
    expect(primeira.state.lastReviewAt).toBe(AGORA.toISOString())

    const depois = new Date(Date.parse(primeira.dueAt))
    const segunda = schedule(primeira.state, 'good', depois)
    expect(segunda.state.reps).toBe(2)
    expect(segunda.state.lastReviewAt).toBe(depois.toISOString())
  })

  it('"again" encurta o intervalo e conta um lapso', () => {
    const inicial = createSchedulerState(AGORA)
    const revisado = schedule(inicial, 'good', AGORA)
    const noVencimento = new Date(Date.parse(revisado.dueAt))

    const esquecido = schedule(revisado.state, 'again', noVencimento)
    expect(esquecido.state.scheduledDays).toBeLessThan(revisado.state.scheduledDays)
    expect(esquecido.state.lapses).toBe(revisado.state.lapses + 1)
    expect(esquecido.state.stability).toBeLessThan(revisado.state.stability)
    expect(esquecido.state.difficulty).toBeGreaterThan(revisado.state.difficulty)
  })

  it('"easy" alonga o intervalo em relacao a "good" na mesma revisao', () => {
    const inicial = createSchedulerState(AGORA)
    const revisado = schedule(inicial, 'good', AGORA)
    const noVencimento = new Date(Date.parse(revisado.dueAt))

    const bom = schedule(revisado.state, 'good', noVencimento)
    const facil = schedule(revisado.state, 'easy', noVencimento)
    expect(facil.state.scheduledDays).toBeGreaterThan(bom.state.scheduledDays)
  })

  it('respeita o teto de intervalo configurado', () => {
    // O ts-fsrs limita o intervalo e depois arredonda o vencimento para o dia,
    // o que pode acrescentar ate dois dias. A folga aqui e essa, nao mais.
    const folgaDeArredondamentoEmDias = 2
    let estado = createSchedulerState(AGORA)
    let relogio = AGORA
    for (let i = 0; i < 20; i += 1) {
      const resultado = schedule(estado, 'easy', relogio)
      estado = resultado.state
      relogio = new Date(Date.parse(resultado.dueAt))
      expect(estado.scheduledDays).toBeLessThanOrEqual(
        SCHEDULER_CONFIG.maximumIntervalDays + folgaDeArredondamentoEmDias,
      )
    }
  })
})

describe('cards de revisao', () => {
  const entrada = {
    id: 'card-1',
    kind: 'erro-de-partida' as const,
    skillIds: ['tactics.fork' as const],
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solutionUci: ['f3f7'],
    prompt: 'Qual e o lance que decide?',
    sourceGameId: 'partida-9',
    sourcePly: 7,
  }

  it('nasce vencido para ser treinado na mesma sessao', () => {
    const card = createReviewCard(entrada, AGORA)
    expect(card.createdAt).toBe(AGORA.toISOString())
    expect(card.dueAt).toBe(AGORA.toISOString())
    expect(card.scheduler.state).toBe('new')
    expect(isDue(card, AGORA)).toBe(true)
  })

  it('mantem a origem quando ela existe e omite quando nao existe', () => {
    const comOrigem = createReviewCard(entrada, AGORA)
    expect(comOrigem.sourceGameId).toBe('partida-9')
    expect(comOrigem.sourcePly).toBe(7)

    const semOrigem = createReviewCard(
      { ...entrada, sourceGameId: undefined, sourcePly: undefined },
      AGORA,
    )
    expect(semOrigem.sourceGameId).toBeUndefined()
    expect('sourceGameId' in semOrigem).toBe(false)
  })

  it('applyReview devolve um card novo sem mutar o original', () => {
    const card = createReviewCard(entrada, AGORA)
    const antes = JSON.stringify(card)
    const revisado = applyReview(card, 'good', AGORA)

    expect(JSON.stringify(card)).toBe(antes)
    expect(revisado).not.toBe(card)
    expect(revisado.id).toBe(card.id)
    expect(revisado.fen).toBe(card.fen)
    expect(Date.parse(revisado.dueAt)).toBeGreaterThan(Date.parse(card.dueAt))
    expect(isDue(revisado, AGORA)).toBe(false)
  })

  it('isDue trata o instante exato do vencimento como vencido', () => {
    const card = createReviewCard(entrada, AGORA)
    const revisado = applyReview(card, 'good', AGORA)
    const noVencimento = new Date(Date.parse(revisado.dueAt))
    expect(isDue(revisado, new Date(noVencimento.getTime() - 1))).toBe(false)
    expect(isDue(revisado, noVencimento)).toBe(true)
  })
})
