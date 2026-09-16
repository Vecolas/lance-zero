import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Sessão de revisão' }

/**
 * O endereço antigo da fila. A sessão mudou para `/revisao/sessao` quando a aba
 * inteira virou Revisar.
 *
 * Ele é o mais importante de manter dos três: é o destino que o PLANO DO DIA
 * emite (`src/domain/planning/planner-v2.ts`), e planos gravados em dias
 * anteriores continuam guardando este href no IndexedDB do aluno. Sem o desvio,
 * o card "Revisões vencidas" de ontem abriria um 404 hoje.
 */
export default function RevisaoAntigaPage() {
  redirect('/revisao/sessao')
}
