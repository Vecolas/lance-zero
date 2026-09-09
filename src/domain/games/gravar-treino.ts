import type { CriticalMoment, ReviewCard } from '@/domain/types'
import {
  momentoParaReviewCard,
  preservarProgresso,
  selecionarParaTreino,
  type ParaTreinoConfig,
} from './para-treino'

/**
 * Grava os erros de partida escolhidos como cards de revisão.
 *
 * A DECISÃO QUE ESTE ARQUIVO CARREGA é a leitura antes da escrita.
 *
 * O id do card é determinístico, para reanalisar a mesma partida ATUALIZAR o
 * card em vez de encher a fila com o mesmo erro. Só que `saveReviewCard` é um
 * upsert cego: salvar o card recém-criado direto zeraria o agendamento do FSRS
 * daquele erro em silêncio. Quem já revisou o padrão três vezes recomeçaria do
 * zero, e nenhuma tela, log ou teste acusaria.
 *
 * Por isso a gravação não é `saveReviewCard(novo)`, e sim
 * `saveReviewCard(preservarProgresso(novo, existente))`.
 */

/** O mínimo do repositório que esta operação precisa. */
export interface RepositorioDeCards {
  listReviewCards(): Promise<ReviewCard[]>
  saveReviewCard(card: ReviewCard): Promise<void>
}

export interface GravarTreinoOptions {
  /** Relógio injetado. */
  agora: Date
  config?: ParaTreinoConfig
}

export interface GravarTreinoResultado {
  /** Cards que passaram a existir agora. */
  criados: number
  /** Cards que já existiam e tiveram o agendamento PRESERVADO. */
  atualizados: number
}

export async function gravarErrosComoTreino(
  repo: RepositorioDeCards,
  momentos: readonly CriticalMoment[],
  { agora, config }: GravarTreinoOptions,
): Promise<GravarTreinoResultado> {
  const escolhidos = selecionarParaTreino(momentos, config)
  if (escolhidos.length === 0) return { criados: 0, atualizados: 0 }

  // Uma leitura só para o lote: ler por card seria N idas ao banco para uma
  // informação que não muda no meio da operação.
  const existentes = new Map((await repo.listReviewCards()).map((card) => [card.id, card]))

  let criados = 0
  let atualizados = 0

  for (const momento of escolhidos) {
    const novo = momentoParaReviewCard(momento, { agora })
    const anterior = existentes.get(novo.id)
    await repo.saveReviewCard(preservarProgresso(novo, anterior))
    if (anterior) atualizados += 1
    else criados += 1
  }

  return { criados, atualizados }
}
