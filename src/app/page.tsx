import Link from 'next/link'
import styles from './page.module.css'

const loop = [
  {
    step: 'Etapa 1',
    title: 'Você joga',
    text: 'Importe suas partidas do Lichess, do Chess.com ou por PGN. Nada disso precisa de conta aqui.',
  },
  {
    step: 'Etapa 2',
    title: 'O erro ganha nome',
    text: 'Antes da engine falar, você marca onde acha que a partida virou. Depois a análise confirma ou corrige.',
  },
  {
    step: 'Etapa 3',
    title: 'Vira treino',
    text: 'A posição vira exercício, o tema entra no seu perfil de habilidades e sobe de prioridade.',
  },
  {
    step: 'Etapa 4',
    title: 'Volta na hora certa',
    text: 'Revisão espaçada traz o erro de novo — e o app verifica se ele parou de aparecer nas suas partidas.',
  },
]

function BoardPreview() {
  const squares = Array.from({ length: 64 }, (_, i) => {
    const row = Math.floor(i / 8)
    const col = i % 8
    return (row + col) % 2 === 0
  })

  return (
    <div className={styles.boardPreview} role="img" aria-label="Tabuleiro no tema LanceZero Paper">
      {squares.map((isLight, i) => (
        <div key={i} className={isLight ? styles.light : styles.dark} />
      ))}
    </div>
  )
}

export default function LandingPage() {
  return (
    <>
      <section className={styles.hero}>
        <h1 className={styles.tagline}>Treine o que perde suas partidas.</h1>
        <p className={styles.subtitle}>
          LanceZero não é mais uma caixa de ferramentas de xadrez. Ele lê as suas derrotas, descobre
          o padrão que se repete e monta o treino de amanhã em cima disso.
        </p>
        <div className={styles.actions}>
          <Link href="/onboarding" className={styles.cta}>
            Montar meu primeiro treino
          </Link>
          <Link href="/dashboard" className={styles.ctaGhost}>
            Ver o treino de hoje
          </Link>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ciclo">
        <h2 id="ciclo">O ciclo fechado</h2>
        <ol className={styles.loop}>
          {loop.map((item) => (
            <li key={item.title} className={styles.loopItem}>
              <span className={styles.loopStep}>{item.step}</span>
              <h3 className={styles.loopTitle}>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="principios">
        <h2 id="principios">Como isso funciona sem assinatura</h2>
        <ul className={styles.principles}>
          <li>A análise roda no seu computador, com Stockfish compilado para o navegador.</li>
          <li>Puzzles, nomes de abertura e tablebases vêm de dados abertos do Lichess.</li>
          <li>Suas partidas e seu progresso ficam no seu navegador. Conta é opcional, e depois.</li>
          <li>Nenhuma parte do núcleo depende de API paga de IA.</li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="tabuleiro">
        <h2 id="tabuleiro">Identidade própria</h2>
        <p>
          Nada de verde Lichess nem marrom Chess.com. O tema padrão é o{' '}
          <strong>LanceZero Paper</strong>, pensado para leitura longa e contraste confortável.
        </p>
        <BoardPreview />
      </section>
    </>
  )
}
