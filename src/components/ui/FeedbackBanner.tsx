/**
 * Faixa de feedback de acerto e erro — seções 30 e 31 do guia.
 *
 * DECISÃO QUE ESTE COMPONENTE CARREGA: a palavra do estado é renderizada pelo
 * componente, não pelo chamador. `mensagem` explica o que aconteceu na
 * posição; o estado em si ("Correto" / "Achamos algo para treinar") vem do
 * catálogo. Assim não existe chamada capaz de pintar a faixa de vermelho sem
 * dizer, em texto, o que o vermelho significa.
 *
 * O anúncio é `role="status"` (educado) nos dois estados, inclusive no erro:
 * o erro aqui é informação, e interromper o leitor de tela com `alert` diria o
 * contrário do que o produto quer dizer.
 *
 * MOVIMENTO: o guia pede animação curta. Ela existe em CSS e é desligada em
 * `prefers-reduced-motion`.
 */

import type { ReactNode } from 'react'
import { feedbackToneCatalog, type FeedbackTone } from '@/lib/design/feedback'
import styles from './FeedbackBanner.module.css'

export interface FeedbackBannerProps {
  tone: FeedbackTone
  /** O que aconteceu na posição, em uma frase. */
  mensagem: string
  /** Explicação, variação ou ações. Fica abaixo da mensagem. */
  children?: ReactNode
}

export function FeedbackBanner({ tone, mensagem, children }: FeedbackBannerProps) {
  const desc = feedbackToneCatalog[tone]

  return (
    <div className={styles.faixa} style={{ color: desc.colorVar }} role="status">
      <p className={styles.cabecalho}>
        <svg
          className={styles.icone}
          viewBox={desc.icon.viewBox}
          width="18"
          height="18"
          aria-hidden="true"
          focusable="false"
        >
          <path d={desc.icon.path} fill="currentColor" fillRule="evenodd" />
        </svg>
        <span className={styles.estado}>{desc.label}</span>
      </p>
      <p className={styles.mensagem}>{mensagem}</p>
      {children ? <div className={styles.extra}>{children}</div> : null}
    </div>
  )
}
