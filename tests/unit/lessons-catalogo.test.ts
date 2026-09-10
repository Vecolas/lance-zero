/**
 * Portão do catálogo de lições.
 *
 * Varre a FONTE (`CATALOGO_DE_LICOES`), nunca uma lista à mão.
 *
 * O critério de aceite da issue #11 é "toda lição termina em recuperação
 * ativa". O esquema já IMPEDE construir uma lição sem recuperação — este portão
 * cobre o que a forma não alcança: que a etapa final continue sendo a de
 * recuperação, que a posição do exercício seja real, que a chave de correção
 * esteja certa dos dois lados, e que o texto não escorregue para o tom que o
 * produto proíbe.
 */

import { describe, expect, it } from 'vitest'
import { CATALOGO_DE_LICOES } from '@/content/lessons'
import { opcoesDe } from '@/domain/diagnostic'
import {
  ETAPAS_DA_LICAO,
  definirLicao,
  estimarMinutos,
  etapasDaLicao,
  verificarLicao,
  type EntradaDeLicao,
} from '@/domain/lessons'
import { SKILL_IDS } from '@/domain/types'

/**
 * Palavras que o tom do produto não aceita.
 *
 * A regra do CLAUDE.md e do PEDAGOGY: analítico e calmo, sem gamificação de
 * cassino e nunca patronizante. A lista é de PRODUTO, não de estilo pessoal, e
 * mora aqui junto do portão que a cobra.
 */
const TOM_PROIBIDO = [
  'parabéns',
  'parabens',
  'mandou bem',
  'arrasou',
  'incrível',
  'sequência de dias',
  'ofensiva',
  'streak',
  'moedas',
  'pontos de energia',
  'nível desbloqueado',
  'fácil, né',
  'é só',
  'basta prestar atenção',
]

/** Emoji e pictogramas: nenhum, em nenhuma lição. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

function textosDe(licao: (typeof CATALOGO_DE_LICOES)[number]): string[] {
  return [
    licao.titulo,
    licao.conceito,
    licao.exemploResolvido.comentario,
    ...licao.recuperacao.flatMap((exercicio) => [exercicio.enunciado, exercicio.explicacao]),
  ]
}

describe('catálogo de lições', () => {
  // Regra 3 dos portões: catálogo vazio não é aprovação.
  it('o catálogo tem lições para checar', () => {
    expect(CATALOGO_DE_LICOES.length).toBeGreaterThan(0)
  })

  it('todo id de lição é único', () => {
    const ids = CATALOGO_DE_LICOES.map((licao) => licao.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todo id de exercício é único no catálogo inteiro', () => {
    const ids = CATALOGO_DE_LICOES.flatMap((licao) =>
      licao.recuperacao.map((exercicio) => exercicio.id),
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('toda habilidade citada existe no catálogo de habilidades', () => {
    for (const licao of CATALOGO_DE_LICOES) {
      expect(SKILL_IDS, `${licao.id} cita habilidade fora do catálogo`).toContain(licao.habilidade)
    }
  })

  /** O critério de aceite, afirmado como REGRA e não como um número de etapas. */
  it('a última etapa de toda lição é a recuperação ativa', () => {
    expect(ETAPAS_DA_LICAO[ETAPAS_DA_LICAO.length - 1]).toBe('recuperacao')
    for (const licao of CATALOGO_DE_LICOES) {
      const etapas = etapasDaLicao()
      expect(etapas[etapas.length - 1], `${licao.id} não termina em recuperação`).toBe(
        'recuperacao',
      )
      expect(licao.recuperacao.length, `${licao.id} não tem exercício`).toBeGreaterThan(0)
    }
  })

  it('o esquema recusa uma lição sem recuperação', () => {
    const semRecuperacao = {
      ...CATALOGO_DE_LICOES[0],
      id: 'sem-recuperacao',
      // A trava de tipo é o primeiro lado; este `as` só existe para provar que
      // o segundo lado — a checagem em tempo de execução — também morde.
      recuperacao: [],
    } as unknown as EntradaDeLicao
    expect(() => definirLicao(semRecuperacao)).toThrow(/recuperação ativa/)
  })

  it('o enunciado da recuperação não entrega o tema antes da resposta', () => {
    for (const licao of CATALOGO_DE_LICOES) {
      const rotulo = licao.titulo.toLocaleLowerCase('pt-BR')
      for (const exercicio of licao.recuperacao) {
        const enunciado = exercicio.enunciado.toLocaleLowerCase('pt-BR')
        expect(enunciado, `${exercicio.id} repete o título da lição no enunciado`).not.toContain(
          rotulo,
        )
      }
    }
  })

  it('a tela recebe todas as opções de cada exercício, sem repetição', () => {
    for (const licao of CATALOGO_DE_LICOES) {
      for (const exercicio of licao.recuperacao) {
        const opcoes = opcoesDe(exercicio)
        expect(opcoes.length, `${exercicio.id} perdeu opções`).toBe(
          exercicio.lancesAceitos.length + exercicio.alternativas.length,
        )
        expect(new Set(opcoes).size, `${exercicio.id} repete opção`).toBe(opcoes.length)
      }
    }
  })

  it('os minutos são derivados, e crescem com o número de exercícios', () => {
    for (const licao of CATALOGO_DE_LICOES) {
      expect(estimarMinutos(licao)).toBeGreaterThan(0)
    }
    const uma = CATALOGO_DE_LICOES[0]
    const duas = definirLicao({
      ...uma,
      id: 'duas-recuperacoes',
      recuperacao: [uma.recuperacao[0], { ...uma.recuperacao[0], id: 'copia' }],
    })
    expect(estimarMinutos(duas)).toBeGreaterThan(estimarMinutos(uma))
  })

  it('nenhum texto usa tom de cassino, emoji ou condescendência', () => {
    for (const licao of CATALOGO_DE_LICOES) {
      for (const texto of textosDe(licao)) {
        const minusculo = texto.toLocaleLowerCase('pt-BR')
        for (const proibido of TOM_PROIBIDO) {
          expect(minusculo, `${licao.id} usa "${proibido}"`).not.toContain(proibido)
        }
        expect(EMOJI.test(texto), `${licao.id} usa emoji`).toBe(false)
      }
    }
  })

  it('toda lição é conferível: exemplo resolvido e chave de correção', { timeout: 120_000 }, () => {
    const falhas = CATALOGO_DE_LICOES.flatMap(verificarLicao)
    expect(falhas.map((f) => `${f.itemId}: ${f.problema}`)).toEqual([])
  })
})
