/**
 * Barra de avaliação da engine — seção 27 do guia.
 *
 * O guia manda que a engine não domine a tela: a barra é fina, o número é
 * discreto e nada aqui usa o gradiente da marca.
 *
 * DECISÃO DE PRODUTO: o nome acessível da barra vem de `readEvaluation` e diz
 * o que ela mede — avaliação da posição. Nunca "chance de vitória". Ver o
 * cabeçalho de `src/lib/design/evaluation-bar.ts` e o CLAUDE.md.
 *
 * ACESSIBILIDADE: o lado da vantagem não é comunicado só pelo preenchimento.
 * A mesma informação aparece como ícone direcional, como número e como frase
 * no `aria-label` — o trio exigido pela casa.
 */

import { readEvaluation, type EvaluationInput } from '@/lib/design/evaluation-bar'
import styles from './EvaluationBar.module.css'

/** Setas próprias, sem glifo de fonte, para não depender de emoji do sistema. */
const ICONES = {
  brancas: 'M8 2.5 14 11H2Z',
  pretas: 'M8 13.5 2 5h12Z',
  equilibrio: 'M2 6h12v2H2Zm0 4h12v2H2Z',
} as const

export interface EvaluationBarProps extends EvaluationInput {
  /** Linha curta acima da barra, tipo "Antes do seu lance". */
  titulo?: string
}

export function EvaluationBar({ titulo, ...input }: EvaluationBarProps) {
  const leitura = readEvaluation(input)
  const pctBrancas = `${(leitura.fracaoBrancas * 100).toFixed(1)}%`

  return (
    <div className={styles.bloco}>
      {titulo ? <p className={styles.titulo}>{titulo}</p> : null}
      <div className={styles.linha}>
        <div
          className={leitura.avaliado ? styles.trilho : `${styles.trilho} ${styles.semDado}`}
          role="img"
          aria-label={leitura.rotulo}
        >
          <div className={styles.brancas} style={{ width: pctBrancas }} />
          <div className={styles.divisor} style={{ left: pctBrancas }} />
        </div>
        <span className={styles.numero} aria-hidden="true">
          <svg viewBox="0 0 16 16" width="12" height="12" focusable="false" aria-hidden="true">
            <path d={ICONES[leitura.icone]} fill="currentColor" />
          </svg>
          {leitura.numero}
        </span>
      </div>
    </div>
  )
}
