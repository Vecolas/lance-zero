/**
 * Cards de revisão espaçada para nós de repertório (`ReviewCardKind` `repertorio`).
 *
 * DECISÃO 1 — O CARD PERGUNTA, NÃO CONTA. O `PEDAGOGY` e o `CLAUDE.md` mandam
 * recuperação antes de explicação: o enunciado não diz o nome da abertura, não
 * diz o lance e não diz a ideia. Ele pergunta "qual é o seu lance aqui?" e
 * pronto. A ideia é a resposta, e aparece DEPOIS. Um enunciado que já contém a
 * resposta não treina memória nenhuma — treina leitura.
 *
 * DECISÃO 2 — A IDEIA NÃO É COPIADA PARA DENTRO DO CARD. O texto mora na árvore
 * de repertório, que é conteúdo versionado, e o card guarda o que é dele:
 * posição, solução e agendamento. Copiar a ideia criaria duas fontes para o
 * mesmo texto, e a cópia gravada no IndexedDB seria a desatualizada no dia em
 * que alguém melhorasse a frase. Quem quer a ideia junta as duas metades com
 * `casarCardsComArvore`.
 *
 * DECISÃO 3 — O `id` DO CARD É DERIVADO E ESTÁVEL. `repertorio:{repertório}:
 * {identidade da posição}`. Estável porque é a identidade que faz transposição
 * virar um nó só: duas ordens de lances que chegam à mesma posição produzem O
 * MESMO card, e não dois cards que o aluno responderia duas vezes com o mesmo
 * lance. Derivado porque o par de funções abaixo é a ÚNICA fonte do formato —
 * ninguém monta nem lê esse id à mão.
 *
 * DECISÃO 4 — CARD SEM NÓ NÃO É DESCARTADO EM SILÊNCIO. Editar o conteúdo pode
 * deixar cards órfãos no armazenamento local do aluno. `casarCardsComArvore` os
 * devolve numa lista separada, porque sumir com o histórico de revisão de
 * alguém sem dizer nada é exatamente o tipo de falha muda que este projeto
 * combateu a rodada inteira.
 */

import { createReviewCard } from '@/lib/fsrs/cards'
import type { ReviewCard } from '@/domain/types'
import {
  lanceDoRepertorio,
  nosDeEstudo,
  type ArvoreDeRepertorio,
  type NoDeRepertorio,
  type RamoDeRepertorio,
} from './arvore'

/** Prefixo do id. Fonte única do formato; ninguém escreve esta string de novo. */
const PREFIXO = 'repertorio'

/**
 * Monta o id de um card de repertório.
 *
 * LANÇA quando `repertorioId` contém `:`, porque o separador deixaria de
 * separar e `origemDoCardDeRepertorio` devolveria um id partido no lugar errado
 * — sem erro nenhum, só um card que nunca mais encontra o próprio nó.
 */
export function idDeCardDeRepertorio(repertorioId: string, identidade: string): string {
  if (repertorioId.includes(':')) {
    throw new Error(`Id de repertório não pode conter ":": ${repertorioId}`)
  }
  return `${PREFIXO}:${repertorioId}:${identidade}`
}

/** Quebra o id de volta em repertório e posição, ou `null` se não for um deles. */
export function origemDoCardDeRepertorio(
  id: string,
): { repertorioId: string; identidade: string } | null {
  const primeiro = id.indexOf(':')
  if (primeiro === -1 || id.slice(0, primeiro) !== PREFIXO) {
    return null
  }
  const segundo = id.indexOf(':', primeiro + 1)
  if (segundo === -1) {
    return null
  }
  const repertorioId = id.slice(primeiro + 1, segundo)
  const identidade = id.slice(segundo + 1)
  if (repertorioId.length === 0 || identidade.length === 0) {
    return null
  }
  return { repertorioId, identidade }
}

/**
 * Enunciado do card. Em PT-BR, tom calmo, e sem entregar nada.
 *
 * Não recebe o ramo de propósito: se recebesse, alguém acabaria interpolando o
 * lance aqui um dia. O que a função não tem, ela não vaza.
 */
export function enunciadoDeRepertorio(lado: 'w' | 'b'): string {
  const cor = lado === 'w' ? 'de brancas' : 'de pretas'
  return `Você joga ${cor}. Qual é o lance do seu repertório nesta posição?`
}

/**
 * Um card novo por nó de estudo da árvore.
 *
 * `agora` entra por parâmetro — relógio em lógica de domínio é sempre parâmetro
 * neste projeto. Um card recém-criado já nasce vencido, como manda
 * `createReviewCard`: o primeiro contato é na mesma sessão em que o repertório
 * foi montado.
 */
export function cardsDeRepertorio(arvore: ArvoreDeRepertorio, agora: Date): ReviewCard[] {
  return nosDeEstudo(arvore).map((no) => {
    const ramo = lanceDoRepertorio(arvore, no)
    if (ramo === null) {
      // `nosDeEstudo` já filtrou por isto; a guarda existe só para o tipo.
      throw new Error(`Nó de estudo sem lance prescrito: ${no.identidade}`)
    }
    return createReviewCard(
      {
        id: idDeCardDeRepertorio(arvore.id, no.identidade),
        kind: 'repertorio',
        skillIds: [...arvore.habilidades],
        fen: no.fen,
        solutionUci: [ramo.uci],
        prompt: enunciadoDeRepertorio(arvore.lado),
      },
      agora,
    )
  })
}

/** Card, nó e ramo juntos. É a forma que a tela de revisão consome. */
export interface CardDeRepertorio {
  card: ReviewCard
  no: NoDeRepertorio
  ramo: RamoDeRepertorio
  /** A ideia escrita para este lance. Só aparece DEPOIS da resposta. */
  ideia: string
}

export interface CasamentoDeCards {
  casados: readonly CardDeRepertorio[]
  /** Cards de repertório cujo nó sumiu do conteúdo. Ver DECISÃO 4. */
  orfaos: readonly ReviewCard[]
  /** Cards que não são deste repertório (ou nem são de repertório). */
  deOutroRepertorio: readonly ReviewCard[]
}

/** Junta cards guardados com a árvore atual, sem perder nada pelo caminho. */
export function casarCardsComArvore(
  cards: readonly ReviewCard[],
  arvore: ArvoreDeRepertorio,
): CasamentoDeCards {
  const casados: CardDeRepertorio[] = []
  const orfaos: ReviewCard[] = []
  const deOutroRepertorio: ReviewCard[] = []

  for (const card of cards) {
    const origem = origemDoCardDeRepertorio(card.id)
    if (origem === null || origem.repertorioId !== arvore.id) {
      deOutroRepertorio.push(card)
      continue
    }
    const no = arvore.nos.get(origem.identidade)
    const ramo = no ? lanceDoRepertorio(arvore, no) : null
    if (!no || ramo === null) {
      orfaos.push(card)
      continue
    }
    casados.push({ card, no, ramo, ideia: ramo.ideia })
  }

  return { casados, orfaos, deOutroRepertorio }
}
