'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { ENDGAME_LESSON_BY_ID, ENDGAME_POSITION_SETS } from '@/content/endgames/biblioteca'
import type { EndgameDefinition } from '@/domain/endgames'
import styles from './EndgameLessonPage.module.css'

const TABS = [
  'Visão geral',
  'Aprender',
  'Praticar',
  'Posições típicas',
  'Erros comuns',
  'Progresso',
] as const
export function EndgameLessonPage({ definition }: { definition: EndgameDefinition }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Visão geral')
  const lesson = ENDGAME_LESSON_BY_ID.get(definition.lessonIds[0])
  const positionSet = ENDGAME_POSITION_SETS.find((set) => set.id === definition.drillIds[0])
  useEffect(() => {
    if (tab !== 'Aprender' && tab !== 'Praticar') return
    try {
      const key = 'lancezero:endgame-statuses'
      const statuses = JSON.parse(window.localStorage.getItem(key) ?? '{}') as Record<
        string,
        string
      >
      statuses[definition.id] = tab === 'Aprender' ? 'learning' : 'practicing'
      window.localStorage.setItem(key, JSON.stringify(statuses))
    } catch {
      /* opcional */
    }
  }, [definition.id, tab])
  return (
    <div className={styles.page}>
      <Link href="/finais" className={styles.back}>
        ← Voltar à biblioteca
      </Link>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{definition.level}</p>
          <h1>{definition.name}</h1>
          <p>{definition.description}</p>
        </div>
        <div className={styles.heroBoard}>
          <ChessBoardView fen={definition.previewFen} orientation="w" interactive={false} />
        </div>
      </div>
      <nav className={styles.tabs} aria-label={`Seções de ${definition.name}`}>
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={tab === name}
            className={tab === name ? styles.tabActive : styles.tab}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      {tab === 'Visão geral' && <Overview definition={definition} />}
      {tab === 'Aprender' && <Learn fen={definition.previewFen} />}
      {tab === 'Praticar' && <Practice definition={definition} />}
      {tab === 'Posições típicas' && <Positions positionSet={positionSet} />}
      {tab === 'Erros comuns' && <Errors definition={definition} />}
      {tab === 'Progresso' && <Progress />}
      {lesson && (
        <p className={styles.version}>
          Lição pedagógica v{lesson.version}: reconhecer → princípio → decisão → demonstração →
          play-out.
        </p>
      )}
    </div>
  )
}
function Overview({ definition }: { definition: EndgameDefinition }) {
  return (
    <section className={styles.panel}>
      <h2>O que importa nesta posição?</h2>
      <p>{definition.description}</p>
      <h3>Sinais para reconhecer</h3>
      <ul>
        <li>Classifique o material e a atividade dos reis.</li>
        <li>Procure o elemento crítico antes de calcular.</li>
        <li>Escolha o plano; só depois procure o lance.</li>
      </ul>
      <h3>Pergunta-chave</h3>
      <p>Que tipo de posição é esta e como você converte ou defende?</p>
    </section>
  )
}
function Learn({ fen }: { fen: string }) {
  const [choice, setChoice] = useState<number | null>(null)
  return (
    <section className={styles.panel}>
      <h2>Aprender pelo raciocínio</h2>
      <p>
        Primeiro reconheça o princípio. A posição abaixo é uma demonstração; o treino usará
        variações.
      </p>
      <div className={styles.lessonBoard}>
        <ChessBoardView fen={fen} orientation="w" interactive={false} />
      </div>
      <h3>Qual é o elemento crítico?</h3>
      <div className={styles.options}>
        {[
          'Atividade e relação dos reis',
          'Desenvolvimento de abertura',
          'Memorizar uma sequência',
        ].map((label, index) => (
          <button
            key={label}
            type="button"
            className={styles.option}
            aria-pressed={choice === index}
            onClick={() => setChoice(index)}
          >
            {label}
          </button>
        ))}
      </div>
      {choice !== null && (
        <p className={choice === 0 ? styles.good : styles.bad} role="status">
          {choice === 0
            ? 'Correto: reconheça o final antes de procurar o melhor lance.'
            : 'Ainda não: finais começam pela classificação da posição, não por variantes.'}
        </p>
      )}
      <h3>Resumo operacional</h3>
      <ol>
        <li>Reconheça o tipo de final.</li>
        <li>Identifique o elemento crítico.</li>
        <li>Aplique o princípio e calcule.</li>
        <li>Execute até converter ou segurar o empate.</li>
      </ol>
    </section>
  )
}
function Practice({ definition }: { definition: EndgameDefinition }) {
  const target = definition.trainingPositionId
    ? `/endgames?position=${encodeURIComponent(definition.trainingPositionId)}`
    : '/endgames'
  return (
    <section className={styles.panel}>
      <h2>Praticar</h2>
      <p>
        Sem dicas ou barra de engine por padrão. Escolha uma posição equivalente e jogue até o
        objetivo.
      </p>
      <Link className={styles.primary} href={target}>
        Abrir treino de play-out
      </Link>
      <p className={styles.note}>
        Uma atividade pode ser concluída mesmo quando a conversão falha; a maestria e a necessidade
        de reforço são medidas separadamente.
      </p>
    </section>
  )
}
function Positions({
  positionSet,
}: {
  positionSet: (typeof ENDGAME_POSITION_SETS)[number] | undefined
}) {
  return (
    <section className={styles.panel}>
      <h2>Variações de posição</h2>
      <p>O método precisa funcionar fora da FEN memorizada.</p>
      <div className={styles.positionGrid}>
        {(positionSet?.positions ?? []).map((position) => (
          <article key={position.id} className={styles.position}>
            <ChessBoardView
              fen={position.fen}
              orientation={position.sideToTrain === 'white' ? 'w' : 'b'}
              interactive={false}
            />
            <h3>{position.objective === 'defend' ? 'Defender' : 'Converter'}</h3>
            <p>Posição curada para transferência</p>
          </article>
        ))}
      </div>
    </section>
  )
}
function Errors({ definition }: { definition: EndgameDefinition }) {
  const errors =
    definition.id === 'opposition'
      ? ['lost_opposition', 'pushed_pawn_too_early', 'missed_zugzwang']
      : definition.category === 'rook'
        ? ['failed_cutoff', 'king_too_passive', 'conversion_technique_error']
        : ['king_too_passive', 'missed_pawn_race', 'allowed_counterplay']
  return (
    <section className={styles.panel}>
      <h2>Erros comuns</h2>
      <ul>
        {errors.map((error) => (
          <li key={error}>
            <strong>{error}</strong> — o feedback explica o princípio perdido e oferece posição
            semelhante.
          </li>
        ))}
      </ul>
    </section>
  )
}
function Progress() {
  return (
    <section className={styles.panel}>
      <h2>Progresso</h2>
      <div className={styles.progress}>
        <span>Reconhecimento</span>
        <span>Aprendendo</span>
      </div>
      <div className={styles.progress}>
        <span>Seleção de princípio</span>
        <span>Aprendendo</span>
      </div>
      <div className={styles.progress}>
        <span>Conversão / defesa</span>
        <span>Revisar</span>
      </div>
      <p className={styles.note}>
        Conclusão da atividade não é domínio: tentativas e dependência de dicas orientam o próximo
        treino.
      </p>
    </section>
  )
}
