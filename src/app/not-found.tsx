import Link from 'next/link'
import styles from './error.module.css'

export default function NotFound() {
  return (
    <section className={styles.container} aria-labelledby="nao-encontrado">
      <p className={styles.eyebrow}>Página não encontrada</p>
      <h1 id="nao-encontrado">Vamos voltar para uma posição conhecida.</h1>
      <p>Esse endereço não existe ou o conteúdo local ainda não foi visitado neste dispositivo.</p>
      <div className={styles.actions}>
        <Link href="/dashboard" className={styles.primary}>
          Ir para o treino de hoje
        </Link>
        <Link href="/" className={styles.secondary}>
          Página inicial
        </Link>
      </div>
    </section>
  )
}
