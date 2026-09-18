import { describe, expect, it } from 'vitest'

import { OPENING_COURSES } from '@/content/openings/course'
import { applyMove } from '@/lib/chess/position'

/*
  O PORTÃO DA NOTAÇÃO EXATA.

  O portão que já existia cobrava só legalidade: `applyMove(...)` não ser nulo.
  Isso deixa passar um defeito real, porque o `chess.js` é tolerante com o
  sufixo de xeque — ele aceita `Bb4` numa posição em que o lance é `Bb4+` e
  aceita `Bb4+` onde não há xeque nenhum.

  ISSO JÁ ACONTECEU NAS DUAS DIREÇÕES neste repositório, no mesmo dia: a Índia
  da Dama e a Réti nasceram com `Bb4+` e `Qa4+` corretos, alguém (eu) "corrigiu"
  os dois para a forma sem xeque olhando o tabuleiro de cabeça, e nenhum teste
  reclamou. Um curso que escreve xeque onde não há ensina o aluno a duvidar da
  própria leitura — e omitir o xeque que existe é pior, porque o aluno aprende a
  não procurá-lo.

  A regra aqui é simples: a notação autorada tem de ser IGUAL à que o motor de
  regras produz para aquele lance naquela posição. Nada de tolerância.
*/
describe('notação autorada das aberturas', () => {
  it('cada lance da linha principal é escrito exatamente como o motor o escreve', () => {
    for (const opening of OPENING_COURSES) {
      let fen = opening.rootFen
      for (const item of opening.mainline) {
        const aplicado = applyMove(fen, item.san)
        expect(
          aplicado,
          `${opening.slug}: "${item.san}" é ilegal na linha principal`,
        ).not.toBeNull()
        if (!aplicado) break
        expect(aplicado.move.san, `${opening.slug}: "${item.san}" deveria ser escrito`).toBe(
          item.san,
        )
        fen = aplicado.fenAfter
      }
    }
  })

  it('cada lance das variações é escrito exatamente como o motor o escreve', () => {
    for (const opening of OPENING_COURSES) {
      for (const variacao of opening.variations) {
        let fen = opening.rootFen
        for (const item of variacao.line) {
          const aplicado = applyMove(fen, item.san)
          expect(
            aplicado,
            `${opening.slug}/${variacao.id}: "${item.san}" é ilegal na linha`,
          ).not.toBeNull()
          if (!aplicado) break
          expect(
            aplicado.move.san,
            `${opening.slug}/${variacao.id}: "${item.san}" deveria ser escrito`,
          ).toBe(item.san)
          fen = aplicado.fenAfter
        }
      }
    }
  })

  it('o erro autorado é escrito exatamente como o motor o escreve', () => {
    /*
      Aqui a checagem é na PRIMEIRA posição da linha em que o lance é legal — a
      mesma em que o portão de legalidade o encontra. Cobrar em todas seria
      cobrar desambiguação que muda de posição para posição, e isso reprovaria
      conteúdo correto.
    */
    for (const opening of OPENING_COURSES) {
      for (const mistake of opening.mistakes) {
        const node = opening.graph.get(mistake.nodeId)
        if (!node) continue
        const aplicado = applyMove(node.fen, mistake.moveSan)
        if (!aplicado) continue // o portão de legalidade já cobra este caso
        expect(
          aplicado.move.san,
          `${opening.slug}/${mistake.id}: "${mistake.moveSan}" deveria ser escrito`,
        ).toBe(mistake.moveSan)
      }
    }

    for (const opening of OPENING_COURSES) {
      for (const variacao of opening.variations) {
        const lance = variacao.erroComum?.lance
        if (!lance) continue
        let fen: string | null = opening.rootFen
        const posicoes = [opening.rootFen]
        for (const item of variacao.line) {
          const passo = applyMove(fen as string, item.san)
          if (!passo) break
          fen = passo.fenAfter
          posicoes.push(passo.fenAfter)
        }
        const primeira = posicoes.map((p) => applyMove(p, lance)).find((a) => a !== null)
        if (!primeira) continue // o portão de legalidade já cobra este caso
        expect(
          primeira.move.san,
          `${opening.slug}/${variacao.id}: o erro "${lance}" deveria ser escrito`,
        ).toBe(lance)
      }
    }
  })
  it('o erro autorado cai na posição que ele diz, e não no início da partida', () => {
    /*
      `positionPly` é resolvido contra a LINHA PRINCIPAL. Quando o autor escreve
      um ply que a principal não alcança — porque contou os lances de um ramo —
      a resolução cai silenciosamente no `root`, e o erro passa a ilustrar a
      posição inicial.

      Isso aconteceu no Benko: um erro autorado para o ply 7 numa principal de 6
      lances. Só foi pego porque o lance era ilegal na posição inicial; se fosse
      legal lá, o curso teria publicado a explicação errada colada na posição
      errada, e nenhum teste diria nada.
    */
    for (const opening of OPENING_COURSES) {
      for (const mistake of opening.mistakes) {
        if (mistake.positionPly === undefined) continue
        const node = opening.graph.get(mistake.nodeId)
        expect(
          node?.ply,
          `${opening.slug}/${mistake.id}: ply ${mistake.positionPly} nao existe na linha principal (ela tem ${opening.mainline.length})`,
        ).toBe(mistake.positionPly)
      }
    }
  })
})
