import styles from './loading.module.css'

export default function Loading() {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>Carregando o treino…</span>
    </div>
  )
}
