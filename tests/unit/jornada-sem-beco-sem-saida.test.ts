/**
 * NENHUMA ETAPA PODE COBRAR O QUE A TELA NÃO CONSEGUE OFERECER.
 *
 * O DEFEITO QUE ESTE ARQUIVO FECHA era visível e bloqueante: a etapa
 * "Reconhecer" de TODA jornada de final exigia ao menos um item respondido, e
 * nenhum final tem passo de reconhecimento escrito. O "Continuar" nascia
 * desabilitado, e o aluno ficava preso na segunda etapa sem nada para clicar.
 *
 * Nada errava. Não havia erro no console, nem teste vermelho, nem tela de falha
 * — só uma porta trancada por dentro. É exatamente o tipo de defeito que só a
 * pessoa que usa o app encontra, e é por isso que ele vira portão.
 *
 * A REGRA GERAL que se afirma aqui: para todo final do catálogo, nenhuma etapa
 * cobra uma quantidade de itens que o conteúdo não tem como produzir. Uma regra
 * de conclusão que o conteúdo não consegue satisfazer não é rigor — é uma porta
 * trancada por dentro.
 */

import { describe, expect, it } from 'vitest'
import {
  ENDGAME_DEFINITIONS,
  ENDGAME_LESSON_BY_ID,
  ENDGAME_POSITION_SETS,
} from '@/content/endgames/biblioteca'
import { construirJornadaDeFinal, type ConteudoDoFinal } from '@/domain/endgames/jornada'

/** Monta o conteúdo do mesmo jeito que a página do final monta. */
function conteudoDe(definition: (typeof ENDGAME_DEFINITIONS)[number]): ConteudoDoFinal {
  const positionSet = ENDGAME_POSITION_SETS.find((set) => set.id === definition.drillIds[0])
  const lesson = ENDGAME_LESSON_BY_ID.get(definition.lessonIds[0] ?? '')
  return { posicoes: positionSet?.positions ?? [], passosDaLicao: lesson?.steps }
}

describe('toda etapa de final é alcançável', () => {
  for (const definition of ENDGAME_DEFINITIONS) {
    it(`${definition.slug}: nenhuma etapa cobra item que o conteúdo não tem`, () => {
      const etapas = construirJornadaDeFinal(definition, conteudoDe(definition))
      expect(etapas.length).toBeGreaterThan(0)

      for (const etapa of etapas) {
        if (etapa.regra.tipo === 'leitura') continue

        /*
          UMA ETAPA QUE COBRA PRECISA COBRAR ALGO MAIOR QUE ZERO.

          As duas regras que cobram contam coisas diferentes: `itens` conta
          respostas e `cobertura` conta alvos demonstrados. O que se afirma é o
          mesmo nas duas — a etapa não pode pedir zero. Pedir zero passaria por
          acidente (zero de zero é cumprido) e descreveria a etapa errado para
          todo mundo que lesse a jornada.
        */
        const exigido =
          etapa.regra.tipo === 'itens' ? etapa.regra.total : etapa.regra.alvosExigidos.length
        expect(
          exigido,
          `${definition.slug} / ${etapa.id} (${etapa.regra.tipo}) cobra ${exigido}`,
        ).toBeGreaterThan(0)
      }
    })
  }
})

describe('a etapa de reconhecimento acompanha o conteúdo', () => {
  it('sem pergunta escrita, ela é etapa de LEITURA', () => {
    /*
      É o caso real de hoje: nenhum final do catálogo tem passo de
      `recognition` ou `decision`. Enquanto for assim, a etapa é de leitura — e
      volta a cobrar sozinha no dia em que alguém escrever a primeira pergunta.
    */
    for (const definition of ENDGAME_DEFINITIONS) {
      const conteudo = conteudoDe(definition)
      const temPergunta = (conteudo.passosDaLicao ?? []).some(
        (passo) => passo.type === 'recognition' || passo.type === 'decision',
      )
      const reconhecer = construirJornadaDeFinal(definition, conteudo).find(
        (etapa) => etapa.id === 'reconhecer',
      )

      expect(reconhecer, `${definition.slug} sem etapa de reconhecimento`).toBeTruthy()
      expect(reconhecer?.regra.tipo, definition.slug).toBe(temPergunta ? 'itens' : 'leitura')
    }
  })
})
