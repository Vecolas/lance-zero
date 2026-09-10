import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { isValidFen } from '@/lib/chess'
import { isDue } from '@/lib/fsrs/cards'
import {
  cardsDeRepertorio,
  casarCardsComArvore,
  construirRepertorio,
  enunciadoDeRepertorio,
  idDeCardDeRepertorio,
  lanceDoRepertorio,
  nosDeEstudo,
  origemDoCardDeRepertorio,
} from '@/domain/repertoire'
import { REPERTORIO_BRANCAS, REPERTORIO_PRETAS } from '@/content/openings'
import type { ReviewCard } from '@/domain/types'

/**
 * Portão dos cards FSRS de repertório.
 *
 * O QUE ELE PROVA: um card por nó de estudo (nem mais, nem menos, mesmo com
 * transposição), enunciado que não entrega a resposta, id derivado e estável,
 * relógio por parâmetro, e nenhuma cópia da ideia dentro do card.
 *
 * O QUE ELE NÃO PROVA: nada sobre o agendamento em si — quem prova o FSRS é
 * `tests/unit/fsrs-scheduler.test.ts`. Aqui só se confere que o card nasce
 * vencido e com a data que foi passada.
 */

const arvore = construirRepertorio(REPERTORIO_BRANCAS)
const AGORA = new Date('2026-03-01T09:00:00Z')

describe('cards de repertório', () => {
  const cards = cardsDeRepertorio(arvore, AGORA)

  // Regra 3 dos portões: geração vazia não é aprovação.
  it('gerou cards', () => {
    expect(cards.length).toBeGreaterThan(0)
  })

  it('há exatamente um card por nó de estudo', () => {
    expect(cards).toHaveLength(nosDeEstudo(arvore).length)
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length)
  })

  /**
   * Transposição não pode virar dois cards. Se virasse, o aluno responderia a
   * mesma pergunta duas vezes na mesma sessão — e o modelo de retenção contaria
   * dois acertos por um.
   */
  it('a posição alcançada por dois caminhos gera um card só', () => {
    const chess = new Chess()
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6']) {
      chess.move(san)
    }
    const transposta = cards.filter((c) =>
      c.fen.startsWith(chess.fen().split(' ').slice(0, 4).join(' ')),
    )
    expect(transposta).toHaveLength(1)
  })

  it('todo card é de repertório, com posição válida e solução em UCI', () => {
    for (const card of cards) {
      expect(card.kind).toBe('repertorio')
      expect(isValidFen(card.fen)).toBe(true)
      expect(card.solutionUci).toHaveLength(1)
      expect(card.solutionUci[0]).toMatch(/^[a-h][1-8][a-h][1-8][nbrq]?$/)
      expect(card.skillIds.length).toBeGreaterThan(0)
      expect(card.skillIds.every((s) => s.startsWith('opening.'))).toBe(true)
    }
  })

  it('a solução é o lance que o repertório prescreve naquela posição', () => {
    for (const no of nosDeEstudo(arvore)) {
      const ramo = lanceDoRepertorio(arvore, no)
      const card = cards.find((c) => c.id === idDeCardDeRepertorio(arvore.id, no.identidade))
      expect(card?.solutionUci).toEqual([ramo?.uci])
    }
  })

  /**
   * RECUPERAÇÃO ANTES DE EXPLICAÇÃO. O enunciado não pode conter a resposta em
   * nenhuma forma: nem o lance em SAN, nem em UCI, nem a ideia escrita, nem o
   * nome da abertura.
   *
   * A checagem é por SUBSTRING de propósito. Substring é MAIS severa do que
   * palavra inteira aqui: qualquer coincidência acusa, e acusar demais faz o
   * portão reprovar — nunca aprovar por engano.
   */
  it('o enunciado não entrega o lance nem a ideia', () => {
    const vazamentos: string[] = []
    for (const no of nosDeEstudo(arvore)) {
      const ramo = lanceDoRepertorio(arvore, no)
      const card = cards.find((c) => c.id === idDeCardDeRepertorio(arvore.id, no.identidade))
      const prompt = card?.prompt ?? ''
      if (ramo && prompt.includes(ramo.san)) vazamentos.push(`SAN ${ramo.san}`)
      if (ramo && prompt.includes(ramo.uci)) vazamentos.push(`UCI ${ramo.uci}`)
      if (ramo && prompt.includes(ramo.ideia)) vazamentos.push(`ideia de ${ramo.san}`)
    }
    expect(vazamentos).toEqual([])
  })

  it('o enunciado diz de que lado o aluno joga, em PT-BR', () => {
    expect(enunciadoDeRepertorio('w')).toContain('de brancas')
    expect(enunciadoDeRepertorio('b')).toContain('de pretas')
    expect(cards.every((c) => c.prompt === enunciadoDeRepertorio('w'))).toBe(true)
  })

  /**
   * A ideia mora na árvore, não dentro do card. Card e conteúdo são fontes
   * diferentes de coisas diferentes; copiar o texto criaria a versão velha
   * gravada no IndexedDB do aluno.
   */
  it('o card não carrega uma cópia da ideia', () => {
    const serializado = JSON.stringify(cards)
    for (const no of arvore.nos.values()) {
      for (const ramo of no.ramos) {
        expect(serializado.includes(ramo.ideia)).toBe(false)
      }
    }
  })

  it('o relógio entra por parâmetro e o card nasce vencido', () => {
    expect(cards.every((c) => c.createdAt === AGORA.toISOString())).toBe(true)
    expect(cards.every((c) => isDue(c, AGORA))).toBe(true)

    const outroDia = new Date('2026-04-02T07:00:00Z')
    const outros = cardsDeRepertorio(arvore, outroDia)
    expect(outros.every((c) => c.createdAt === outroDia.toISOString())).toBe(true)
    // Mesmos ids: o id é derivado da posição, não do instante.
    expect(outros.map((c) => c.id)).toEqual(cards.map((c) => c.id))
  })

  it('repertórios diferentes geram ids diferentes para a mesma posição', () => {
    const pretas = construirRepertorio(REPERTORIO_PRETAS)
    const idBrancas = idDeCardDeRepertorio(arvore.id, arvore.raiz)
    const idPretas = idDeCardDeRepertorio(pretas.id, pretas.raiz)
    expect(idBrancas).not.toBe(idPretas)
  })
})

describe('id do card', () => {
  it('a ida e volta preserva repertório e posição', () => {
    const id = idDeCardDeRepertorio('brancas-italiana', arvore.raiz)
    expect(origemDoCardDeRepertorio(id)).toEqual({
      repertorioId: 'brancas-italiana',
      identidade: arvore.raiz,
    })
  })

  it('id de outro tipo de card não é lido como repertório', () => {
    expect(origemDoCardDeRepertorio('erro-de-partida:123')).toBeNull()
    expect(origemDoCardDeRepertorio('repertorio')).toBeNull()
    expect(origemDoCardDeRepertorio('repertorio:')).toBeNull()
    expect(origemDoCardDeRepertorio('repertorio:x:')).toBeNull()
  })

  it('id de repertório com ":" lança em vez de gerar id que não volta', () => {
    expect(() => idDeCardDeRepertorio('a:b', arvore.raiz)).toThrow()
  })
})

describe('casamento entre cards guardados e a árvore atual', () => {
  const cards = cardsDeRepertorio(arvore, AGORA)

  it('cards do repertório casam com nó e ramo, e trazem a ideia', () => {
    const { casados, orfaos, deOutroRepertorio } = casarCardsComArvore(cards, arvore)
    expect(casados).toHaveLength(cards.length)
    expect(orfaos).toEqual([])
    expect(deOutroRepertorio).toEqual([])
    expect(casados.every((c) => c.ideia.trim().length > 0)).toBe(true)
    expect(casados.every((c) => c.ideia === c.ramo.ideia)).toBe(true)
  })

  /**
   * Editar o conteúdo pode deixar cards órfãos no armazenamento de alguém.
   * Eles têm de aparecer numa lista, nunca sumir.
   */
  it('card cujo nó saiu do conteúdo vira órfão, não desaparece', () => {
    const fantasma: ReviewCard = {
      ...cards[0],
      id: idDeCardDeRepertorio(arvore.id, '8/8/8/4k3/8/8/4K3/8 w - -'),
    }
    const { casados, orfaos } = casarCardsComArvore([...cards, fantasma], arvore)
    expect(orfaos.map((c) => c.id)).toEqual([fantasma.id])
    expect(casados).toHaveLength(cards.length)
  })

  it('card de outro repertório é separado, não tratado como órfão', () => {
    const deOutro: ReviewCard = { ...cards[0], id: idDeCardDeRepertorio('outro', arvore.raiz) }
    const resultado = casarCardsComArvore([deOutro], arvore)
    expect(resultado.deOutroRepertorio.map((c) => c.id)).toEqual([deOutro.id])
    expect(resultado.orfaos).toEqual([])
    expect(resultado.casados).toEqual([])
  })

  it('card que não é de repertório é separado', () => {
    const outroTipo: ReviewCard = { ...cards[0], id: 'erro-de-partida:42', kind: 'erro-de-partida' }
    const resultado = casarCardsComArvore([outroTipo], arvore)
    expect(resultado.deOutroRepertorio.map((c) => c.id)).toEqual(['erro-de-partida:42'])
  })

  it('sem cards, nada é afirmado em nenhuma das três listas', () => {
    const resultado = casarCardsComArvore([], arvore)
    expect(resultado.casados).toEqual([])
    expect(resultado.orfaos).toEqual([])
    expect(resultado.deOutroRepertorio).toEqual([])
  })
})
