/**
 * OS PLANOS DEIXAM DE SER PROSA: posição, mecanismo e uma decisão.
 *
 * O QUE ESTE ARQUIVO GUARDA é a microdecisão — a única parte do plano em que o
 * aluno produz alguma coisa, e por isso a única que pode ensinar um erro.
 *
 * O MODO DE FALHA É CONCRETO E JÁ ESTEVE A UM PASSO DE ACONTECER. Todo plano
 * traz uma `arrows` que desenha a rota, e a implementação óbvia da microdecisão
 * é "pergunte pelo lance da seta". No Sistema Londres essa seta é e2→e4, que na
 * posição do plano é **legal e perde um peão**: d5 e o cavalo de f6 já vigiam a
 * casa, e é por isso que o Londres joga e3 antes. Uma pergunta ali ensinaria um
 * erro de material sem que nada na tela avisasse.
 *
 * Daí os três portões abaixo: o lance existe, é do lado do aluno, e a posição é
 * a da linha principal que o conteúdo declara.
 */

import { describe, expect, it } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'
import { posicoesDaLinha } from '@/domain/openings/variacoes'
import { applyMove } from '@/lib/chess'

/** Todos os planos do curso, com a abertura de onde vieram. */
const PLANOS = OPENING_COURSES.flatMap((opening) =>
  opening.plans.map((plano) => ({ opening, plano })),
)

describe('os planos respondem as quatro perguntas', () => {
  it('existe pelo menos um plano em cada abertura', () => {
    for (const opening of OPENING_COURSES) {
      expect(opening.plans.length, `${opening.slug}`).toBeGreaterThan(0)
    }
  })

  it('todo plano diz quando usar, por que funciona, o que preparar e o que o outro tenta', () => {
    /*
      SEM ESTAS QUATRO, o plano volta a ser uma frase de intenção — e intenção
      sem mecanismo é o que faz o aluno reconhecer o NOME do plano e não saber
      executá-lo. O piso de tamanho existe porque uma string vazia satisfaria
      qualquer teste de presença.
    */
    for (const { opening, plano } of PLANOS) {
      const onde = `${opening.slug} / ${plano.id}`
      expect(plano.when.length, `${onde}: quando usar`).toBeGreaterThan(20)
      expect(plano.porQueFunciona?.length ?? 0, `${onde}: por que funciona`).toBeGreaterThan(40)
      expect(plano.preparacao?.length ?? 0, `${onde}: o que preparar`).toBeGreaterThan(40)
      expect(
        plano.oQueOAdversarioTenta?.length ?? 0,
        `${onde}: o que o adversário tenta`,
      ).toBeGreaterThan(40)
    }
  })

  it('a posição que ilustra o plano existe na linha principal', () => {
    for (const { opening, plano } of PLANOS) {
      const posicoes = posicoesDaLinha(opening.rootFen, opening.mainline)
      expect(plano.positionPly ?? 0, `${opening.slug} / ${plano.id}`).toBeLessThan(posicoes.length)
    }
  })
})

describe('a microdecisão de um plano', () => {
  it('o lance autorado é LEGAL na posição que o conteúdo declara', () => {
    /*
      ESTE É O PORTÃO QUE IMPEDE O CASO DO LONDRES DE VOLTAR. Ele não julga se o
      lance é bom — nenhum teste consegue — mas impede o degrau anterior: pedir
      um lance que nem sequer existe na posição, que é o que aconteceria com uma
      microdecisão derivada da seta do plano.
    */
    for (const { opening, plano } of PLANOS) {
      const micro = plano.microdecisao
      if (!micro) continue
      const posicoes = posicoesDaLinha(opening.rootFen, opening.mainline)
      const fen = posicoes[micro.ply]
      const onde = `${opening.slug} / ${plano.id}`
      expect(fen, `${onde}: ply ${micro.ply} fora da linha principal`).toBeTruthy()
      expect(applyMove(fen ?? '', micro.san), `${onde}: ${micro.san} é ilegal`).toBeTruthy()
    }
  })

  it('a pergunta é feita na vez do ALUNO, nunca na do adversário', () => {
    /*
      O DEFEITO QUE ISTO PEGA JÁ ACONTECEU NESTE REPOSITÓRIO, na prática guiada:
      o índice do item valia como índice de ply, e a tela pedia ao aluno os
      lances das duas cores. Aqui ele voltaria como um `ply` autorado com a
      paridade trocada — e a tela pediria um lance a quem não é de jogar.
    */
    for (const { opening, plano } of PLANOS) {
      const micro = plano.microdecisao
      if (!micro) continue
      const posicoes = posicoesDaLinha(opening.rootFen, opening.mainline)
      const vez = (posicoes[micro.ply] ?? '').split(' ')[1]
      expect(vez, `${opening.slug} / ${plano.id}`).toBe(opening.side === 'white' ? 'w' : 'b')
    }
  })

  it('toda microdecisão explica o porquê, e a explicação não é o enunciado', () => {
    for (const { opening, plano } of PLANOS) {
      const micro = plano.microdecisao
      if (!micro) continue
      const onde = `${opening.slug} / ${plano.id}`
      expect(micro.porque.length, `${onde}`).toBeGreaterThan(40)
      if (micro.pergunta) expect(micro.porque, onde).not.toBe(micro.pergunta)
    }
  })

  it('o enunciado nunca entrega o lance', () => {
    // O mesmo defeito que o ADR-0023 fechou na linha principal: um enunciado com
    // gabarito não dá erro nenhum, só deixa de ser pergunta.
    for (const { opening, plano } of PLANOS) {
      const micro = plano.microdecisao
      if (!micro?.pergunta) continue
      expect(
        micro.pergunta.includes(micro.san),
        `${opening.slug} / ${plano.id}: "${micro.pergunta}" entrega ${micro.san}`,
      ).toBe(false)
    }
  })

  it('CADA CURSO tem pelo menos um plano com microdecisão', () => {
    /*
      ESTE PORTÃO MEDIA O CATÁLOGO, E O NOME DELE DIZIA "DO CURSO".

      A asserção era `comMicro.length > 0` sobre todos os planos somados. Dois
      planos em 35 cursos bastavam para deixá-la verde — e era exatamente a
      situação: 103 dos 105 planos sem microdecisão, 33 cursos com a etapa
      "Planos" reduzida a leitura, e nenhum vermelho em lugar nenhum.

      O comentário antigo também citava `§24.3, "quando possível"` para dizer que
      ela é opcional por plano. A citação existe (é do plano VNext), mas a regra
      de microdecisão mora no §52 do plano de expansão, e ele não abre exceção:
      "Cada plano: ... microdecisão no board." A expressão "quando possível" não
      aparece no plano de expansão nenhuma vez.

      O piso aqui é POR CURSO, e não por plano, e isso é um relaxamento
      deliberado do §52: forçar microdecisão onde não há escolha de tabuleiro
      legítima produziria pergunta artificial, que é pior que leitura honesta.
      O relaxamento está registrado no ADR-0032; o que ele não permite é um
      curso inteiro sem nenhuma decisão.

      Ver ADR-0032, item 2: o escopo da asserção é o escopo do contrato.
    */
    const semNenhuma = OPENING_COURSES.map((opening) => ({
      slug: opening.slug,
      planos: opening.plans.length,
      comMicro: opening.plans.filter((plano) => plano.microdecisao).length,
    })).filter((linha) => linha.comMicro === 0)

    expect(semNenhuma.map((l) => `curso "${l.slug}": ${l.planos} planos, 0 microdecisões`)).toEqual(
      [],
    )
  })
})
