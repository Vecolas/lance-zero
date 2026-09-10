/**
 * Portão de `carregarSinaisDePartida`.
 *
 * Este arquivo existe porque a função nasceu SEM teste, e uma frente provou o
 * buraco com uma mutação que SOBREVIVEU: trocar `inicioDaJanela(agora)` por
 * `new Date(0)` — ou seja, pedir ao repositório TODAS as partidas já
 * importadas — não fez nada ficar vermelho.
 *
 * É exatamente a borda que a issue #53 descreveu: a tela pedindo uma janela e o
 * domínio usando outra. O sintoma é mudo dos dois lados — pedir demais só custa
 * leitura, e pedir de menos apaga erro real do plano do dia sem nenhum aviso.
 *
 * O QUE ESTE PORTÃO NÃO PROVA: que o IndexedDB de verdade devolve o que a
 * função espera. Ele roda contra o repositório em memória; a equivalência entre
 * as duas implementações é assunto de `storage-fuso-horario.test.ts`.
 */

import { describe, expect, it } from 'vitest'
import { ERROS_RECENTES_CONFIG, inicioDaJanela } from '@/domain/planning/erros-recentes'
import type {
  Game,
  GameQuery,
  PositionAnalysis,
  ReviewCard,
  TrainingRepository,
} from '@/domain/types'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import { carregarSinaisDePartida } from '@/lib/training/sinais-de-partida'

const DIA = 24 * 60 * 60 * 1000
const AGORA = new Date('2026-09-09T12:00:00.000Z')

/** O aluno de brancas sai do próprio repertório: 3.Bb5 onde o livro dele pede outro lance. */
const DESVIO_BB5 = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *'
/** A mesma abertura, do começo ao fim dentro do livro. */
const NO_LIVRO = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. O-O *'

function partida(id: string, diasAtras: number): Game {
  return {
    id,
    source: 'pgn',
    playedAt: new Date(AGORA.getTime() - diasAtras * DIA).toISOString(),
    white: 'Alice',
    black: 'Bruno',
    result: '1-0',
    userColor: 'w',
    pgn: '1. e4 e5 *',
    importedAt: AGORA.toISOString(),
  }
}

function analise(gameId: string): PositionAnalysis {
  return {
    gameId,
    ply: 10,
    fenBefore: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
    userMoveUci: 'e1e2',
    bestMoveUci: 'h1h8',
    pv: ['h1h8'],
    scoreCp: -300,
    mateIn: null,
    expectedScoreLossPp: 30,
    severity: 'erro-grave',
    skillIds: ['tactics.fork'],
    explanationCode: 'fork',
    precisao: 'aprofundada',
  }
}

/** Espiona o que a função PEDE ao repositório, que é onde a janela é aplicada. */
function espiao(repo: MemoryTrainingRepository): {
  repo: TrainingRepository
  consultas: GameQuery[]
} {
  const consultas: GameQuery[] = []
  const espionado = Object.create(repo) as TrainingRepository
  espionado.listGames = async (query?: GameQuery) => {
    if (query) consultas.push(query)
    return repo.listGames(query)
  }
  return { repo: espionado, consultas }
}

describe('carregarSinaisDePartida', () => {
  it('pede ao repositório a MESMA janela que o domínio usa', async () => {
    // A mutação que sobreviveu antes deste teste: `new Date(0)` no lugar da
    // borda. Afirmar a borda derivada, e não um valor, é o que faz o portão
    // continuar válido quando a janela do planner mudar.
    const { repo, consultas } = espiao(new MemoryTrainingRepository())

    await carregarSinaisDePartida(repo, { agora: AGORA })

    expect(consultas.length, 'a função não consultou partidas').toBeGreaterThan(0)
    expect(consultas[0].since?.getTime()).toBe(inicioDaJanela(AGORA).getTime())
    expect(consultas[0].limit).toBe(ERROS_RECENTES_CONFIG.maxPartidasVarridas)
    // UMA leitura, e só uma. Cada sinal novo que precisar de partidas usa esta;
    // uma segunda leitura com borda própria é literalmente como nasceu a issue
    // #53, e o dia em que alguém girar só uma das duas janelas nada acusa.
    expect(consultas.length, 'alguém abriu uma segunda leitura de partidas').toBe(1)
  })

  it('erro dentro da janela entra, erro fora dela não', async () => {
    // CONTROLE dos dois lados: sem o caso "fora", uma função que ignorasse a
    // janela passaria; sem o caso "dentro", uma que devolvesse sempre vazio
    // também.
    const base = new MemoryTrainingRepository()
    const dentro = partida('recente', 1)
    const fora = partida('antiga', ERROS_RECENTES_CONFIG.janelaDias + 5)
    for (const jogo of [dentro, fora]) {
      await base.saveGame(jogo)
      await base.savePositionAnalyses([analise(jogo.id)])
    }

    const sinais = await carregarSinaisDePartida(base, { agora: AGORA })

    expect(sinais.recentGameErrors.length).toBe(1)
    expect(sinais.recentGameErrors[0].ocorridoEm).toBe(dentro.playedAt)
  })

  it('o desvio de repertório sai da MESMA janela, sem leitura própria', async () => {
    // O terceiro sinal usa as partidas que já foram lidas. Se alguém lhe der
    // uma janela própria — mais larga, para "não perder desvio antigo" — a
    // partida de fora volta a contar, e o plano de hoje passa a tratar como
    // urgente uma linha que o aluno talvez já tenha corrigido.
    const base = new MemoryTrainingRepository()
    const dentro = { ...partida('recente', 1), pgn: DESVIO_BB5 }
    const fora = {
      ...partida('antiga', ERROS_RECENTES_CONFIG.janelaDias + 5),
      pgn: DESVIO_BB5,
    }
    await base.saveGame(dentro)
    await base.saveGame(fora)

    const { repo, consultas } = espiao(base)
    const sinais = await carregarSinaisDePartida(repo, { agora: AGORA })

    expect(consultas.length).toBe(1)
    expect(sinais.desviosDeRepertorio).toHaveLength(1)
    expect(sinais.desviosDeRepertorio[0].sanJogado).toBe('Bb5')
    // Uma partida, e não duas: a de fora da janela não entrou.
    expect(sinais.desviosDeRepertorio[0].partidas).toBe(1)
    expect(sinais.desviosDeRepertorio[0].gameIds).toEqual([dentro.id])
  })

  it('CONTROLE: partida dentro do livro não vira desvio', async () => {
    // Sem esta metade, uma implementação que devolvesse desvio para qualquer
    // partida importada passaria no caso acima.
    const base = new MemoryTrainingRepository()
    await base.saveGame({ ...partida('recente', 1), pgn: NO_LIVRO })

    const sinais = await carregarSinaisDePartida(base, { agora: AGORA })

    expect(sinais.desviosDeRepertorio).toEqual([])
  })

  it('sem card de treino não há veredito de retenção nenhum', async () => {
    // Habilidade que nunca virou treino não pode ganhar nem perder prioridade:
    // não há "depois do treino" para verificar.
    const base = new MemoryTrainingRepository()
    const jogo = partida('recente', 1)
    await base.saveGame(jogo)
    await base.savePositionAnalyses([analise(jogo.id)])

    const sinais = await carregarSinaisDePartida(base, { agora: AGORA })

    expect(sinais.retencoes.size).toBe(0)
  })

  it('com card de treino, a habilidade ganha veredito', async () => {
    const base = new MemoryTrainingRepository()
    const jogo = partida('recente', 1)
    await base.saveGame(jogo)
    await base.savePositionAnalyses([analise(jogo.id)])
    const card: ReviewCard = {
      id: 'card-1',
      kind: 'erro-de-partida',
      skillIds: ['tactics.fork'],
      fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
      solutionUci: ['h1h8'],
      prompt: 'Ache o lance.',
      createdAt: new Date(AGORA.getTime() - 5 * DIA).toISOString(),
      dueAt: new Date(AGORA.getTime() + 30 * DIA).toISOString(),
      scheduler: {
        stability: 5,
        difficulty: 5,
        elapsedDays: 0,
        scheduledDays: 30,
        reps: 1,
        lapses: 0,
        state: 'review',
        lastReviewAt: null,
      },
    }
    await base.saveReviewCard(card)

    const sinais = await carregarSinaisDePartida(base, { agora: AGORA })

    expect(sinais.retencoes.get('tactics.fork')?.veredito).toBe('voltou-a-falhar')
  })
})
