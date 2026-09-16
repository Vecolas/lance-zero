/**
 * Quando um card vencido pode, de fato, virar revisão.
 *
 * A REGRA V3 que este módulo organiza: o app não cobra em revisão um conceito
 * que ele nunca ensinou. Um card de tema nunca ensinado é LEGADO — vira lição
 * antes de virar prova. Isso está certo e é a mesma ideia do `precisaDeReensino`.
 *
 * O QUE ESTAVA ERRADO era o ALCANCE dela. Aplicada a todo card, ela silenciava
 * três coisas que não são "conceito cobrado sem aula":
 *
 * 1. CARD SEM HABILIDADE NENHUMA. `card.skillIds.some(...)` sobre lista vazia é
 *    sempre `false`, e `Puzzle.skillIds` é declaradamente opcional — um puzzle
 *    de tema não mapeado gerava um card que nunca mais aparecia.
 * 2. CARD NASCIDO DO ERRO DO ALUNO. Ele não cobra currículo: replica UMA
 *    posição que o aluno errou. Exigir aula prévia quebra a promessa central do
 *    produto — "erro vira treino" —, porque o app anuncia a revisão e ela não
 *    vem.
 * 3. CARD DE REPERTÓRIO. Pergunta o lance que o próprio aluno escolheu. Ninguém
 *    "recebe uma aula" do próprio repertório.
 *
 * Todos os três falhavam EM SILÊNCIO: fila vazia, nenhum erro, nenhuma pista.
 *
 * ONDE A REGRA VALE, então: nos cards que cobram um CONCEITO do currículo. Para
 * os demais, a evidência que os criou já é a justificativa deles.
 *
 * POR QUE UM MÓDULO, e não duas expressões: ela era escrita duas vezes em
 * `ReviewSession` (o filtro da fila e o `reviewEligible` do planner de sessão) e
 * uma terceira em `planning/planner-v2`. Três cópias divergiram — consertar uma
 * deixava as outras descartando o card do mesmo jeito.
 */

import type { ReviewCard, ReviewCardKind, SkillId } from '@/domain/types'

/**
 * Os tipos de card sujeitos ao portão de ensino.
 *
 * Lista EXPLÍCITA, e curta: hoje só `conceito` cobra currículo. Um tipo novo
 * entra aqui por decisão de quem o cria, e não por acidente de um `!==`.
 */
export const KINDS_QUE_EXIGEM_ENSINO: readonly ReviewCardKind[] = ['conceito']

export function exigeEnsinoPrevio(kind: ReviewCardKind): boolean {
  return KINDS_QUE_EXIGEM_ENSINO.includes(kind)
}

/**
 * O card pode entrar na fila de revisão?
 *
 * `habilidadesEnsinadas` é o conjunto das habilidades com evidência de ensino —
 * quem monta decide como (estado persistido, `isSkillStateReviewEligible`), e
 * este módulo não lê repositório.
 *
 * SEM HABILIDADE NENHUMA o card passa: ausência de habilidade é ausência de
 * evidência, e na ausência de evidência a fila não inventa uma.
 */
export function cardPodeSerRevisado(
  card: Pick<ReviewCard, 'kind' | 'skillIds'>,
  habilidadesEnsinadas: ReadonlySet<SkillId>,
): boolean {
  if (!exigeEnsinoPrevio(card.kind)) return true
  if (card.skillIds.length === 0) return true
  return card.skillIds.some((skillId) => habilidadesEnsinadas.has(skillId))
}
