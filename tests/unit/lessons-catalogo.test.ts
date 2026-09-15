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
  definirLicao,
  estimarMinutos,
  etapaCobraResposta,
  etapasDaLicao,
  exerciciosDaLicao,
  ultimaEtapaQueCobra,
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

/**
 * TODO texto que o aluno lê.
 *
 * A lista cresceu junto com o esquema V2, e tinha de crescer: o portão de tom
 * que só olha três campos deixa passar a condescendência escrita no `objetivo`,
 * na dica ou no `resumo` — que são exatamente os lugares novos onde ela caberia,
 * porque são os que falam DIRETO com o aluno.
 */
function textosDe(licao: (typeof CATALOGO_DE_LICOES)[number]): string[] {
  return [
    licao.titulo,
    licao.objetivo,
    licao.conceito,
    ...licao.processoMental,
    ...licao.exemploResolvido.raciocinio,
    licao.exemploResolvido.comentario,
    licao.contraste.oQueMudou,
    ...licao.completion.raciocinioJaFeito,
    licao.completion.enunciado,
    licao.completion.explicacao,
    ...licao.guiada.flatMap((exercicio) => [
      exercicio.enunciado,
      exercicio.explicacao,
      ...exercicio.dicas.map((dica) => dica.texto),
    ]),
    ...licao.recuperacao.flatMap((exercicio) => [exercicio.enunciado, exercicio.explicacao]),
    ...licao.resumo,
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

  it('todo id de exercício é único no catálogo inteiro, em TODAS as etapas', () => {
    // Varre `exerciciosDaLicao` e não só a recuperação: o progresso da
    // atividade guarda `completedItemIds` numa lista só, e um id repetido entre
    // a guiada de uma lição e a recuperação de outra faria um marcar o outro
    // como feito — a atividade terminaria sem o aluno ter visto um deles.
    const ids = CATALOGO_DE_LICOES.flatMap(exerciciosDaLicao).map((exercicio) => exercicio.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('toda habilidade citada existe no catálogo de habilidades', () => {
    for (const licao of CATALOGO_DE_LICOES) {
      expect(SKILL_IDS, `${licao.id} cita habilidade fora do catálogo`).toContain(licao.habilidade)
    }
  })

  /**
   * O critério de aceite, afirmado como REGRA e não como um número de etapas.
   *
   * MUDOU DE FORMA NA V2, sem afrouxar. A recuperação não é mais literalmente a
   * última etapa — depois dela vem o `resumo`, que é a lista de verificação para
   * levar para a partida. O que o PEDAGOGY proíbe é a lição terminar RELENDO a
   * explicação, e o que ele exige é que o aluno tente antes de sair. As duas
   * coisas continuam valendo, e agora são medidas onde de fato moram: a última
   * etapa que COBRA é a recuperação. Ver `ultimaEtapaQueCobra`.
   */
  it('a última etapa que cobra resposta é a recuperação sem ajuda', () => {
    expect(ultimaEtapaQueCobra()).toBe('recuperacao')

    // E nada que cobra vem depois dela na ordem real da tela.
    const etapas = etapasDaLicao()
    const indiceDaRecuperacao = etapas.indexOf('recuperacao')
    for (const etapa of etapas.slice(indiceDaRecuperacao + 1)) {
      expect(etapaCobraResposta(etapa), `${etapa} cobra resposta depois da recuperação`).toBe(false)
    }

    for (const licao of CATALOGO_DE_LICOES) {
      expect(licao.recuperacao.length, `${licao.id} não tem exercício final`).toBeGreaterThan(0)
    }
  })

  /** A ordem do guidance fading: apoio só diminui, nunca aumenta. */
  it('a prática guiada vem ANTES da recuperação sem ajuda', () => {
    const etapas = etapasDaLicao()
    expect(etapas.indexOf('guiada')).toBeLessThan(etapas.indexOf('recuperacao'))
    expect(etapas.indexOf('completion')).toBeLessThan(etapas.indexOf('guiada'))
    expect(etapas.indexOf('exemplo')).toBeLessThan(etapas.indexOf('completion'))

    for (const licao of CATALOGO_DE_LICOES) {
      expect(licao.guiada.length, `${licao.id} não tem prática guiada`).toBeGreaterThan(0)
      for (const exercicio of licao.guiada) {
        expect(
          exercicio.dicas.length,
          `${exercicio.id} é "guiado" sem dica nenhuma`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('a recuperação NÃO oferece dica — é o degrau sem apoio', () => {
    for (const licao of CATALOGO_DE_LICOES) {
      for (const exercicio of licao.recuperacao) {
        expect(
          'dicas' in exercicio,
          `${exercicio.id} oferece dica na etapa que existe para não oferecer`,
        ).toBe(false)
      }
    }
  })

  it('toda lição ensina uma pergunta reutilizável e deixa um resumo', () => {
    for (const licao of CATALOGO_DE_LICOES) {
      expect(licao.processoMental.length, `${licao.id} sem processo mental`).toBeGreaterThan(0)
      expect(licao.resumo.length, `${licao.id} sem resumo`).toBeGreaterThan(0)
      expect(licao.objetivo.length, `${licao.id} sem objetivo`).toBeGreaterThan(20)
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
