/**
 * O PORTÃO DA REGRA CENTRAL: "Aprender" abre o conteúdo exato.
 *
 * A DÍVIDA QUE ESTE ARQUIVO FECHA: o card do Roadmap decidia o destino em uma
 * linha, e a última alternativa dela era `'/lessons'`. Vinte e nove nós ofereciam
 * "Aprender" e despejavam o aluno na biblioteca inteira — um caminho que parece
 * funcionar, porque abre uma página de verdade. O Roadmap SABE o que o aluno
 * quer aprender; responder com o catálogo é dizer "procure você mesmo".
 *
 * O QUE ESTES TESTES PROTEGEM, e por que cada um existe:
 *
 * 1. TODO nó está declarado. Não é "todo nó tem conteúdo" — vinte e nove ainda
 *    não têm, e dizem isso com `null`. É "ninguém criou um nó sem decidir", que é
 *    a diferença entre uma lacuna conhecida e um esquecimento.
 * 2. Nenhuma tela monta rota de aprendizado à mão. Foi assim que o `/lessons`
 *    genérico nasceu: cada card resolvia sozinho, e o que resolvia mal não
 *    aparecia em lugar nenhum.
 * 3. Os alvos apontam para conteúdo que existe. Um id errado produziria um
 *    botão "Aprender" que leva a 404 — pior que não ter botão.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ROADMAP_DEFINITION } from '@/domain/roadmap'
import {
  JORNADAS_DE_LICOES,
  LEARNING_OBJECTS,
  learningTargetOf,
  nosSemConteudo,
  nosSemDeclaracao,
  temConteudo,
} from '@/domain/roadmap/learning-objects'
import {
  completionRuleFor,
  MissingLearningTargetError,
  resolveLearningTarget,
  UnknownLearningContentError,
  type LearningTarget,
  type ResolucaoDeConteudo,
} from '@/domain/roadmap/learning-target'
import { licaoDeEntrada, progressoDaJornadaDeLicoes } from '@/domain/roadmap/lesson-journey'
import { CATALOGO_DE_LICOES } from '@/content/lessons'
import { ENDGAME_DEFINITIONS } from '@/content/endgames/biblioteca'
import { OPENING_COURSES } from '@/content/openings/course'
import { rotaDeAprendizado } from '@/lib/training/rota-de-aprendizado'

const CATALOGO_FALSO: ResolucaoDeConteudo = {
  slugDaAbertura: (id) => (id === 'italiana' ? 'italiana' : null),
  slugDoFinal: (id) => (id === 'opposition' ? 'oposicao' : null),
}

/* ------------------------------------------------------------------ TESTE H */

describe('TESTE H — nó sem LearningTarget quebra a validação', () => {
  it('todo nó do Roadmap está DECLARADO no registro', () => {
    expect(
      nosSemDeclaracao(),
      'nós criados sem decidir o destino pedagógico — declare-os em LEARNING_OBJECTS, com alvo ou com `null`',
    ).toEqual([])
  })

  it('pedir o alvo de um nó desconhecido LANÇA, em vez de devolver nada', () => {
    expect(() => learningTargetOf({ id: 'nao.existe' })).toThrow(MissingLearningTargetError)
  })

  /**
   * O número de nós sem conteúdo é MEDIDO, e só pode cair.
   *
   * Sem um teto, a lacuna cresce sem ninguém notar: bastaria adicionar nós novos
   * com `null` para o Roadmap voltar a ser um mapa de portas fechadas. O número
   * está escrito aqui para que aumentá-lo exija uma decisão consciente.
   */
  it('a lacuna de conteúdo é conhecida e não cresce sozinha', () => {
    const semConteudo = nosSemConteudo()
    expect(
      semConteudo.length,
      `nós sem conteúdo subiu para ${semConteudo.length}. Se foi de propósito, ajuste o teto — e diga por quê.`,
    ).toBeLessThanOrEqual(29)
  })

  it('alvo que aponta para conteúdo inexistente LANÇA', () => {
    expect(() =>
      resolveLearningTarget({ type: 'opening-journey', openingId: 'nao-existe' }, CATALOGO_FALSO),
    ).toThrow(UnknownLearningContentError)
  })
})

/* ------------------------------------------------- A REGRA ABSOLUTA (§1) --- */

describe('a regra absoluta: nunca a biblioteca genérica', () => {
  it('nenhum nó com conteúdo resolve para a listagem de lições', () => {
    const genericos = ROADMAP_DEFINITION.nodes
      .filter(temConteudo)
      .map((node) => ({ id: node.id, rota: rotaDeAprendizado(learningTargetOf(node)!) }))
      .filter(({ rota }) => rota === '/lessons' || rota === '/licoes')
      .map(({ id }) => id)

    expect(genericos, 'nós resolvendo para a biblioteca genérica').toEqual([])
  })

  /**
   * NENHUMA TELA MONTA ROTA DE APRENDIZADO À MÃO.
   *
   * Este é o teste que impede a reincidência. O defeito não foi uma linha errada
   * — foi a decisão morar na tela, onde ninguém a procura. Se ela voltar para lá,
   * isto reprova antes de chegar ao aluno.
   */
  it('a tela do Roadmap não escreve `/lessons` nem `/licoes`', () => {
    const fonte = readFileSync('src/components/roadmap/RoadmapView.tsx', 'utf8')
    const codigo = fonte
      .split('\n')
      .filter((linha) => !/^\s*(\/\/|\*|\/\*)/.test(linha))
      .join('\n')

    expect(codigo, 'a rota voltou a ser montada na tela').not.toMatch(/['"`]\/(lessons|licoes)/)
    expect(codigo, 'a tela precisa usar o roteador único').toContain('rotaDeAprendizado')
  })
})

/* ------------------------------------------------------------ TESTES A e B */

describe('TESTE A — nó simples abre a lição específica', () => {
  it('"Peças indefesas" abre a lição da peça pendurada, e não a biblioteca', () => {
    const node = ROADMAP_DEFINITION.nodes.find((n) => n.id === 'fundamentos.loose')!
    const rota = rotaDeAprendizado(learningTargetOf(node)!)
    expect(rota).toBe('/lessons/peca-pendurada')
  })

  it('a habilidade também abre a lição dela', () => {
    const node = ROADMAP_DEFINITION.nodes.find((n) => n.id === 'skill.tactics.fork')!
    expect(rotaDeAprendizado(learningTargetOf(node)!)).toBe('/lessons/garfo')
  })
})

describe('TESTE B — nó composto abre a PRIMEIRA lição da jornada', () => {
  it('"Geração de candidatos" abre a jornada, não uma lista', () => {
    const node = ROADMAP_DEFINITION.nodes.find((n) => n.id === 'process.candidates')!
    const target = learningTargetOf(node)!
    expect(target.type).toBe('lesson-journey')
    expect(rotaDeAprendizado(target)).toBe('/lessons/jornada/candidatos')
  })

  it('a porta de entrada é a primeira lição da sequência', () => {
    const target = JORNADAS_DE_LICOES[0]
    expect(licaoDeEntrada(target, new Set())).toBe(target.entryLessonId)
    expect(target.lessonIds[0]).toBe(target.entryLessonId)
  })
})

/* ------------------------------------------------------------ TESTES C e D */

describe('TESTE C — concluir uma lição leva à próxima sozinho', () => {
  const jornada = JORNADAS_DE_LICOES[0]

  it('a lição atual anda quando a anterior é vencida', () => {
    const [primeira, segunda, terceira] = jornada.lessonIds
    expect(progressoDaJornadaDeLicoes(jornada, new Set()).licaoAtual).toBe(primeira)
    expect(progressoDaJornadaDeLicoes(jornada, new Set([primeira])).licaoAtual).toBe(segunda)
    expect(progressoDaJornadaDeLicoes(jornada, new Set([primeira, segunda])).licaoAtual).toBe(
      terceira,
    )
  })

  it('com todas vencidas, a jornada acaba em vez de voltar ao começo', () => {
    const tudo = new Set(jornada.lessonIds)
    const progresso = progressoDaJornadaDeLicoes(jornada, tudo)
    expect(progresso.licaoAtual).toBeNull()
    expect(progresso.concluida).toBe(true)
    expect(progresso.concluidas).toBe(jornada.lessonIds.length)
  })

  /**
   * A lição atual é a PRIMEIRA não concluída, e não "a seguinte à última".
   * Quem concluiu a terceira antes da segunda volta e recebe a segunda — que é
   * a que falta. A outra regra daria a jornada por encerrada com um buraco.
   */
  it('um buraco no meio não é tratado como jornada vencida', () => {
    const [primeira, , terceira] = jornada.lessonIds
    const progresso = progressoDaJornadaDeLicoes(jornada, new Set([primeira, terceira]))
    expect(progresso.concluida).toBe(false)
    expect(progresso.licaoAtual).toBe(jornada.lessonIds[1])
  })
})

describe('TESTE D — "Continuar" retoma o checkpoint, e não o começo', () => {
  const jornada = JORNADAS_DE_LICOES[0]

  it('sair na lição 2 e voltar abre a lição 2', () => {
    const concluidas = new Set([jornada.lessonIds[0]])
    expect(licaoDeEntrada(jornada, concluidas)).toBe(jornada.lessonIds[1])
  })

  it('o deep link carrega a etapa exata', () => {
    const rota = rotaDeAprendizado(jornada, { modo: 'continuar', etapa: jornada.lessonIds[1] })
    expect(rota).toBe(`/lessons/jornada/candidatos?modo=continuar&etapa=${jornada.lessonIds[1]}`)
  })

  /**
   * Uma etapa de FORA da jornada é ignorada. Um id inventado na URL abriria uma
   * lição que o nó não promete — ou lição nenhuma.
   */
  it('etapa que não pertence à jornada não é obedecida', () => {
    expect(licaoDeEntrada(jornada, new Set(), 'cravada')).toBe(jornada.entryLessonId)
  })
})

/* ------------------------------------------------------------ TESTES E e F */

describe('TESTE E — abertura abre a OpeningStudyJourney', () => {
  it('"Abertura Italiana" abre a jornada da Italiana', () => {
    const node = ROADMAP_DEFINITION.nodes.find((n) => n.id === 'opening.italian')!
    const target = learningTargetOf(node)!
    expect(target.type).toBe('opening-journey')
    expect(rotaDeAprendizado(target)).toBe('/aberturas/italiana')
  })

  it('TODA abertura do Roadmap abre a jornada dela, e nenhuma cai em lição', () => {
    const aberturas = ROADMAP_DEFINITION.nodes.filter(
      (n) => n.contentType === 'opening' && n.skillId === undefined,
    )
    expect(aberturas.length).toBe(5)
    for (const node of aberturas) {
      expect(learningTargetOf(node)?.type, node.id).toBe('opening-journey')
      expect(rotaDeAprendizado(learningTargetOf(node)!), node.id).toMatch(/^\/aberturas\//)
    }
  })
})

describe('TESTE F — final abre a EndgameStudyJourney', () => {
  it('"Oposição" abre a jornada de final da oposição', () => {
    const node = ROADMAP_DEFINITION.nodes.find(
      (n) => n.id === 'skill.endgame.king-pawn-opposition',
    )!
    const target = learningTargetOf(node)!
    expect(target.type).toBe('endgame-journey')
    expect(rotaDeAprendizado(target)).toBe('/finais/oposicao')
  })

  it('TODO nó de finais abre uma jornada de final', () => {
    const finais = ROADMAP_DEFINITION.nodes.filter((n) => n.area === 'finais')
    expect(finais.length).toBeGreaterThan(0)
    for (const node of finais) {
      expect(learningTargetOf(node)?.type, node.id).toBe('endgame-journey')
    }
  })
})

/* ------------------------------------------------------------------ TESTE G */

describe('TESTE G — "Reaprender" abre o conteúdo exato, em modo de reaprendizado', () => {
  it('o modo viaja na URL, e o destino continua sendo o conteúdo', () => {
    const node = ROADMAP_DEFINITION.nodes.find((n) => n.id === 'opening.caro-kann')!
    const rota = rotaDeAprendizado(learningTargetOf(node)!, { modo: 'reaprender' })
    expect(rota).toBe('/aberturas/caro-kann?modo=reaprender')
  })

  it('reaprender com checkpoint leva os dois', () => {
    const node = ROADMAP_DEFINITION.nodes.find((n) => n.id === 'opening.caro-kann')!
    const rota = rotaDeAprendizado(learningTargetOf(node)!, {
      modo: 'reaprender',
      etapa: 'linha-principal',
    })
    expect(rota).toBe('/aberturas/caro-kann?modo=reaprender&etapa=linha-principal')
  })

  /** `aprender` é o padrão e não suja a URL: um parâmetro que nunca muda nada. */
  it('o modo padrão não aparece no endereço', () => {
    expect(rotaDeAprendizado({ type: 'lesson', lessonId: 'garfo' }, { modo: 'aprender' })).toBe(
      '/lessons/garfo',
    )
  })
})

/* ---------------------------------------------- IDs VÁLIDOS E CONCLUSÃO --- */

describe('os alvos apontam para conteúdo que existe (§31)', () => {
  const idsDeLicao = new Set(CATALOGO_DE_LICOES.map((licao) => licao.id))
  const idsDeAbertura = new Set(OPENING_COURSES.map((curso) => curso.id))
  const idsDeFinal = new Set(ENDGAME_DEFINITIONS.map((final) => final.id))

  it('toda lição referenciada existe no catálogo', () => {
    const quebrados: string[] = []
    for (const [nodeId, target] of Object.entries(LEARNING_OBJECTS)) {
      if (target?.type === 'lesson' && !idsDeLicao.has(target.lessonId))
        quebrados.push(`${nodeId} -> ${target.lessonId}`)
      if (target?.type === 'lesson-journey')
        for (const lessonId of target.lessonIds)
          if (!idsDeLicao.has(lessonId)) quebrados.push(`${nodeId} -> ${lessonId}`)
    }
    expect(quebrados).toEqual([])
  })

  it('toda abertura e todo final referenciados existem', () => {
    const quebrados: string[] = []
    for (const [nodeId, target] of Object.entries(LEARNING_OBJECTS)) {
      if (target?.type === 'opening-journey' && !idsDeAbertura.has(target.openingId))
        quebrados.push(`${nodeId} -> abertura ${target.openingId}`)
      if (target?.type === 'endgame-journey' && !idsDeFinal.has(target.endgameId))
        quebrados.push(`${nodeId} -> final ${target.endgameId}`)
    }
    expect(quebrados).toEqual([])
  })

  it('a porta de entrada de uma jornada pertence à jornada', () => {
    for (const jornada of JORNADAS_DE_LICOES) {
      expect(jornada.lessonIds, jornada.journeyId).toContain(jornada.entryLessonId)
    }
  })
})

describe('a conclusão do nó nasce do alvo (§22–23)', () => {
  it('lição única conclui com a lição', () => {
    expect(completionRuleFor({ type: 'lesson', lessonId: 'garfo' })).toEqual({
      type: 'single-lesson',
      lessonId: 'garfo',
    })
  })

  it('jornada de lições exige TODAS', () => {
    const jornada = JORNADAS_DE_LICOES[0]
    expect(completionRuleFor(jornada)).toEqual({
      type: 'all-lessons',
      lessonIds: jornada.lessonIds,
    })
  })

  it('abertura e final concluem pela jornada de estudo, e não por uma lição', () => {
    expect(completionRuleFor({ type: 'opening-journey', openingId: 'italiana' })).toEqual({
      type: 'journey',
      journeyId: 'abertura:italiana',
    })
    expect(completionRuleFor({ type: 'endgame-journey', endgameId: 'opposition' })).toEqual({
      type: 'journey',
      journeyId: 'final:opposition',
    })
  })

  /**
   * O id da jornada de conclusão é o MESMO que a store de jornadas usa. Se os
   * dois divergirem, o nó nunca vira ✓ por mais que o aluno estude — e nada
   * apontaria a causa.
   */
  it('o id da jornada bate com o que a ponte usa', () => {
    const node = ROADMAP_DEFINITION.nodes.find((n) => n.id === 'opening.italian')!
    const regra = completionRuleFor(learningTargetOf(node)!)
    expect(regra).toEqual({ type: 'journey', journeyId: 'abertura:italiana' })
  })
})

describe('a resolução é pura e não conhece catálogo', () => {
  it('resolve com uma tabela de mentira', () => {
    const alvos: LearningTarget[] = [
      { type: 'lesson', lessonId: 'x' },
      { type: 'lesson-journey', journeyId: 'j', lessonIds: ['x'], entryLessonId: 'x' },
      { type: 'opening-journey', openingId: 'italiana' },
      { type: 'endgame-journey', endgameId: 'opposition' },
    ]
    expect(alvos.map((alvo) => resolveLearningTarget(alvo, CATALOGO_FALSO))).toEqual([
      '/lessons/x',
      '/lessons/jornada/j',
      '/aberturas/italiana',
      '/finais/oposicao',
    ])
  })
})
