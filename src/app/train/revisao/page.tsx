import type { Metadata } from 'next'
import { ReviewSession } from '@/components/training/ReviewSession'

export const metadata: Metadata = { title: 'Revisar' }

/**
 * A sessão de revisão ganhou rota própria.
 *
 * Ela morava em `/train`, e por isso abrir a aba "Treinar" jogava o aluno numa
 * posição sem escolha nenhuma. Separar as duas é o que permite ao hub existir:
 * quem quer revisar chega aqui por um clique, e quem não quer não é levado.
 *
 * A rota também dá URL própria à sessão — recarregar, voltar e apontar um teste
 * E2E para ela passam a funcionar, o que não era possível quando ela era uma
 * seção sem endereço.
 */
export default function RevisaoPage() {
  return (
    <>
      <h1>Revisar</h1>
      <p>
        A revisão começa pelas vencidas, porque o que você já errou uma vez vale mais que conteúdo
        novo. Aqui você tenta ANTES de ver a resposta — é a tentativa que fixa, não a leitura.
      </p>
      <ReviewSession />
    </>
  )
}
