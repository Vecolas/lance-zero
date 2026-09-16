/**
 * A sequência de uma jornada de LIÇÕES.
 *
 * O QUE ELA RESOLVE: um nó como "Geração de candidatos" não se ensina numa lição
 * só. Sem sequência, a única saída era mandar o aluno para a biblioteca e
 * esperar que ele escolhesse as três certas, na ordem certa — o que é pedir a
 * ele exatamente o que o currículo existe para responder.
 *
 * O PROGRESSO NÃO É GUARDADO AQUI, E ISSO É A DECISÃO. Ele é DERIVADO das lições
 * já ensinadas, que já são estado do produto (`SkillState.exposureCount`, escrito
 * por `registrarEnsino`). Guardar um "passo atual" próprio criaria uma segunda
 * verdade sobre a mesma pergunta — e no dia em que as duas discordassem, o aluno
 * veria a jornada mandando repetir uma lição que o resto do app já dá por
 * ensinada.
 *
 * O EFEITO COLATERAL É CORRETO, e vale dizer em voz alta: quem já aprendeu a
 * varredura por outro caminho entra na jornada de candidatos já na segunda
 * lição. Não é um atalho indevido — é o app não reensinar o que já ensinou.
 */

import type { LessonJourneyTarget } from './learning-target'

export interface ProgressoDaJornadaDeLicoes {
  /** A lição a abrir agora, ou `null` quando a jornada acabou. */
  licaoAtual: string | null
  concluidas: number
  total: number
  concluida: boolean
}

/**
 * Onde o aluno está na jornada.
 *
 * A LIÇÃO ATUAL É A PRIMEIRA NÃO CONCLUÍDA, e não "a seguinte à última
 * concluída". A diferença aparece quando alguém conclui a terceira antes da
 * segunda: pela primeira regra a jornada volta e cobra a segunda, que é a que
 * falta; pela segunda regra ela daria a jornada por encerrada com um buraco no
 * meio.
 */
export function progressoDaJornadaDeLicoes(
  target: LessonJourneyTarget,
  licoesConcluidas: ReadonlySet<string>,
): ProgressoDaJornadaDeLicoes {
  const pendentes = target.lessonIds.filter((lessonId) => !licoesConcluidas.has(lessonId))
  const concluidas = target.lessonIds.length - pendentes.length
  return {
    licaoAtual: pendentes[0] ?? null,
    concluidas,
    total: target.lessonIds.length,
    concluida: pendentes.length === 0,
  }
}

/**
 * A lição a abrir quando o aluno chega à jornada.
 *
 * `etapaPedida` vem da URL (o deep link de "Continuar"). Ela só é respeitada se
 * pertencer à jornada — um id de fora abriria uma lição que o nó não promete, e
 * um id inventado abriria coisa nenhuma. Fora isso, vale o progresso; e com a
 * jornada concluída, vale a porta de entrada, porque aí o pedido é rever.
 */
export function licaoDeEntrada(
  target: LessonJourneyTarget,
  licoesConcluidas: ReadonlySet<string>,
  etapaPedida?: string,
): string {
  if (etapaPedida && target.lessonIds.includes(etapaPedida)) return etapaPedida
  const progresso = progressoDaJornadaDeLicoes(target, licoesConcluidas)
  return progresso.licaoAtual ?? target.entryLessonId
}
