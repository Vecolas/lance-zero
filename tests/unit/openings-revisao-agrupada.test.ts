/**
 * A REVISÃO DE ABERTURA: uma variação por fora, N cards por dentro.
 *
 * DOIS DEFEITOS QUE NÃO DÃO ERRO NENHUM.
 *
 * O PRIMEIRO é de apresentação, e o plano §45 o nomeia: "1/20 por ply". Cada nó
 * do repertório é um card de FSRS — e deve continuar sendo, porque agendar por
 * posição é o que faz a revisão acertar o que o aluno de fato esqueceu. Mas a
 * FILA mostrava vinte itens idênticos, e o aluno não sabia o que estava
 * revisando nem quanto faltava.
 *
 * O SEGUNDO é pedagógico (§44): cair de paraquedas numa FEN do meio da linha
 * mede reconhecimento de IMAGEM, não repertório. A diferença aparece justamente
 * na partida, onde a posição chega por um caminho e não por um cartão.
 */

import { describe, expect, it } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'
import { openingReviewCards } from '@/domain/openings/review'
import {
  agruparRevisaoDeAbertura,
  contextoDaRevisao,
  noDoCardDeAbertura,
  ramoDoNo,
} from '@/domain/openings/revisao-agrupada'
import { ramosDaAbertura } from '@/domain/openings/ramos'
import { emptyOpeningProgress } from '@/domain/openings'
import { applyMove, identidadeDePosicao } from '@/lib/chess'
import type { ReviewCard } from '@/domain/types'

const ITALIANA = OPENING_COURSES.find((o) => o.slug === 'italiana')!
const AGORA = new Date('2026-03-01T12:00:00.000Z')

/** Todos os cards que a Italiana geraria com a abertura inteira percorrida. */
function cardsDaItaliana(): ReviewCard[] {
  const progress = {
    ...emptyOpeningProgress(ITALIANA.id),
    learnedNodeIds: [...ITALIANA.graph.keys()],
  }
  return openingReviewCards(ITALIANA, progress, AGORA)
}

describe('o card sabe a que nó pertence', () => {
  it('lê o nó sem partir a identidade da posição ao meio', () => {
    /*
      O nodeId É UMA FEN NORMALIZADA, e um `split(':')` cego a partiria — o card
      nunca mais encontraria o próprio nó, e o agrupamento o jogaria em silêncio
      na linha principal.
    */
    for (const card of cardsDaItaliana()) {
      const nodeId = noDoCardDeAbertura(card, ITALIANA)
      expect(nodeId, card.id).toBeTruthy()
      expect(ITALIANA.graph.has(nodeId ?? ''), `${card.id} → ${nodeId}`).toBe(true)
    }
  })

  it('cards com sufixo de plano, erro e ramo apontam para o MESMO nó', () => {
    const cards = cardsDaItaliana()
    const comSufixo = cards.filter((card) => /:(plan|mistake|branch):/.test(card.id))
    expect(comSufixo.length).toBeGreaterThan(0)
    for (const card of comSufixo) {
      expect(ITALIANA.graph.has(noDoCardDeAbertura(card, ITALIANA) ?? ''), card.id).toBe(true)
    }
  })

  it('card de outro domínio não é lido como card de abertura', () => {
    const intruso = { ...cardsDaItaliana()[0]!, id: 'repertorio:meu:algo' }
    expect(noDoCardDeAbertura(intruso, ITALIANA)).toBeNull()
  })
})

describe('a que ramo um nó pertence', () => {
  it('o prefixo compartilhado é da LINHA PRINCIPAL, e não do ramo', () => {
    /*
      A REGRA É "DEPOIS DA BIFURCAÇÃO". Atribuir um nó do prefixo ao ramo faria a
      mesma posição aparecer em dois itens, e o aluno a revisaria duas vezes com
      o mesmo lance.
    */
    let fen = ITALIANA.rootFen
    for (const lance of ITALIANA.mainline.slice(0, 4)) {
      fen = applyMove(fen, lance.san)!.fenAfter
      expect(ramoDoNo(ITALIANA, identidadeDePosicao(fen))).toBeNull()
    }
  })

  it('a posição depois do desvio pertence ao ramo que a criou', () => {
    const ramo = ramosDaAbertura(ITALIANA).find(
      (item) => item.ramificacao.indiceDaDivergencia !== null,
    )!
    const divergencia = ramo.ramificacao.indiceDaDivergencia!
    let fen = ITALIANA.rootFen
    for (const lance of ramo.ramificacao.variacao.line.slice(0, divergencia + 1)) {
      fen = applyMove(fen, lance.san)!.fenAfter
    }
    expect(ramoDoNo(ITALIANA, identidadeDePosicao(fen))?.id).toBe(ramo.id)
  })
})

describe('o agrupamento', () => {
  it('uma abertura inteira vira poucos itens, e não dezenas', () => {
    const cards = cardsDaItaliana()
    const itens = agruparRevisaoDeAbertura(ITALIANA, cards)

    // O ponto inteiro do §45: a fila encolhe, o agendamento não.
    expect(itens.length).toBeLessThan(cards.length)
    expect(itens.length).toBeLessThanOrEqual(ramosDaAbertura(ITALIANA).length + 1)
    expect(itens.length).toBeGreaterThan(0)
  })

  it('NENHUM card se perde no agrupamento', () => {
    /*
      Este é o portão que importa. Um card fora de todo item é um card que o
      aluno nunca revisa e cujo agendamento nunca avança — ele fica vencido para
      sempre, e a fila nunca zera, sem nada explicando por quê.
    */
    const cards = cardsDaItaliana()
    const agrupados = agruparRevisaoDeAbertura(ITALIANA, cards).flatMap((item) => item.cards)
    expect(agrupados.length).toBe(cards.length)
    expect(new Set(agrupados.map((card) => card.id)).size).toBe(cards.length)
  })

  it('pelo menos um item é de RAMO, e não tudo cai na principal', () => {
    /*
      SEM ESTE PISO, metade dos testes deste arquivo passaria por vacuidade: um
      agrupamento que jogasse todo card na linha principal satisfaria "nenhum
      card se perde", "a principal vem primeiro" e o teste do CTA — que só
      verifica a rota do ramo quando existe um ramo.
    */
    const itens = agruparRevisaoDeAbertura(ITALIANA, cardsDaItaliana())
    expect(itens.filter((item) => item.ramoId !== null).length).toBeGreaterThan(0)
  })

  it('a linha principal vem primeiro, e o título diz o que se revisa', () => {
    const itens = agruparRevisaoDeAbertura(ITALIANA, cardsDaItaliana())
    expect(itens[0]?.ramoId).toBeNull()
    expect(itens[0]?.titulo).toContain('Abertura Italiana')
    for (const item of itens) {
      // "Abertura Italiana — Defesa dos Dois Cavalos", nunca um id cru.
      expect(item.titulo, item.id).toContain('—')
    }
  })

  it('o CTA de reaprender aponta para a VARIAÇÃO, e não para a biblioteca', () => {
    /*
      §46. Quem falhou uma revisão precisa do conteúdo daquele ramo; mandá-lo
      para a lista genérica é pedir que ele procure sozinho o que o app já sabe.
    */
    for (const item of agruparRevisaoDeAbertura(ITALIANA, cardsDaItaliana())) {
      expect(item.rotaParaReaprender).toContain('/aberturas/italiana')
      expect(item.rotaParaReaprender).toContain('modo=reaprender')
      if (item.ramoId) expect(item.rotaParaReaprender).toContain('ramo=')
    }
  })

  it('cards de outra abertura não entram', () => {
    const outra = OPENING_COURSES.find((o) => o.slug === 'caro-kann')!
    const cards = openingReviewCards(
      outra,
      { ...emptyOpeningProgress(outra.id), learnedNodeIds: [...outra.graph.keys()] },
      AGORA,
    )
    expect(agruparRevisaoDeAbertura(ITALIANA, cards)).toEqual([])
  })

  it('sem cards, nenhum item — e não um item vazio', () => {
    expect(agruparRevisaoDeAbertura(ITALIANA, [])).toEqual([])
  })
})

describe('a reconstrução de contexto', () => {
  it('o caminho SEMPRE termina na posição do card', () => {
    /*
      O INVARIANTE QUE SUSTENTA TUDO. Se a reconstrução terminasse noutra
      posição, a revisão cobraria uma decisão diferente da agendada — e o FSRS
      registraria acerto ou erro sobre uma pergunta que não foi feita.
    */
    for (const card of cardsDaItaliana()) {
      const contexto = contextoDaRevisao(ITALIANA, card)
      let fen = contexto.fenInicial
      for (const uci of contexto.lances) {
        const aplicado = applyMove(fen, {
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length > 4 ? (uci[4] as 'q') : undefined,
        })
        expect(aplicado, `${card.id}: ${uci} ilegal`).toBeTruthy()
        fen = aplicado!.fenAfter
      }
      expect(identidadeDePosicao(fen), card.id).toBe(identidadeDePosicao(card.fen))
    }
  })

  it('reconstrói de fato o caminho quando há caminho', () => {
    // Sem isto, o teste acima passaria com a reconstrução sempre vazia.
    const comCaminho = cardsDaItaliana().filter(
      (card) => contextoDaRevisao(ITALIANA, card).lances.length > 0,
    )
    expect(comCaminho.length).toBeGreaterThan(0)
  })

  it('zero decisões devolve a posição crua', () => {
    // É o comportamento anterior, e ele tem de continuar alcançável — é o que
    // permite calibrar o número sem medo de estar mudando outra coisa.
    const card = cardsDaItaliana()[4]!
    const contexto = contextoDaRevisao(ITALIANA, card, 0)
    expect(contexto.fenInicial).toBe(card.fen)
    expect(contexto.lances).toEqual([])
  })

  it('o SAN acompanha o UCI, lance a lance', () => {
    // A tela escreve o caminho em texto: uma rota que só existe como movimento
    // no tabuleiro some para quem usa leitor de tela.
    for (const card of cardsDaItaliana()) {
      const contexto = contextoDaRevisao(ITALIANA, card)
      expect(contexto.sans.length, card.id).toBe(contexto.lances.length)
    }
  })

  it('card cuja posição não está mais no conteúdo cai na posição crua', () => {
    /*
      Editar o conteúdo pode deixar um card apontando para uma posição que
      nenhuma linha alcança. Inventar um caminho até ela ensinaria uma ordem de
      lances que o repertório não tem — pior que não reconstruir.
    */
    const orfao: ReviewCard = {
      ...cardsDaItaliana()[0]!,
      id: `opening:${ITALIANA.id}:posicao-que-nao-existe`,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    }
    const contexto = contextoDaRevisao(ITALIANA, orfao)
    expect(contexto.lances).toEqual([])
    expect(contexto.fenInicial).toBe(orfao.fen)
  })
})
