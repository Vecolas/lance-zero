/**
 * CONTRATO ENTRE O OBJETIVO DECLARADO NA BIBLIOTECA E A TABLEBASE REAL.
 *
 * POR QUE ESTE ARQUIVO EXISTE, e a descoberta é feia: as posições de treino de
 * `src/content/endgames/biblioteca.ts` não foram curadas. Dezenove dos vinte
 * finais recebem, por GERAÇÃO, duas posições — a FEN de prévia e o espelho
 * horizontal dela — ambas com `sideToTrain: 'white'`, `objective: 'win'` e
 * `validationSource: 'curated'`. Nenhuma linha do projeto conferia se alguma
 * dessas três afirmações é verdadeira.
 *
 * O QUE ISSO CUSTA, agora que o treino final tem juiz: o objetivo declarado é o
 * que decide quando a rodada termina em SUCESSO. Numa posição que a tablebase
 * chama de empate, exigir a vitória é exigir o impossível — e o aluno joga até a
 * regra dos 50 lances para receber "não cumprido". É o beco sem saída do
 * ADR-0020 de novo, agora lento em vez de imediato.
 *
 * Exemplo real, medido em 2026-09-17: `king-activity-representative`
 * (`8/8/8/3k4/3p4/8/3K4/8 w`) é declarado `win` para as brancas e a tablebase
 * responde `draw`. As brancas estão um peão abaixo.
 *
 * SE UMA POSIÇÃO DISCORDAR, NÃO CONSERTE O CATÁLOGO POR CONTA PRÓPRIA — a
 * mensagem traz FEN, declaração e veredito justamente para essa conversa. Pode
 * ser a posição que está errada (o caso comum aqui) ou o objetivo; decidir qual
 * é decisão de produto, e silenciar apagaria a pergunta.
 *
 * NÃO RODA NO CI, pelo mesmo motivo dos outros contratos: depende de rede e de
 * serviço de terceiro, e a orientação oficial da Lichess é uma requisição por
 * vez. Rode à mão com `pnpm test:contrato`.
 *
 * O QUE ELE NÃO PROVA: que a posição ENSINA o conceito que o final promete. A
 * tablebase sabe o resultado, não a pedagogia. Uma posição pode ser vitória
 * legítima e continuar sendo um exemplo ruim de "atividade do rei".
 */

import { describe, expect, it } from 'vitest'
import { ENDGAME_POSITION_SETS } from '@/content/endgames/biblioteca'
import type { EndgamePosition } from '@/domain/endgames'
import { LichessTablebaseProvider, TABLEBASE_CONFIG } from '@/lib/tablebase/provider'
import type { ResultadoTeorico } from '@/domain/types'

/** Orçamento: uma requisição por posição, em série, sem paralelismo. */
const TEMPO = 240_000

const transporteReal: typeof fetch = (...args) => globalThis.fetch(...args)

/**
 * O resultado que cada objetivo declarado AFIRMA sobre a posição.
 *
 * Record exaustivo: objetivo novo no catálogo sem decisão aqui não compila, em
 * vez de escapar da conferência em silêncio.
 */
const RESULTADO_AFIRMADO: Record<EndgamePosition['objective'], ResultadoTeorico> = {
  win: 'vitoria',
  mate: 'vitoria',
  promote: 'vitoria',
  'reach-target': 'vitoria',
  draw: 'empate',
  defend: 'empate',
}

function pecas(fen: string): number {
  const tabuleiro = fen.trim().split(/\s+/)[0] ?? ''
  return [...tabuleiro].filter((c) => /[a-zA-Z]/.test(c)).length
}

function ladoQueJoga(fen: string): 'white' | 'black' {
  return fen.trim().split(/\s+/)[1] === 'b' ? 'black' : 'white'
}

const POSICOES = ENDGAME_POSITION_SETS.flatMap((conjunto) =>
  conjunto.positions.map((posicao) => ({ conjunto: conjunto.id, posicao })),
)

/**
 * As posições que a tablebase NÃO alcança, nomeadas uma a uma.
 *
 * A tablebase da Lichess vai até sete peças. O rompimento de três peões contra
 * três tem oito, e é a posição certa para ensinar peão passado — então ela fica,
 * e fica SEM CONFERÊNCIA. Dizer isso aqui é o que impede este arquivo de parecer
 * mais forte do que é: "81 testes verdes" incluiria duas posições que ninguém
 * mediu, e essa é a forma mais barata de um portão mentir.
 *
 * MORDE DOS DOIS LADOS: posição que sair da lista e continuar grande reprova; e
 * posição que entrar na lista e couber na tablebase também. Lista de exceção que
 * ninguém revisa vira permissão permanente.
 */
const SEM_TABLEBASE: readonly string[] = ['passed-pawn-representative', 'passed-pawn-mirror']

describe('a varredura encontra posições de treino', () => {
  it('há posição para conferir — tabela vazia não é aprovação', () => {
    expect(POSICOES.length).toBeGreaterThanOrEqual(30)
  })
})

describe('o lado treinado é quem tem a vez', () => {
  /*
    Não precisa de rede, e é a metade barata do contrato: uma posição em que o
    aluno NÃO joga primeiro começa com o computador mexendo, e o treino passa a
    medir outra coisa. O portão do currículo legado já afirma isto; a biblioteca
    nunca teve quem afirmasse.
  */
  it.each(POSICOES.map((p) => [p.posicao.id, p] as const))('%s', (_id, { posicao }) => {
    expect(ladoQueJoga(posicao.fen), `${posicao.id}: ${posicao.fen}`).toBe(posicao.sideToTrain)
  })
})

describe('o que a tablebase não alcança está declarado', () => {
  it('a lista de posições grandes demais é exatamente a esperada', () => {
    const grandes = POSICOES.filter(({ posicao }) => pecas(posicao.fen) > TABLEBASE_CONFIG.maxPecas)
      .map(({ posicao }) => posicao.id)
      .sort()
    expect(grandes).toEqual([...SEM_TABLEBASE].sort())
  })
})

describe('o objetivo declarado é verdadeiro na posição', () => {
  const provider = new LichessTablebaseProvider({ fetchFn: transporteReal })

  const CONFERIVEIS = POSICOES.filter(({ posicao }) => !SEM_TABLEBASE.includes(posicao.id))

  it('há posição conferível — a lista de exceção não pode engolir o portão', () => {
    expect(CONFERIVEIS.length).toBeGreaterThanOrEqual(30)
  })

  it.each(CONFERIVEIS.map((p) => [p.posicao.id, p] as const))(
    '%s',
    async (_id, { posicao }) => {
      const resultado = await provider.probe(posicao.fen)
      expect(resultado, `${posicao.id}: a tablebase não respondeu`).not.toBeNull()

      expect(
        resultado?.resultado,
        `${posicao.id} (${posicao.fen}) declara objective="${posicao.objective}" ` +
          `— a tablebase diz "${resultado?.categoria}"`,
      ).toBe(RESULTADO_AFIRMADO[posicao.objective])
    },
    TEMPO,
  )
})
