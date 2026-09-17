/**
 * O PORTÃO CONTRA O BECO SEM SAÍDA.
 *
 * O defeito que ele existe para matar já aconteceu, nos vinte finais do
 * catálogo ao mesmo tempo: `descritores()` declarava
 * `regra: { tipo: 'itens', total: 1 }` para `reconhecer`, `variacoes` e
 * `dois-lados`, e a tela dessas três etapas desenhava prosa e tabuleiro
 * estático. `registrarItem` nunca era chamado, `etapaCumprida` devolvia `false`
 * para sempre, o "Continuar" nascia desabilitado e `concluirEtapa` recusava
 * avançar por dentro. O aluno ficava preso na etapa 2 de 10 de QUALQUER final.
 *
 * POR QUE NENHUM PORTÃO PEGOU: não havia exceção, log, tela branca nem tipo
 * errado. Uma porta trancada por dentro tem exatamente a aparência de uma porta.
 * E o e2e que percorria a jornada fazia `if (await continuar.isDisabled())
 * break` — ele DESISTIA no beco e ficava verde. Um `break` num portão é um
 * portão desligado.
 *
 * O QUE ESTE ARQUIVO MEDE: que, para todo conteúdo REAL do catálogo, o que cada
 * etapa COBRA é o que a tela tem como OFERECER. Ele varre a fonte
 * (`ENDGAME_DEFINITIONS`, `OPENING_COURSES`) e monta o conteúdo pelo MESMO
 * caminho da página (`conteudoDoFinal`) — uma lista paralela nunca acusaria o
 * final que nunca entrou nela, e um segundo jeito de montar o conteúdo faria o
 * portão medir uma tela que não existe.
 *
 * O QUE ELE NÃO PROVA, e é parte do portão dizer:
 *
 * - não prova que o exercício ENSINA. Ele conta itens; se o item é bom é
 *   julgamento pedagógico, e nenhuma asserção substitui isso;
 * - não prova que o `objective` declarado numa posição é VERDADEIRO nela. Só a
 *   tablebase responde isso, e quem pergunta é
 *   `tests/contrato/biblioteca-vs-tablebase.test.ts`;
 * - não prova que o TREINO FINAL consegue terminar. Ele confere que a cobertura
 *   exige alvos; quem os fecha é o juiz, com portão em
 *   `tests/unit/endgames-juiz-de-final.test.ts`;
 * - não roda React. Que a lista contada seja a lista desenhada é afirmado por
 *   `endgames-jornada-tela.test.tsx`; aqui só as duas metades do domínio se
 *   olham.
 */

import { describe, expect, it } from 'vitest'
import { ENDGAME_DEFINITIONS } from '@/content/endgames/biblioteca'
import { OPENING_COURSES } from '@/content/openings/course'
import {
  construirJornadaDeFinal,
  itensDaEtapaDeFinal,
  type EtapaDeFinal,
} from '@/domain/endgames/jornada'
import { construirJornadaDeAbertura } from '@/domain/openings/jornada'
import { itensDaPraticaGuiadaDeAbertura } from '@/domain/openings/itens-da-etapa'
import { problemasDeExigencia, type EtapaComRegra } from '@/domain/jornada'
import { conteudoDoFinal } from '@/lib/training/etapas-do-conteudo'

/**
 * A DÍVIDA DECLARADA: finais cuja etapa `reconhecer` degrada para leitura
 * porque a lição não tem pergunta escrita.
 *
 * VAZIA HOJE, e vazia é uma afirmação e não um esquecimento: os vinte finais
 * recebem uma pergunta de reconhecimento gerada em `ENDGAME_LESSONS`. A lista
 * existe porque essa geração pode deixar de valer para um final autorado à mão,
 * e nesse dia a degradação tem de ser ESCRITA aqui — não descoberta por um aluno
 * que achou a etapa estranhamente curta.
 *
 * MORDE DOS DOIS LADOS: id que entra aqui e volta a ter pergunta reprova e tem
 * de sair. Lista de dívida que só cresce vira decoração.
 */
const RECONHECER_SEM_PERGUNTA: readonly string[] = []

/** Os dois domínios, na forma que o portão sabe varrer. */
interface ConteudoVarrido {
  rotulo: string
  etapas: readonly EtapaComRegra[]
  itens: (stageId: string) => readonly { id: string }[]
}

function finaisDoCatalogo(): ConteudoVarrido[] {
  return ENDGAME_DEFINITIONS.map((definicao) => {
    const conteudo = conteudoDoFinal(definicao.slug)
    if (!conteudo) throw new Error(`final ${definicao.slug} sem conteúdo montável`)
    return {
      rotulo: `final ${definicao.id}`,
      // `construirJornadaDeFinal` LANÇA para conteúdo que não vira jornada. Que
      // ele não lance para nenhum final do catálogo já é meia asserção — e é por
      // isso que a chamada fica aqui, exposta, e não dentro de um `try`.
      etapas: construirJornadaDeFinal(definicao, conteudo),
      itens: (stageId) => itensDaEtapaDeFinal(stageId as EtapaDeFinal, conteudo),
    }
  })
}

function aberturasDoCatalogo(): ConteudoVarrido[] {
  return OPENING_COURSES.map((abertura) => ({
    rotulo: `abertura ${abertura.id}`,
    etapas: construirJornadaDeAbertura(abertura),
    itens: (stageId) =>
      stageId === 'pratica-guiada' ? itensDaPraticaGuiadaDeAbertura(abertura) : [],
  }))
}

describe('a varredura encontra conteúdo', () => {
  /*
    REGRA 3 DOS PORTÕES: tabela vazia não é aprovação. Sem este caso, um dia em
    que `ENDGAME_DEFINITIONS` viesse vazio por um erro de importação deixaria
    todos os outros testes deste arquivo verdes sem ter conferido nada.
  */
  it('varre os vinte e poucos finais e as aberturas do catálogo', () => {
    expect(finaisDoCatalogo().length).toBeGreaterThanOrEqual(15)
    expect(aberturasDoCatalogo().length).toBeGreaterThanOrEqual(1)
  })
})

describe('nenhuma etapa cobra o que a tela não oferece', () => {
  it.each(finaisDoCatalogo().map((c) => [c.rotulo, c] as const))('%s', (_rotulo, conteudo) => {
    expect(problemasDeExigencia(conteudo.etapas, conteudo.itens)).toEqual([])
  })

  it.each(aberturasDoCatalogo().map((c) => [c.rotulo, c] as const))('%s', (_rotulo, conteudo) => {
    expect(problemasDeExigencia(conteudo.etapas, conteudo.itens)).toEqual([])
  })
})

describe('a dívida de conteúdo é declarada, e não descoberta pelo aluno', () => {
  it('só os finais listados degradam `reconhecer` para leitura', () => {
    const degradados = ENDGAME_DEFINITIONS.filter((definicao) => {
      const conteudo = conteudoDoFinal(definicao.slug)
      return conteudo !== null && itensDaEtapaDeFinal('reconhecer', conteudo).length === 0
    }).map((definicao) => definicao.id)

    expect([...degradados].sort()).toEqual([...RECONHECER_SEM_PERGUNTA].sort())
  })

  it('a lista de dívida não guarda id que já tem pergunta', () => {
    // O outro lado da mordida. Sem ele, a lista viraria um depósito: bastaria
    // escrever a pergunta e esquecer de tirar o id, e o portão continuaria
    // aprovando uma dívida que não existe mais.
    for (const id of RECONHECER_SEM_PERGUNTA) {
      const definicao = ENDGAME_DEFINITIONS.find((candidata) => candidata.id === id)
      expect(definicao, `${id} não existe mais no catálogo`).toBeDefined()
      const conteudo = definicao ? conteudoDoFinal(definicao.slug) : null
      expect(
        conteudo ? itensDaEtapaDeFinal('reconhecer', conteudo).length : 0,
        `${id} já tem pergunta de reconhecimento: tire-o da lista de dívida`,
      ).toBe(0)
    }
  })
})

describe('o detector discrimina', () => {
  /*
    O CANÁRIO. Sem ele, um `problemasDeExigencia` que devolvesse `[]` sempre
    deixaria este arquivo inteiro verde — que é o falso verde na camada da
    própria ferramenta. Cada caso aqui tem de REPROVAR.
  */
  it('acusa a etapa que cobra mais do que a tela oferece', () => {
    const problemas = problemasDeExigencia(
      [{ id: 'reconhecer', regra: { tipo: 'itens', total: 3 } }],
      () => [{ id: 'unico' }],
    )
    expect(problemas).toHaveLength(1)
    expect(problemas[0]).toContain('reconhecer')
    expect(problemas[0]).toContain('beco sem saída')
  })

  it('acusa ids de item repetidos, que fechariam a etapa em menos do que ela promete', () => {
    const problemas = problemasDeExigencia(
      [{ id: 'variacoes', regra: { tipo: 'itens', total: 2 } }],
      () => [{ id: 'mesmo' }, { id: 'mesmo' }],
    )
    expect(problemas.join(' ')).toContain('id de item repetido')
  })

  it('acusa treino de cobertura sem alvo nenhum', () => {
    const problemas = problemasDeExigencia(
      [{ id: 'treino-final', regra: { tipo: 'cobertura', alvosExigidos: [] } }],
      () => [],
    )
    expect(problemas.join(' ')).toContain('não exige alvo nenhum')
  })

  it('acusa a etapa de leitura que oferece exercício — o lado silencioso', () => {
    // O inverso do beco: o aluno responde algo que não conta para nada, e o
    // "Continuar" funciona, então ninguém nota nunca.
    const problemas = problemasDeExigencia(
      [{ id: 'principio', regra: { tipo: 'leitura' } }],
      () => [{ id: 'orfao' }],
    )
    expect(problemas.join(' ')).toContain('responder não conta para nada')
  })

  it('aprova a etapa em que regra e itens batem', () => {
    // A quinta pergunta dos portões: o detector também precisa saber ficar
    // calado, senão ele reprova o código certo.
    expect(
      problemasDeExigencia(
        [
          { id: 'reconhecer', regra: { tipo: 'itens', total: 2 } },
          { id: 'principio', regra: { tipo: 'leitura' } },
        ],
        (stageId) => (stageId === 'reconhecer' ? [{ id: 'a' }, { id: 'b' }] : []),
      ),
    ).toEqual([])
  })
})

describe('a regra nasce da contagem, e não de um piso', () => {
  it('etapa sem item nenhum é LEITURA, e nunca `itens` com total inalcançável', () => {
    /*
      O CASO EXATO QUE O CONSERTO EXISTE PARA COBRIR: um final sem pergunta de
      reconhecimento escrita. Antes, `Math.max(respondiveis, 1)` cobrava um item
      que não existia. Agora a etapa vira leitura — e continua avançável.
    */
    const semLicao = {
      posicoes: [
        {
          id: 'a',
          fen: '8/8/8/3k4/8/8/3KP3/8 w - - 0 1',
          sideToTrain: 'white' as const,
          objective: 'win' as const,
          conceptIds: ['x'],
          validationSource: 'curated' as const,
          difficulty: 1,
        },
        {
          id: 'b',
          fen: '8/8/8/4k3/8/8/4KP2/8 w - - 0 1',
          sideToTrain: 'white' as const,
          objective: 'win' as const,
          conceptIds: ['x'],
          validationSource: 'curated' as const,
          difficulty: 1,
        },
      ],
    }

    expect(itensDaEtapaDeFinal('reconhecer', semLicao)).toEqual([])

    const etapas = construirJornadaDeFinal(
      {
        id: 'x',
        slug: 'x',
        name: 'X',
        category: 'pawn',
        description: 'd',
        training: {
          fen: semLicao.posicoes[0]!.fen,
          sideToTrain: 'white',
          objective: 'win',
          expectedResult: 'win',
        },
        previewFen: semLicao.posicoes[0]!.fen,
        difficulty: 1,
        prerequisiteIds: [],
        lessonIds: [],
        drillIds: ['x-set'],
        tags: [],
        level: 'essential',
        version: 1,
      },
      semLicao,
    )

    expect(etapas.find((etapa) => etapa.id === 'reconhecer')?.regra).toEqual({ tipo: 'leitura' })
    // E as outras duas continuam interativas, porque ELAS têm de onde tirar item.
    expect(etapas.find((etapa) => etapa.id === 'variacoes')?.regra).toEqual({
      tipo: 'itens',
      total: 1,
    })
    expect(etapas.find((etapa) => etapa.id === 'dois-lados')?.regra).toEqual({
      tipo: 'itens',
      total: 1,
    })
  })
})
