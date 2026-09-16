import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Revisar' }

/**
 * `/train` VIROU REDIRECIONAMENTO.
 *
 * A aba "Treinar" era um roteador: seis blocos, cinco só apontando para lugares
 * que já existiam. No lugar dela entrou `/revisao`, que é a casa da revisão
 * espaçada — ver `src/components/review/PainelDeRevisao.tsx`.
 *
 * O ENDEREÇO NÃO SOME, e isso não é zelo excessivo: `/train` esteve na barra de
 * navegação desde a fase 5, está no `SHELL` pré-cacheado pelo service worker, e
 * é o link que a documentação e qualquer marcador de quem usa o app apontam.
 * Um 404 aqui transformaria a renomeação de uma aba em perda de acesso.
 *
 * Mesmo padrão de `src/app/[lang]/progress/page.tsx`, que desviou para o Roadmap
 * quando o progresso mudou de casa.
 */
export default function TrainPage() {
  redirect('/revisao')
}
