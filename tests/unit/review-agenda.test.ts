/**
 * A agenda de revisão: o domínio puro por trás da aba Revisar.
 *
 * O CASO MAIS IMPORTANTE DESTE ARQUIVO é `a contagem passa pela elegibilidade`.
 * Ele existe por um defeito real: `TreinoHub` contava `getDueCards().length` cru
 * enquanto a fila aplicava `cardPodeSerRevisado`. O hub podia anunciar "3 itens
 * vencidos" e a sessão abrir com 1 — dois números para a mesma pergunta, e o
 * aluno sem como saber qual estava mentindo. Nada errava; nenhum teste via.
 *
 * O SEGUNDO É O FUSO. Recorte de dia por UTC já mordeu este projeto uma vez
 * (ver `tests/unit/storage-fuso-horario.test.ts`), e aqui ele aparece duas
 * vezes: nas faixas de vencimento e no agrupamento das sessões passadas.
 */

import { describe, expect, it } from 'vitest'
import {
  agruparEmSessoes,
  diaLocal,
  faixaDoVencimento,
  montarAgenda,
  LAPSES_PARA_REINCIDIR,
} from '@/domain/review/agenda'
import type { ReviewCard, ReviewCardKind, ReviewLog, SchedulerState, SkillId } from '@/domain/types'

/** Meio-dia local, para nenhum caso depender da borda da meia-noite. */
const AGORA = new Date(2026, 8, 16, 12, 0, 0)

function agendador(over: Partial<SchedulerState> = {}): SchedulerState {
  return {
    stability: 4,
    difficulty: 5,
    elapsedDays: 1,
    scheduledDays: 3,
    reps: 2,
    lapses: 0,
    state: 'review',
    lastReviewAt: null,
    ...over,
  }
}

function card(over: Partial<ReviewCard> & { id: string; dueAt: string }): ReviewCard {
  return {
    kind: 'posicao-exata' as ReviewCardKind,
    skillIds: [],
    fen: '8/8/8/8/8/8/8/K6k w - - 0 1',
    solutionUci: ['a1b1'],
    prompt: 'Qual é o melhor lance?',
    createdAt: '2026-09-01T10:00:00.000Z',
    scheduler: agendador(),
    ...over,
  }
}

/** Instante local, para os casos não dependerem do fuso da máquina de CI. */
function local(dia: number, hora = 12, minuto = 0): string {
  return new Date(2026, 8, dia, hora, minuto, 0).toISOString()
}

const NENHUMA_ENSINADA: ReadonlySet<SkillId> = new Set()

describe('a faixa de vencimento é recortada por DIA LOCAL', () => {
  it('o que venceu antes de hoje está atrasado, não só vencido', () => {
    expect(faixaDoVencimento(local(14), AGORA)).toBe('atrasado')
  })

  it('o que venceu hoje de manhã ainda é de hoje', () => {
    // Já passou do relógio, mas não passou do DIA. O aluno lê calendário.
    expect(faixaDoVencimento(local(16, 8), AGORA)).toBe('hoje')
  })

  it('o que vence hoje às 23h é de hoje, mesmo faltando pouco', () => {
    expect(faixaDoVencimento(local(16, 23, 30), AGORA)).toBe('hoje')
  })

  it('o que vence às 00h30 de amanhã é de amanhã, mesmo faltando menos', () => {
    /*
      ESTE CASO É O PONTO DA REGRA. Faltam ~12h para o de amanhã e ~11h para o
      de hoje às 23h — em "24 horas a partir de agora" os dois cairiam juntos.
      Por dia local eles se separam, que é como um calendário lê.
    */
    expect(faixaDoVencimento(local(17, 0, 30), AGORA)).toBe('amanha')
  })

  it('o resto da semana entra em sete-dias, e depois disso em depois', () => {
    expect(faixaDoVencimento(local(20), AGORA)).toBe('sete-dias')
    expect(faixaDoVencimento(local(23, 23, 59), AGORA)).toBe('sete-dias')
    expect(faixaDoVencimento(local(24), AGORA)).toBe('depois')
  })
})

describe('a contagem passa pela elegibilidade', () => {
  it('um conceito nunca ensinado NÃO entra no número que o botão promete', () => {
    /*
      O DEFEITO QUE ESTE CASO FECHA. O hub contava cru e a fila filtrava: a tela
      dizia "2 vencidas" e a sessão abria com 1. Agora existe uma porta só.
    */
    const agenda = montarAgenda({
      cards: [
        card({ id: 'a', dueAt: local(15), kind: 'conceito', skillIds: ['tactics.fork'] }),
        card({ id: 'b', dueAt: local(15) }),
      ],
      logs: [],
      habilidadesEnsinadas: NENHUMA_ENSINADA,
      agora: AGORA,
    })

    expect(agenda.vencidas.map((c) => c.id)).toEqual(['b'])
    expect(agenda.contagem.atrasado).toBe(1)
  })

  it('o mesmo conceito entra quando a habilidade JÁ foi ensinada', () => {
    const agenda = montarAgenda({
      cards: [card({ id: 'a', dueAt: local(15), kind: 'conceito', skillIds: ['tactics.fork'] })],
      logs: [],
      habilidadesEnsinadas: new Set<SkillId>(['tactics.fork']),
      agora: AGORA,
    })

    expect(agenda.vencidas.map((c) => c.id)).toEqual(['a'])
  })

  it('erro de partida entra sempre: a evidência que o criou já o justifica', () => {
    const agenda = montarAgenda({
      cards: [
        card({
          id: 'erro',
          dueAt: local(15),
          kind: 'erro-de-partida',
          skillIds: ['tactics.pin'],
        }),
      ],
      logs: [],
      habilidadesEnsinadas: NENHUMA_ENSINADA,
      agora: AGORA,
    })

    expect(agenda.vencidas).toHaveLength(1)
  })
})

describe('de onde vem o que o aluno revisa', () => {
  it('quebra por tipo e conta quantos de cada já venceram', () => {
    const agenda = montarAgenda({
      cards: [
        card({ id: '1', dueAt: local(15), kind: 'posicao-exata' }),
        card({ id: '2', dueAt: local(15), kind: 'posicao-exata' }),
        card({ id: '3', dueAt: local(22), kind: 'posicao-exata' }),
        card({ id: '4', dueAt: local(15), kind: 'final' }),
      ],
      logs: [],
      habilidadesEnsinadas: NENHUMA_ENSINADA,
      agora: AGORA,
    })

    expect(agenda.origens).toEqual([
      { kind: 'posicao-exata', total: 3, vencidos: 2 },
      { kind: 'final', total: 1, vencidos: 1 },
    ])
  })

  it('a ordem não depende de como o banco devolveu', () => {
    // Mesmos cards, ordem de entrada invertida: a saída tem de ser idêntica.
    const entrada = [
      card({ id: '1', dueAt: local(15), kind: 'final' }),
      card({ id: '2', dueAt: local(15), kind: 'conceito' }),
    ]
    const comum = { logs: [], habilidadesEnsinadas: NENHUMA_ENSINADA, agora: AGORA }

    const a = montarAgenda({ cards: entrada, ...comum })
    const b = montarAgenda({ cards: [...entrada].reverse(), ...comum })

    expect(a.origens).toEqual(b.origens)
  })
})

describe('o que o aluno vem esquecendo', () => {
  it('um card em reaprendizado é reincidente mesmo sem lapses acumulados', () => {
    const agenda = montarAgenda({
      cards: [
        card({
          id: 'x',
          dueAt: local(22),
          scheduler: agendador({ state: 'relearning', lapses: 1 }),
        }),
      ],
      logs: [],
      habilidadesEnsinadas: NENHUMA_ENSINADA,
      agora: AGORA,
    })

    expect(agenda.reincidentes).toHaveLength(1)
    expect(agenda.reincidentes[0].reaprendendo).toBe(true)
  })

  it('um card que já caiu duas vezes é reincidente mesmo estando em dia', () => {
    const agenda = montarAgenda({
      cards: [
        card({
          id: 'y',
          dueAt: local(22),
          scheduler: agendador({ lapses: LAPSES_PARA_REINCIDIR }),
        }),
      ],
      logs: [],
      habilidadesEnsinadas: NENHUMA_ENSINADA,
      agora: AGORA,
    })

    expect(agenda.reincidentes.map((r) => r.cardId)).toEqual(['y'])
  })

  it('um card que nunca caiu não é reincidente', () => {
    const agenda = montarAgenda({
      cards: [card({ id: 'z', dueAt: local(15), scheduler: agendador({ lapses: 1 }) })],
      logs: [],
      habilidadesEnsinadas: NENHUMA_ENSINADA,
      agora: AGORA,
    })

    expect(agenda.reincidentes).toEqual([])
  })
})

describe('o histórico é agrupado por dia DO ALUNO', () => {
  function log(over: Partial<ReviewLog> & { reviewedAt: string }): ReviewLog {
    return { cardId: 'c', rating: 'good', elapsedMs: 0, ...over }
  }

  it('duas revisões do mesmo dia local viram uma sessão', () => {
    const sessoes = agruparEmSessoes([
      log({ reviewedAt: local(15, 9), outcome: 'recalled' }),
      log({ reviewedAt: local(15, 21), outcome: 'failed' }),
    ])

    expect(sessoes).toHaveLength(1)
    expect(sessoes[0].total).toBe(2)
    expect(sessoes[0].porDesfecho).toEqual({ recalled: 1, failed: 1 })
  })

  it('a das 22h de um dia NÃO se junta com a das 9h do seguinte', () => {
    /*
      Agrupar por dia UTC juntaria as duas para metade do mundo. O dia é o do
      aluno, e é por isso que os instantes deste arquivo são construídos em
      horário local em vez de literais ISO.
    */
    const sessoes = agruparEmSessoes([
      log({ reviewedAt: local(15, 22), outcome: 'recalled' }),
      log({ reviewedAt: local(16, 9), outcome: 'recalled' }),
    ])

    expect(sessoes.map((s) => s.dia)).toEqual(['2026-09-16', '2026-09-15'])
  })

  it('log legado sem desfecho conta no total e fica de fora da quebra', () => {
    // `outcome` entrou depois no formato. Contá-lo como `failed` inventaria um
    // fracasso que ninguém registrou.
    const sessoes = agruparEmSessoes([
      log({ reviewedAt: local(15, 9) }),
      log({ reviewedAt: local(15, 10), outcome: 'recalled' }),
    ])

    expect(sessoes[0].total).toBe(2)
    expect(sessoes[0].porDesfecho).toEqual({ recalled: 1 })
  })

  it('devolve as mais recentes primeiro, e respeita o teto', () => {
    const sessoes = agruparEmSessoes(
      [10, 11, 12, 13].map((dia) => log({ reviewedAt: local(dia), outcome: 'recalled' })),
      2,
    )

    expect(sessoes.map((s) => s.dia)).toEqual(['2026-09-13', '2026-09-12'])
  })

  it('nunca revisou é lista vazia, não é erro', () => {
    expect(agruparEmSessoes([])).toEqual([])
  })
})

describe('diaLocal', () => {
  it('usa o calendário do aluno e não o UTC', () => {
    // 22h de 15/09 em fuso negativo já seria 16/09 em UTC.
    expect(diaLocal(new Date(2026, 8, 15, 22, 0, 0))).toBe('2026-09-15')
  })
})
