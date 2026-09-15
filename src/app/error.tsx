'use client'

import Link from 'next/link'
import styles from './error.module.css'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <section className={styles.container} role="alert" aria-labelledby="erro-titulo">
      <p className={styles.eyebrow}>Algo não saiu como esperado</p>
      <h1 id="erro-titulo">O treino não foi perdido.</h1>
      <p>Seus dados locais continuam no dispositivo. Tente carregar esta tela de novo.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => reset()}>
          Tentar novamente
        </button>
        <Link href="/dashboard" className={styles.secondary}>
          Voltar ao treino de hoje
        </Link>
      </div>
    </section>
  )
}
