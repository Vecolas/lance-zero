/**
 * Portão da PERSISTÊNCIA de finais.
 *
 * O que ele cobra, e por quê:
 *
 * 1. O CARD DE TODA POSIÇÃO DO CURRÍCULO É JOGÁVEL. A varredura parte da FONTE
 *    (`CURRICULO_FINAIS`), nunca de uma lista escrita aqui: posição nova entra
 *    na varredura sem ninguém lembrar de cadastrá-la. Card com solução ilegal
 *    ou vazia só apareceria como defeito semanas depois, dentro da fila de
 *    revisão do aluno — que é o pior lugar possível para descobrir.
 *
 * 2. O PROGRESSO DO FSRS SOBREVIVE À SEGUNDA TENTATIVA. É a falha SILENCIOSA
 *    que este arquivo existe para impedir: `saveReviewCard` é upsert cego, e
 *    gravar o card recém-criado por cima apagaria semanas de revisão sem uma
 *    linha no console. O teste afirma a REGRA (o agendamento não regride), não
 *    um `dueAt` cravado — número cravado aqui defenderia o defeito no dia em que
 *    alguém recalibrasse o escalonador.
 *
 * 3. O QUE NÃO VIRA CARD. Cumprir sem dica não pode gerar dever de casa: o card
 *    nasce vencido e mandaria o aluno refazer HOJE o que ele acabou de acertar.
 *
 * 4. O RELÓGIO É PARÂMETRO. Nenhuma data aqui vem de `new Date()` do sistema:
 *    todo teste fixa o instante, e é isso que permite afirmar vencimento.
 *
 * O QUE ESTE PORTÃO NÃO PROVA: que a TELA chama isto uma vez por tentativa.
 * Essa é a falha que infla a maestria em silêncio, e ela é coberta em
 * `endgames-persistencia-tela.test.tsx`.
 */

import { describe, expect, it } from 'vitest'
import { CURRICULO_FINAIS } from '@/content/endgames'
import type { LicaoDeFinal, PosicaoDeFinal } from '@/domain/endgames'
import {
  chaveDaPosicao,
  gravarTentativaDeFinal,
  historicoDasPosicoes,
  mereceCard,
  posicaoIdDaChave,
  posicaoParaReviewCard,
  tentativaParaRegistro,
  type TentativaDeFinal,
} from '@/domain/endgames/persistencia'
import { parseUci } from '@/lib/chess'
import { applyMove } from '@/lib/chess'
import { applyReview } from '@/lib/fsrs/cards'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import type { PuzzleAttempt } from '@/domain/types'

const AGORA = new Date('2026-03-01T12:00:00.000Z')

const LIMPA: TentativaDeFinal = {
  cumpriu: true,
  dicasUsadas: 0,
  recomecos: 0,
  lancesDoAluno: 1,
  thinkTimeMs: 4000,
}

const FALHOU: TentativaDeFinal = { ...LIMPA, cumpriu: false }
const COM_DICA: TentativaDeFinal = { ...LIMPA, dicasUsadas: 2 }

/** Primeira lição e primeira posição do currículo, sem cravar id nenhum. */
function primeiraPosicao(): { licao: LicaoDeFinal; posicao: PosicaoDeFinal } {
  const licao = CURRICULO_FINAIS[0]
  const posicao = licao?.posicoes[0]
  if (licao === undefined || posicao === undefined) {
    throw new Error('Currículo de finais vazio: este teste precisa de conteúdo para exercitar.')
  }
  return { licao, posicao }
}

function todasAsPosicoes(): { licao: LicaoDeFinal; posicao: PosicaoDeFinal }[] {
  return CURRICULO_FINAIS.flatMap((licao) => licao.posicoes.map((posicao) => ({ licao, posicao })))
}

describe('chave da posição de final', () => {
  it('faz a ida e a volta para todo id do currículo', () => {
    const posicoes = todasAsPosicoes()
    // Regra 3 dos portões: varredura vazia não é aprovação.
    expect(posicoes.length).toBeGreaterThan(0)
    for (const { posicao } of posicoes) {
      expect(posicaoIdDaChave(chaveDaPosicao(posicao.id))).toBe(posicao.id)
    }
  })

  it('sobrevive a id com o separador dentro', () => {
    expect(posicaoIdDaChave(chaveDaPosicao('final:estranho:1'))).toBe('final:estranho:1')
  })

  it('não reconhece chave que não é de final', () => {
    expect(posicaoIdDaChave('puzzle:abc')).toBeNull()
    expect(posicaoIdDaChave('abc')).toBeNull()
  })
})

describe('card de revisão de posição de final', () => {
  it('gera, para toda posição do currículo, um card com solução legal', () => {
    const posicoes = todasAsPosicoes()
    expect(posicoes.length).toBeGreaterThan(0)

    for (const { licao, posicao } of posicoes) {
      const card = posicaoParaReviewCard(licao, posicao, { agora: AGORA })

      expect(card.kind).toBe('final')
      expect(card.skillIds).toEqual([licao.habilidade])
      expect(card.fen).toBe(posicao.fen)
      expect(card.prompt).toContain(posicao.enunciado)

      // A solução é o começo da linha modelo — não uma segunda verdade escrita
      // à parte, que poderia divergir do currículo.
      expect(card.solutionUci.length).toBeGreaterThan(0)
      expect(posicao.linhaModelo.slice(0, card.solutionUci.length)).toEqual(card.solutionUci)

      // E é jogável na posição do card: card que não aceita o próprio lance
      // certo reprovaria o aluno para sempre.
      let fen = card.fen
      for (const uci of card.solutionUci) {
        const entrada = parseUci(uci)
        const aplicado = entrada === null ? null : applyMove(fen, entrada)
        expect(aplicado, `${uci} é ilegal em ${fen} (posição ${posicao.id})`).not.toBeNull()
        fen = aplicado!.fenAfter
      }
    }
  })

  it('nasce vencido: o primeiro contato é na mesma sessão do erro', () => {
    const { licao, posicao } = primeiraPosicao()
    const card = posicaoParaReviewCard(licao, posicao, { agora: AGORA })
    expect(Date.parse(card.dueAt)).toBeLessThanOrEqual(AGORA.getTime())
  })

  it('recusa em voz alta a posição sem linha modelo', () => {
    const { licao, posicao } = primeiraPosicao()
    expect(() =>
      posicaoParaReviewCard(licao, { ...posicao, linhaModelo: [] }, { agora: AGORA }),
    ).toThrow(/linha modelo/i)
  })
})

describe('o que merece card', () => {
  it('cumprir sem dica não vira dever de casa', () => {
    expect(mereceCard(LIMPA)).toBe(false)
  })

  it('falhar vira card', () => {
    expect(mereceCard(FALHOU)).toBe(true)
  })

  it('cumprir com dica vira card', () => {
    expect(mereceCard(COM_DICA)).toBe(true)
  })
})

describe('registro da tentativa', () => {
  it('guarda a posição na chave estável e o instante no id', () => {
    const { licao, posicao } = primeiraPosicao()
    const registro = tentativaParaRegistro(licao, posicao, LIMPA, { agora: AGORA })

    expect(registro.puzzleId).toBe(chaveDaPosicao(posicao.id))
    expect(registro.attemptedAt).toBe(AGORA.toISOString())
    expect(registro.skillIds).toEqual([licao.habilidade])
    expect(registro.solved).toBe(true)
    expect(registro.firstTry).toBe(true)
  })

  it('não chama de primeira tentativa quem recomeçou a posição', () => {
    const { licao, posicao } = primeiraPosicao()
    const registro = tentativaParaRegistro(
      licao,
      posicao,
      { ...LIMPA, recomecos: 1 },
      {
        agora: AGORA,
      },
    )
    expect(registro.solved).toBe(true)
    expect(registro.firstTry).toBe(false)
  })

  it('duas tentativas em instantes diferentes são dois registros', () => {
    const { licao, posicao } = primeiraPosicao()
    const primeira = tentativaParaRegistro(licao, posicao, FALHOU, { agora: AGORA })
    const segunda = tentativaParaRegistro(licao, posicao, LIMPA, {
      agora: new Date(AGORA.getTime() + 60_000),
    })
    expect(primeira.id).not.toBe(segunda.id)
    expect(primeira.puzzleId).toBe(segunda.puzzleId)
  })
})

describe('histórico derivado dos registros', () => {
  /**
   * A ordem NÃO pode mudar o resultado, e por isso todo caso aqui roda nas duas
   * ordens. O repositório devolve do mais novo para o mais antigo; um acerto
   * seguido de tentativas mais recentes que falharam é o caso normal, e uma
   * leitura que só olhasse o último registro apagaria o acerto em silêncio.
   */
  const doisSentidos = (registros: PuzzleAttempt[]) => [registros, [...registros].reverse()]

  it('conta tentativas por posição e ignora o que não é final, em qualquer ordem', () => {
    const registros: PuzzleAttempt[] = [
      registro('final:oposicao-defender', false, '2026-03-01T12:00:00.000Z'),
      registro('final:oposicao-defender', true, '2026-03-01T11:00:00.000Z'),
      registro('final:oposicao-defender', false, '2026-03-01T10:00:00.000Z'),
      registro('puzzle-do-lichess', true, '2026-03-01T11:30:00.000Z'),
    ]

    for (const ordem of doisSentidos(registros)) {
      const historico = historicoDasPosicoes(ordem)
      expect(historico.size).toBe(1)
      const item = historico.get('oposicao-defender')
      expect(item?.tentativas).toBe(3)
      // Cumpriu UMA vez basta, mesmo que as tentativas seguintes tenham falhado.
      expect(item?.cumpriu).toBe(true)
      expect(item?.ultimaEm).toBe('2026-03-01T12:00:00.000Z')
    }
  })

  it('não inventa sucesso quando nenhuma tentativa cumpriu', () => {
    const historico = historicoDasPosicoes([
      registro('final:x', false, '2026-03-01T10:00:00.000Z'),
      registro('final:x', false, '2026-03-01T09:00:00.000Z'),
    ])
    expect(historico.get('x')?.cumpriu).toBe(false)
    // A mais recente é a que vale, mesmo chegando fora de ordem.
    expect(historico.get('x')?.ultimaEm).toBe('2026-03-01T10:00:00.000Z')
  })
})

function registro(puzzleId: string, solved: boolean, attemptedAt: string): PuzzleAttempt {
  return {
    id: `${puzzleId}:${attemptedAt}`,
    puzzleId,
    skillIds: [],
    attemptedAt,
    solved,
    firstTry: false,
    hintsUsed: 0,
    thinkTimeMs: 0,
  }
}

describe('gravar a tentativa', () => {
  it('grava o registro e move a maestria da habilidade da lição', async () => {
    const repo = new MemoryTrainingRepository()
    const { licao, posicao } = primeiraPosicao()

    await gravarTentativaDeFinal(repo, { licao, posicao, tentativa: LIMPA }, { agora: AGORA })

    const registros = await repo.listPuzzleAttempts()
    expect(registros).toHaveLength(1)
    expect(registros[0].puzzleId).toBe(chaveDaPosicao(posicao.id))

    const mastery = await repo.getSkillMastery()
    expect(mastery.map((m) => m.skillId)).toEqual([licao.habilidade])
    expect(mastery[0].attempts).toBe(1)
    expect(mastery[0].lastSeenAt).toBe(AGORA.toISOString())
    // Cumpriu sem dica: a maestria tem de SUBIR, não só existir.
    expect(mastery[0].mastery).toBeGreaterThan(0)

    // Treinar um final NÃO é jogar uma partida nem fazer uma revisão vencida.
    // Contá-lo como um dos dois mentiria para o planner: ele passaria a achar
    // que a habilidade tem evidência de partida real (ou de retenção) que ela
    // não tem, e a prioridade do plano do dia sairia errada sem sintoma.
    expect(mastery[0].realGameOccurrences).toBe(0)
    expect(mastery[0].realGameErrors).toBe(0)
    expect(mastery[0].retentionAccuracy).toBe(0)
  })

  it('tentativa falha derruba o acerto recente em vez de subir', async () => {
    const repo = new MemoryTrainingRepository()
    const { licao, posicao } = primeiraPosicao()

    await gravarTentativaDeFinal(repo, { licao, posicao, tentativa: LIMPA }, { agora: AGORA })
    const depoisDoAcerto = (await repo.getSkillMastery())[0].recentAccuracy

    await gravarTentativaDeFinal(
      repo,
      { licao, posicao, tentativa: FALHOU },
      { agora: new Date(AGORA.getTime() + 60_000) },
    )
    const depoisDoErro = (await repo.getSkillMastery())[0].recentAccuracy

    expect(depoisDoErro).toBeLessThan(depoisDoAcerto)
  })

  it('cada chamada é uma tentativa: duas chamadas, dois registros e duas amostras', async () => {
    const repo = new MemoryTrainingRepository()
    const { licao, posicao } = primeiraPosicao()

    await gravarTentativaDeFinal(repo, { licao, posicao, tentativa: LIMPA }, { agora: AGORA })
    await gravarTentativaDeFinal(
      repo,
      { licao, posicao, tentativa: LIMPA },
      { agora: new Date(AGORA.getTime() + 1000) },
    )

    expect(await repo.listPuzzleAttempts()).toHaveLength(2)
    expect((await repo.getSkillMastery())[0].attempts).toBe(2)
  })

  it('a posição não cumprida entra vencida na fila de revisão', async () => {
    const repo = new MemoryTrainingRepository()
    const { licao, posicao } = primeiraPosicao()

    const feito = await gravarTentativaDeFinal(
      repo,
      { licao, posicao, tentativa: FALHOU },
      { agora: AGORA },
    )
    expect(feito.cardCriado).toBe(true)

    const vencidos = await repo.getDueCards(AGORA)
    expect(vencidos.map((card) => card.id)).toContain(chaveDaPosicao(posicao.id))
    expect(vencidos[0].kind).toBe('final')
  })

  it('cumprir sem dica não cria card nenhum', async () => {
    const repo = new MemoryTrainingRepository()
    const { licao, posicao } = primeiraPosicao()

    const feito = await gravarTentativaDeFinal(
      repo,
      { licao, posicao, tentativa: LIMPA },
      { agora: AGORA },
    )

    expect(feito.cardCriado).toBe(false)
    expect(feito.cardAtualizado).toBe(false)
    expect(await repo.listReviewCards()).toHaveLength(0)
  })

  it('PRESERVA o agendamento do card que já existe, em vez de reiniciá-lo', async () => {
    const repo = new MemoryTrainingRepository()
    const { licao, posicao } = primeiraPosicao()

    // O aluno já revisou este card uma vez: o FSRS avançou o vencimento.
    const revisado = applyReview(
      posicaoParaReviewCard(licao, posicao, { agora: AGORA }),
      'good',
      AGORA,
    )
    await repo.saveReviewCard(revisado)

    const depois = new Date(AGORA.getTime() + 3_600_000)
    const feito = await gravarTentativaDeFinal(
      repo,
      { licao, posicao, tentativa: FALHOU },
      { agora: depois },
    )

    expect(feito.cardCriado).toBe(false)
    expect(feito.cardAtualizado).toBe(true)

    const [card] = await repo.listReviewCards()
    // A REGRA, não um número: o agendamento não regride e as repetições não
    // somem. Cravar um `dueAt` aqui defenderia o defeito no dia em que alguém
    // recalibrasse o escalonador.
    expect(card.dueAt).toBe(revisado.dueAt)
    expect(card.createdAt).toBe(revisado.createdAt)
    expect(card.scheduler.reps).toBe(revisado.scheduler.reps)
    expect(card.scheduler.reps).toBeGreaterThan(0)
    expect(Date.parse(card.dueAt)).toBeGreaterThan(depois.getTime())
  })

  it('falha ao gravar o registro não deixa card órfão para trás', async () => {
    const repo = new MemoryTrainingRepository()
    const { licao, posicao } = primeiraPosicao()
    const quebrado = {
      ...repo,
      savePuzzleAttempt: async () => {
        throw new Error('IndexedDB indisponível')
      },
      listReviewCards: () => repo.listReviewCards(),
      saveReviewCard: (card: Parameters<typeof repo.saveReviewCard>[0]) =>
        repo.saveReviewCard(card),
      getSkillMastery: () => repo.getSkillMastery(),
      saveSkillMastery: (m: Parameters<typeof repo.saveSkillMastery>[0]) =>
        repo.saveSkillMastery(m),
    }

    await expect(
      gravarTentativaDeFinal(quebrado, { licao, posicao, tentativa: FALHOU }, { agora: AGORA }),
    ).rejects.toThrow(/IndexedDB/)

    expect(await repo.listReviewCards()).toHaveLength(0)
    expect(await repo.getSkillMastery()).toHaveLength(0)
  })
})
