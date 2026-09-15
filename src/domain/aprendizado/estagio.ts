/**
 * Estágio de aprendizagem de uma habilidade.
 *
 * ESTE ARQUIVO EXISTE PARA IMPEDIR UM DEFEITO ESPECÍFICO, e vale dizer qual:
 * o app mostrava uma posição e perguntava "qual é o melhor lance?" a quem nunca
 * tinha recebido o conceito. O aluno só podia responder por tentativa e erro, e
 * o produto chamava isso de treino. O estágio é o que torna esse defeito
 * IMPOSSÍVEL DE EXPRIMIR: quem seleciona atividade é obrigado a perguntar em
 * que estágio a habilidade está, e `unseen` não tem resposta que cobre.
 *
 * A ORDEM É O CONTEÚDO. Os estágios não são rótulos soltos: eles são uma
 * escada, e `ordemDoEstagio` é a única fonte dessa ordem. Comparar estágio por
 * `===` espalhado pelo código seria reescrever a escada em cada chamador, e
 * cada cópia envelheceria sozinha no dia em que um degrau novo entrasse no
 * meio.
 *
 * O QUE ESTE MÓDULO NÃO DECIDE: quando o aluno sobe de degrau. Isso é
 * `./skill-state`, que tem a evidência. Aqui mora só a escada.
 */

/**
 * Os degraus, do menos ensinado ao mais transferido. A ORDEM DA LISTA É A
 * ORDEM DA ESCADA — não existe segunda tabela dizendo quem vem antes de quem.
 */
export const ESTAGIOS_DE_APRENDIZADO = [
  /** Nunca ensinado. Só lição, exemplo resolvido ou diagnóstico rotulado. */
  'unseen',
  /** Conceito apresentado. Ainda sem autonomia: prática COM apoio. */
  'introduced',
  /** Já praticou com assistência e acertou com ela. */
  'guided',
  /** Já resolveu sem assistência relevante. Recuperação independente liberada. */
  'independent',
  /** Entrou no ciclo de revisão espaçada. */
  'review',
  /** O sistema procura evidência em partida real de que o conhecimento é usado. */
  'transfer',
] as const

export type LearningStage = (typeof ESTAGIOS_DE_APRENDIZADO)[number]

/** Índice do degrau na escada. Único lugar que sabe a ordem. */
export function ordemDoEstagio(estagio: LearningStage): number {
  return ESTAGIOS_DE_APRENDIZADO.indexOf(estagio)
}

/** `a` está no mesmo degrau ou acima de `b`. */
export function estagioAlcanca(a: LearningStage, b: LearningStage): boolean {
  return ordemDoEstagio(a) >= ordemDoEstagio(b)
}

/** O mais avançado dos dois. Usado na fusão de sync, que nunca regride. */
export function estagioMaisAvancado(a: LearningStage, b: LearningStage): LearningStage {
  return ordemDoEstagio(a) >= ordemDoEstagio(b) ? a : b
}

/**
 * Rótulo em PT-BR para o aluno.
 *
 * NÃO é o nome interno traduzido: o aluno não precisa saber que existe um
 * estado chamado `transfer`. Ele precisa saber em que pé está.
 *
 * `unseen` diz "ainda não vimos" e não "você não sabe": o app não mediu nada,
 * e afirmar ignorância a partir de ausência de medida é exatamente a falsa
 * precisão que o produto recusa em toda parte.
 */
export const ROTULO_DO_ESTAGIO: Record<LearningStage, string> = {
  unseen: 'Ainda não vimos',
  introduced: 'Aprendendo',
  guided: 'Praticando com apoio',
  independent: 'Praticando sozinho',
  review: 'Consolidando',
  transfer: 'Forte',
}

/**
 * O estágio MÍNIMO em que uma recuperação independente pode ser COBRADA.
 *
 * Mora aqui, e não no planner, porque é a regra pedagógica e não a política de
 * um chamador. O planner pergunta; ele não decide.
 */
export const ESTAGIO_MINIMO_PARA_COBRAR: LearningStage = 'guided'

/**
 * A habilidade já pode ser cobrada sem apoio?
 *
 * É a pergunta que o planner, o gerador de card e a tela de prática fazem — e
 * todas fazem a MESMA pergunta, neste lugar, em vez de cada uma comparar
 * estágios por conta própria.
 */
export function podeCobrarSemApoio(estagio: LearningStage): boolean {
  return estagioAlcanca(estagio, ESTAGIO_MINIMO_PARA_COBRAR)
}
