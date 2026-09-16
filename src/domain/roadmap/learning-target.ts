/**
 * O DESTINO PEDAGÓGICO de um nó do Roadmap.
 *
 * A DÍVIDA QUE ESTE MÓDULO PAGA: clicar em "Aprender" num nó do Roadmap levava
 * para `/lessons` — a biblioteca inteira. O Roadmap SABE o que o aluno quer
 * aprender; responder com a biblioteca é dizer "procure você mesmo". Pior, é um
 * caminho que parece funcionar: ninguém reclama de um link que abre uma página
 * de verdade, e o aluno só descobre que se perdeu quando já está rolando uma
 * lista atrás do assunto que ele acabou de pedir.
 *
 * A REGRA, agora: toda ação de aprender nascida de um nó tem destino EXPLÍCITO.
 * Não existe destino genérico, e a ausência de destino não vira redirecionamento
 * — vira erro de configuração (ver `MissingLearningTargetError`).
 *
 * POR QUE UMA UNIÃO DISCRIMINADA, e não uma string de rota guardada no nó: a
 * rota é uma CONSEQUÊNCIA do tipo de conteúdo, e guardá-la no currículo faria o
 * currículo saber de URLs. Com a união, mudar o endereço das jornadas de final é
 * uma linha aqui, e não uma varredura em cinquenta nós.
 *
 * O QUE NÃO ENTROU NA UNIÃO, e é decisão consciente: `calculation-journey` e
 * `game-review-lesson`. Os dois teriam hoje a mesma resolução de
 * `lesson`/`lesson-journey` — o projeto não tem uma `CalculationStudyJourney`, e
 * uma lição de análise de partida é uma lição como outra qualquer. Variante que
 * resolve igual a outra é um segundo nome para a mesma coisa: ela não impede
 * nenhum erro e cria a pergunta "qual das duas eu uso?" em cada nó novo. No dia
 * em que existir uma jornada de cálculo de verdade, ela entra aqui com resolução
 * própria — e aí a variante estará pagando o seu preço.
 */

/** Uma única lição do catálogo ensina este conteúdo. */
export interface LessonTarget {
  type: 'lesson'
  lessonId: string
}

/**
 * O conteúdo exige mais de uma lição, NA ORDEM.
 *
 * `entryLessonId` existe separado de `lessonIds[0]` de propósito: quem retoma
 * não entra pela primeira, e o campo deixa explícito qual é a porta. Um portão
 * confere que ele está dentro da lista — sem isso, um id errado abriria a
 * jornada numa lição que não faz parte dela.
 */
export interface LessonJourneyTarget {
  type: 'lesson-journey'
  journeyId: string
  lessonIds: readonly string[]
  entryLessonId: string
}

/** Uma abertura do catálogo, com a jornada de estudo dela. */
export interface OpeningJourneyTarget {
  type: 'opening-journey'
  openingId: string
}

/** Um final do catálogo, com a jornada de estudo dele. */
export interface EndgameJourneyTarget {
  type: 'endgame-journey'
  endgameId: string
}

export type LearningTarget =
  LessonTarget | LessonJourneyTarget | OpeningJourneyTarget | EndgameJourneyTarget

export type LearningTargetType = LearningTarget['type']

/**
 * Em que MODO o conteúdo abre.
 *
 * O modo não muda o destino — muda o que a tela diz ao chegar. "Reaprender" que
 * abrisse igual a "Aprender" seria uma promessa quebrada em silêncio: o aluno
 * pediu para rever o que esqueceu e recebeu a aula de estreia, sem nada
 * indicando que o app entendeu o pedido.
 */
export type ModoDeAprendizado = 'aprender' | 'continuar' | 'revisar' | 'reaprender'

/** O parâmetro de URL que carrega o modo. Um só, e é este. */
export const PARAM_DO_MODO = 'modo'

/**
 * O parâmetro que carrega a ETAPA/LIÇÃO exata em que retomar.
 *
 * As jornadas de abertura e final já usavam `etapa` (ver `rotaDaEtapa`); a
 * jornada de lições usa o MESMO nome, porque é a mesma pergunta — "onde eu
 * estava?" — e dois nomes para ela seria a próxima divergência.
 */
export const PARAM_DA_ETAPA = 'etapa'

/**
 * Como transformar o id de um conteúdo no pedaço que entra na URL.
 *
 * ENTRA POR PARÂMETRO porque o domínio não lê catálogo de conteúdo: `opposition`
 * vira `oposicao` no endereço, e quem sabe disso é o catálogo de finais, que
 * vive em `@/content`. Injetar a tradução mantém esta função pura e testável com
 * uma tabela de mentira, e deixa UM lugar no app onde ela é ligada de verdade
 * (`@/lib/training/rota-de-aprendizado`).
 */
export interface ResolucaoDeConteudo {
  /** Slug da abertura, ou `null` se o id não existe no catálogo. */
  slugDaAbertura: (openingId: string) => string | null
  /** Slug do final, ou `null` se o id não existe no catálogo. */
  slugDoFinal: (endgameId: string) => string | null
}

/**
 * O nó não tem destino pedagógico.
 *
 * É ERRO DE CONFIGURAÇÃO, e o tipo existe para que ele não possa ser confundido
 * com uma falha de rede ou de leitura. Quem chama decide o que fazer com ele —
 * em desenvolvimento, estourar; em produção, desabilitar o botão e dizer a
 * verdade ao aluno. O que NÃO é opção é mandá-lo para a biblioteca: isso
 * esconderia a falta de conteúdo atrás de uma tela que abre.
 */
export class MissingLearningTargetError extends Error {
  constructor(readonly nodeId: string) {
    super(
      `RoadmapNode "${nodeId}" não declara um LearningTarget. ` +
        'Todo nó aprendível precisa de um destino explícito em LEARNING_OBJECTS. ' +
        'Redirecionar para a biblioteca esconderia a falta de conteúdo.',
    )
    this.name = 'MissingLearningTargetError'
  }
}

/** O conteúdo apontado pelo alvo não existe no catálogo. */
export class UnknownLearningContentError extends Error {
  constructor(
    readonly target: LearningTarget,
    detalhe: string,
  ) {
    super(`LearningTarget inválido (${target.type}): ${detalhe}`)
    this.name = 'UnknownLearningContentError'
  }
}

function comParametros(base: string, parametros: Record<string, string | undefined>): string {
  const busca = new URLSearchParams()
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined) busca.set(chave, valor)
  }
  const query = busca.toString()
  return query ? `${base}?${query}` : base
}

export interface OpcoesDeRota {
  /** O modo em que o conteúdo abre. `aprender` não aparece na URL. */
  modo?: ModoDeAprendizado
  /**
   * A etapa/lição exata em que retomar.
   *
   * É o que faz "Continuar" continuar. Sem ela, retomar abriria a porta de
   * entrada — e o aluno que parou na lição 2 recomeçaria da 1, perdendo
   * exatamente o que já tinha feito.
   */
  etapa?: string
}

/**
 * A ROTA de um destino pedagógico. Uma função, um lugar.
 *
 * Toda tela que ofereça "Aprender", "Continuar", "Revisar" ou "Reaprender" a
 * partir do Roadmap passa por aqui. Montar a URL na tela é o que produziu o
 * `/lessons` genérico em primeiro lugar: cada tela resolvia por conta própria, e
 * a que resolvia mal não tinha como ser encontrada.
 */
export function resolveLearningTarget(
  target: LearningTarget,
  conteudo: ResolucaoDeConteudo,
  opcoes: OpcoesDeRota = {},
): string {
  const modo = opcoes.modo && opcoes.modo !== 'aprender' ? opcoes.modo : undefined
  const parametros = { [PARAM_DO_MODO]: modo, [PARAM_DA_ETAPA]: opcoes.etapa }

  switch (target.type) {
    case 'lesson':
      return comParametros(`/lessons/${target.lessonId}`, parametros)

    case 'lesson-journey':
      return comParametros(`/lessons/jornada/${target.journeyId}`, parametros)

    case 'opening-journey': {
      const slug = conteudo.slugDaAbertura(target.openingId)
      if (slug === null)
        throw new UnknownLearningContentError(target, `abertura "${target.openingId}" não existe`)
      return comParametros(`/aberturas/${slug}`, parametros)
    }

    case 'endgame-journey': {
      const slug = conteudo.slugDoFinal(target.endgameId)
      if (slug === null)
        throw new UnknownLearningContentError(target, `final "${target.endgameId}" não existe`)
      return comParametros(`/finais/${slug}`, parametros)
    }
  }
}

/**
 * A regra que decide quando o nó vira ✓.
 *
 * Ela NASCE DO ALVO, e é por isso que mora ao lado dele. A alternativa — um
 * campo de conclusão escrito à mão em cada nó — seria a segunda fonte da mesma
 * verdade: um nó de jornada de abertura cuja regra dissesse "uma lição" ficaria
 * concluído sem o aluno ter passado pela jornada, e nada acusaria.
 */
export type RoadmapCompletionRule =
  | { type: 'single-lesson'; lessonId: string }
  | { type: 'all-lessons'; lessonIds: readonly string[] }
  | { type: 'journey'; journeyId: string }

export function completionRuleFor(target: LearningTarget): RoadmapCompletionRule {
  switch (target.type) {
    case 'lesson':
      return { type: 'single-lesson', lessonId: target.lessonId }
    case 'lesson-journey':
      return { type: 'all-lessons', lessonIds: target.lessonIds }
    case 'opening-journey':
      return { type: 'journey', journeyId: `abertura:${target.openingId}` }
    case 'endgame-journey':
      return { type: 'journey', journeyId: `final:${target.endgameId}` }
  }
}
