/**
 * Card de habilidade — seção 33 do guia.
 *
 * A barra é simples, como o guia pede, e o preenchimento usa o azul da marca
 * para dizer domínio. Sem gradiente: o gradiente é de logo e hero.
 *
 * DECISÃO QUE ESTE COMPONENTE CARREGA: quando a amostra é pequena, o card não
 * inventa um número. A barra vira indeterminada (`aria-valuenow` ausente, com
 * `aria-valuetext` dizendo por quê) e no lugar do percentual aparece um traço
 * mais a frase que explica o que falta. Ver `src/lib/design/skill-card.ts`.
 *
 * O estado sai sempre como cor + ícone + palavra. Não há prop para reduzir
 * esse trio.
 */

import { readSkill, skillStatusCatalog, type SkillReadingInput } from '@/lib/design/skill-card'
import styles from './SkillCard.module.css'

export interface SkillCardProps extends SkillReadingInput {
  /** Nome legível da habilidade, como no catálogo de skills. */
  nome: string
  /** Id usado para ligar título e card por `aria-labelledby`. */
  id: string
}

export function SkillCard({ nome, id, ...entrada }: SkillCardProps) {
  const leitura = readSkill(entrada)
  const estado = skillStatusCatalog[leitura.status]
  const tituloId = `habilidade-${id}`

  return (
    <article className={styles.card} aria-labelledby={tituloId}>
      <div className={styles.topo}>
        <h3 id={tituloId} className={styles.nome}>
          {nome}
        </h3>
        <span className={styles.estado} style={{ color: estado.colorVar }}>
          <svg
            className={styles.icone}
            viewBox={estado.icon.viewBox}
            width="13"
            height="13"
            aria-hidden="true"
            focusable="false"
          >
            <path d={estado.icon.path} fill="currentColor" fillRule="evenodd" />
          </svg>
          {estado.label}
        </span>
      </div>

      <div className={styles.medida}>
        <div
          className={styles.trilho}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={leitura.percentual ?? undefined}
          aria-valuetext={
            leitura.percentual === null
              ? 'ainda não medido'
              : `${leitura.percentual}% de domínio em ${nome}`
          }
          aria-label={`Domínio em ${nome}`}
        >
          {leitura.fracao === null ? (
            <div className={styles.indeterminada} />
          ) : (
            <div
              className={styles.preenchida}
              style={{ width: `${Math.max(2, Math.round(leitura.fracao * 100))}%` }}
            />
          )}
        </div>
        <span className={styles.numero}>
          {leitura.percentual === null ? '—' : `${leitura.percentual}%`}
        </span>
      </div>

      <p className={styles.nota}>{leitura.nota}</p>
    </article>
  )
}
