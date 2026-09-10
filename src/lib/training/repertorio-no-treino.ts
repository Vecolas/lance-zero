/**
 * O repertório do aluno, do jeito que o TREINO precisa dele.
 *
 * Duas coisas moram aqui, e as duas existem para que o repertório deixe de ser
 * conteúdo parado no repositório:
 *
 * 1. `repertoriosDoAluno()` — as árvores construídas, uma vez só;
 * 2. `semearCardsDeRepertorio()` — os cards FSRS dos nós de estudo GRAVADOS no
 *    armazenamento local, para que entrem na fila de revisão como qualquer
 *    outro card.
 *
 * DECISÃO 1 — SEMEAR, E NÃO DERIVAR NA HORA. `cardsDeRepertorio` devolve cards
 * novos, e card novo nasce vencido. Se o "Treino de hoje" só derivasse os cards
 * em memória para montar o plano, a tela de revisão — que lê `getDueCards` do
 * repositório, por conta própria — não acharia nenhum deles: o plano prometeria
 * N revisões e a fila entregaria outra coisa. Duas fontes para a mesma verdade,
 * divergindo sem nada acusar. Gravar resolve pela raiz: a partir daí existe UMA
 * fonte, o repositório, e é dela que as duas telas leem.
 *
 * DECISÃO 2 — SEMEAR É IDEMPOTENTE, E É O ID DERIVADO QUE PERMITE ISSO. O id de
 * um card de repertório é `repertorio:{repertório}:{identidade da posição}`,
 * estável sob transposição e montado por uma função só. Então "já existe" é uma
 * pergunta que se responde por id: só os AUSENTES são gravados, e o
 * agendamento de quem já foi revisado nunca é sobrescrito por um card novo em
 * folha. Abrir a tela dez vezes no mesmo dia não reinicia o FSRS de ninguém.
 *
 * DECISÃO 3 — REPERTÓRIO COM CONFLITO NÃO VIRA CARD. Uma árvore com conflitos
 * tem lance sem ideia, ideia em branco ou duas respostas para a mesma posição.
 * Card tirado dali perguntaria algo que o próprio conteúdo não sabe responder.
 * Ela é RECUSADA e o id dela volta em `comConflito` — a recusa é dado, não
 * silêncio. O portão do conteúdo (`tests/unit/repertoire-arvore.test.ts`) exige
 * lista vazia, então em produção isso é uma rede, não um caminho normal.
 *
 * PONTO CEGO DECLARADO: hoje o repertório do aluno é o repertório INICIAL que
 * acompanha o app (`@/content/openings/repertorio`). Não existe ainda tela para
 * ele montar o próprio — é entrega da tela de aberturas, outra frente da mesma
 * issue #10. Quando existir, é ESTA função que passa a ler de lá, e nada mais
 * precisa mudar: quem consome já pergunta "quais são os repertórios do aluno?"
 * em vez de importar o conteúdo direto.
 */

import { REPERTORIOS_INICIAIS } from '@/content/openings/repertorio'
import {
  cardsDeRepertorio,
  construirRepertorio,
  type ArvoreDeRepertorio,
} from '@/domain/repertoire'
import type { TrainingRepository } from '@/domain/types'

export interface RepertoriosDoAluno {
  /** Árvores utilizáveis: construídas e sem conflito. */
  arvores: readonly ArvoreDeRepertorio[]
  /** Ids das que foram recusadas por conflito. Ver DECISÃO 3. */
  comConflito: readonly string[]
}

/**
 * Memória do módulo: a construção é uma função pura de conteúdo CONSTANTE, sem
 * relógio nem aleatoriedade, então o resultado é o mesmo para sempre. Guardar
 * evita reconstruir as árvores a cada abertura da tela.
 */
let memoria: RepertoriosDoAluno | null = null

export function repertoriosDoAluno(): RepertoriosDoAluno {
  if (memoria !== null) {
    return memoria
  }
  const arvores: ArvoreDeRepertorio[] = []
  const comConflito: string[] = []
  for (const definicao of REPERTORIOS_INICIAIS) {
    const arvore = construirRepertorio(definicao)
    if (arvore.conflitos.length > 0) {
      comConflito.push(arvore.id)
      continue
    }
    arvores.push(arvore)
  }
  memoria = { arvores, comConflito }
  return memoria
}

export interface SemeaduraDeRepertorio {
  /** Cards que não existiam e passaram a existir agora. */
  criados: number
  /** Cards que já estavam gravados e foram deixados como estavam. */
  mantidos: number
  comConflito: readonly string[]
}

/**
 * Garante que existe um card gravado para cada nó de estudo do repertório.
 *
 * `agora` entra por parâmetro — relógio em lógica de treino é sempre parâmetro
 * neste projeto — e só é usado para os cards que NASCEM nesta chamada.
 */
export async function semearCardsDeRepertorio(
  repo: TrainingRepository,
  options: { agora: Date },
): Promise<SemeaduraDeRepertorio> {
  const { arvores, comConflito } = repertoriosDoAluno()
  const existentes = new Set((await repo.listReviewCards()).map((card) => card.id))

  let criados = 0
  let mantidos = 0

  for (const arvore of arvores) {
    for (const card of cardsDeRepertorio(arvore, options.agora)) {
      if (existentes.has(card.id)) {
        mantidos += 1
        continue
      }
      await repo.saveReviewCard(card)
      existentes.add(card.id)
      criados += 1
    }
  }

  return { criados, mantidos, comConflito }
}
