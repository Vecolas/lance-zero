/**
 * Barril do domínio de aprendizagem.
 *
 * O QUE MORA AQUI: o modelo de como uma habilidade é APRENDIDA — o degrau em
 * que ela está, a evidência que a move, o grafo de pré-requisitos, a unidade de
 * atividade, o plano do dia persistido e a escada de ajuda.
 *
 * O QUE NÃO MORA AQUI, e a fronteira importa:
 *
 * - `@/domain/skills` guarda a MAESTRIA — quanto o aluno acerta. Aqui mora o
 *   ESTÁGIO — se alguém chegou a ensinar. Acertar não prova ensino, e é a
 *   confusão entre os dois que produziu a dívida que este domínio veio pagar.
 * - `@/domain/lessons` guarda a FORMA da lição; `@/content/lessons`, as lições
 *   escritas. Este domínio nunca contém texto de conteúdo.
 * - `@/lib/fsrs` decide QUANDO um item volta. Este domínio não é o modelo de
 *   domínio do FSRS (plano §5) e não reimplementa agendamento.
 */

export * from './estagio'
export * from './skill-state'
export * from './curriculo'
export * from './atividade'
export * from './plano'
export * from './ajuda'
