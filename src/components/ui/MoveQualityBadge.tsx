/**
 * Selo de classificação de lance — seção 28 do guia.
 *
 * DECISÃO QUE ESTE COMPONENTE CARREGA: não há prop para esconder o ícone nem
 * para esconder o texto. Cor, símbolo e palavra saem sempre juntos, porque a
 * regra "status nunca só por cor" só se sustenta se o caminho errado não
 * existir no código.
 *
 * `label` existe para o chamador que já tem o nome do estado no vocabulário
 * dele — a revisão de partida diz "Erro grave" a partir de `SEVERITY_LABEL`,
 * do domínio. Sobrescrever o texto é permitido; suprimi-lo não é.
 */

import { describeMoveQuality } from '@/lib/design/move-quality'
import type { MoveQuality } from '@/lib/design/tokens'
import styles from './MoveQualityBadge.module.css'

export interface MoveQualityBadgeProps {
  quality: MoveQuality
  /** Sobrescreve só o texto visível. Continua sendo o nome acessível. */
  label?: string
}

export function MoveQualityBadge({ quality, label }: MoveQualityBadgeProps) {
  const desc = describeMoveQuality(quality)
  const texto = label ?? desc.label

  return (
    <span
      className={styles.badge}
      style={{ color: desc.colorVar }}
      role="img"
      aria-label={`${texto}. ${desc.resumo}`}
    >
      <svg
        className={styles.icone}
        viewBox={desc.icon.viewBox}
        width="14"
        height="14"
        aria-hidden="true"
        focusable="false"
      >
        <path d={desc.icon.path} fill="currentColor" fillRule="evenodd" />
      </svg>
      <span className={styles.texto}>{texto}</span>
    </span>
  )
}
