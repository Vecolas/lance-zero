import styles from './PlaceholderScreen.module.css'

export interface PlaceholderScreenProps {
  title: string
  lead: string
  /** Fase do roadmap que entrega esta tela de verdade. */
  phase: number
  /** O que esta tela vai fazer quando a fase correspondente chegar. */
  planned: string[]
}

/**
 * Estado vazio honesto para as rotas que ainda não têm comportamento.
 * A Fase 0 entrega o shell navegável, não funcionalidades falsas.
 */
export function PlaceholderScreen({ title, lead, phase, planned }: PlaceholderScreenProps) {
  return (
    <>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Fase {phase} do roadmap</span>
        <h1>{title}</h1>
        <p className={styles.lead}>{lead}</p>
      </div>
      <section className={styles.card} aria-labelledby="planejado">
        <h2 id="planejado" className={styles.cardTitle}>
          O que esta tela vai fazer
        </h2>
        <ul className={styles.list}>
          {planned.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <p className={styles.note}>
        Ainda não implementado. A Fase 0 entrega apenas a fundação: tokens, shell, rotas e
        verificações automatizadas.
      </p>
    </>
  )
}
