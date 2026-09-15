import type { ReactNode } from 'react'
import styles from './primitives.module.css'

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className={styles.pageContainer}>{children}</div>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </header>
  )
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className={styles.sectionHeader}>
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </header>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <article className={`${styles.card} ${className}`.trim()}>{children}</article>
}

export type StatusKind = 'pending' | 'in-progress' | 'completed' | 'error'

const STATUS_LABEL: Record<StatusKind, string> = {
  pending: 'Pendente',
  'in-progress': 'Em andamento',
  completed: 'Concluída',
  error: 'Não foi possível carregar',
}

const STATUS_SYMBOL: Record<StatusKind, string> = {
  pending: '○',
  'in-progress': '◔',
  completed: '✓',
  error: '!',
}

export function StatusBadge({ status, label }: { status: StatusKind; label?: string }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status-${status}`]}`}>
      <span aria-hidden="true">{STATUS_SYMBOL[status]}</span>
      <span>{label ?? STATUS_LABEL[status]}</span>
    </span>
  )
}

export type Mode = 'learn' | 'practice' | 'review' | 'diagnostic'

const MODE_LABEL: Record<Mode, string> = {
  learn: 'Aprender',
  practice: 'Praticar',
  review: 'Revisar',
  diagnostic: 'Diagnóstico',
}

export function ModeLabel({ mode }: { mode: Mode }) {
  return <span className={`${styles.modeLabel} ${styles[`mode-${mode}`]}`}>{MODE_LABEL[mode]}</span>
}

export function ProgressIndicator({ value, label }: { value: number; label?: string }) {
  const safeValue = Math.max(0, Math.min(100, value))
  return (
    <div className={styles.progress}>
      {label ? <span>{label}</span> : null}
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        aria-valuetext={label ? `${label}: ${safeValue}%` : `${safeValue}%`}
      >
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  )
}

export function StatePanel({
  kind,
  title,
  description,
  action,
}: {
  kind: 'loading' | 'empty' | 'error' | 'completed'
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <section
      className={`${styles.statePanel} ${styles[`state-${kind}`]}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className={styles.stateAction}>{action}</div> : null}
    </section>
  )
}

export function Tabs({
  tabs,
  selected,
  onSelect,
  label = 'Seções',
}: {
  tabs: readonly { id: string; label: string }[]
  selected: string
  onSelect: (id: string) => void
  label?: string
}) {
  return (
    <nav className={styles.tabs} aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === selected ? styles.tabActive : styles.tab}
          aria-current={tab.id === selected ? 'page' : undefined}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export function FilterBar({
  children,
  label = 'Filtros',
}: {
  children: ReactNode
  label?: string
}) {
  return (
    <div className={styles.filterBar} aria-label={label}>
      {children}
    </div>
  )
}
